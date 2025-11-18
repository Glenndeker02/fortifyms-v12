import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
  requireAuth,
} from '@/lib/api-helpers';

/**
 * GET /api/analytics/institutional-buyer
 * Analytics data for institutional buyer dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    // Only institutional buyers can access this
    if (session.user.role !== 'INSTITUTIONAL_BUYER') {
      return errorResponse('Access denied', 403);
    }

    const buyerId = session.user.buyerId; // Assuming user has buyerId field
    if (!buyerId) {
      return errorResponse('User is not associated with a buyer organization', 403);
    }

    // Get date ranges
    const now = new Date();
    const last90Days = new Date(now);
    last90Days.setDate(last90Days.getDate() - 90);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisYearStart = new Date(now.getFullYear(), 0, 1);
    const last12Months = new Date(now);
    last12Months.setMonth(last12Months.getMonth() - 12);

    // MY PROCUREMENTS
    const [
      activeOrders,
      activeRfps,
      pendingBids,
      completedOrders,
    ] = await Promise.all([
      // Active orders
      db.institutionalOrder.findMany({
        where: {
          buyerId,
          status: { in: ['PENDING', 'IN_PRODUCTION', 'READY', 'IN_TRANSIT'] },
        },
        include: {
          mill: {
            select: {
              name: true,
              code: true,
            },
          },
          batch: {
            select: {
              batchNumber: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // RFPs requiring action
      db.rfp.findMany({
        where: {
          buyerId,
          status: { in: ['OPEN', 'UNDER_REVIEW'] },
        },
        include: {
          _count: {
            select: {
              bids: true,
            },
          },
        },
        orderBy: { closingDate: 'asc' },
      }),

      // Pending bids awaiting evaluation
      db.bid.count({
        where: {
          rfp: {
            buyerId,
          },
          status: 'PENDING',
        },
      }),

      // Completed orders (last 90 days)
      db.institutionalOrder.findMany({
        where: {
          buyerId,
          status: 'DELIVERED',
          deliveryDate: { gte: last90Days },
        },
        include: {
          mill: {
            select: {
              name: true,
              code: true,
            },
          },
        },
        orderBy: { deliveryDate: 'desc' },
      }),
    ]);

    // SUPPLIER PERFORMANCE
    // Get mills we've worked with
    const supplierPerformance = await db.$queryRaw<
      Array<{
        millId: string;
        millName: string;
        totalOrders: number;
        onTimeDeliveries: number;
        avgQuality: number;
      }>
    >`
      SELECT
        m.id as millId,
        m.name as millName,
        COUNT(io.id) as totalOrders,
        SUM(CASE WHEN io.delivery_date <= io.expected_delivery_date THEN 1 ELSE 0 END) as onTimeDeliveries,
        AVG(io.quality_rating) as avgQuality
      FROM institutional_orders io
      JOIN mills m ON io.mill_id = m.id
      WHERE io.buyer_id = ${buyerId}
        AND io.status = 'DELIVERED'
        AND io.delivery_date >= ${last12Months}
      GROUP BY m.id, m.name
      ORDER BY totalOrders DESC
    `;

    // Preferred suppliers (high rating and on-time delivery)
    const preferredSuppliers = supplierPerformance
      .filter(
        (s) =>
          s.avgQuality >= 4.0 &&
          s.totalOrders > 0 &&
          s.onTimeDeliveries / s.totalOrders >= 0.9
      )
      .map((s) => ({
        millId: s.millId,
        millName: s.millName,
        rating: s.avgQuality,
        onTimeRate: (s.onTimeDeliveries / s.totalOrders) * 100,
      }));

    // SPENDING ANALYTICS
    const [monthlySpend, yearlySpend, budgetData] = await Promise.all([
      // This month spending
      db.institutionalOrder.aggregate({
        where: {
          buyerId,
          status: 'DELIVERED',
          deliveryDate: { gte: thisMonthStart },
        },
        _sum: { totalPrice: true },
      }),

      // Year to date spending
      db.institutionalOrder.aggregate({
        where: {
          buyerId,
          status: 'DELIVERED',
          deliveryDate: { gte: thisYearStart },
        },
        _sum: { totalPrice: true },
      }),

      // Budget utilization (if we have budget tracking)
      db.institutionalBuyer.findUnique({
        where: { id: buyerId },
        select: {
          annualBudget: true,
        },
      }),
    ]);

    // Cost per kg trend (last 12 months)
    const costTrend = await db.$queryRaw<
      Array<{ month: string; avgCostPerKg: number; totalQuantity: number }>
    >`
      SELECT
        DATE_TRUNC('month', delivery_date) as month,
        AVG(total_price / quantity) as avgCostPerKg,
        SUM(quantity) as totalQuantity
      FROM institutional_orders
      WHERE buyer_id = ${buyerId}
        AND status = 'DELIVERED'
        AND delivery_date >= ${last12Months}
      GROUP BY DATE_TRUNC('month', delivery_date)
      ORDER BY month ASC
    `;

    // QUALITY ASSURANCE
    const [qcIssues, issueResolution, batchTraceability] = await Promise.all([
      // QC issues from received deliveries
      db.institutionalOrder.count({
        where: {
          buyerId,
          status: 'DELIVERED',
          qualityRating: { lt: 3 },
          deliveryDate: { gte: last90Days },
        },
      }),

      // Issue resolution status
      db.auditLog.findMany({
        where: {
          resourceType: 'INSTITUTIONAL_ORDER',
          action: { contains: 'ISSUE' },
          timestamp: { gte: last90Days },
        },
        take: 20,
        orderBy: { timestamp: 'desc' },
      }),

      // Recent batch traceability
      db.institutionalOrder.findMany({
        where: {
          buyerId,
          status: 'DELIVERED',
        },
        take: 10,
        orderBy: { deliveryDate: 'desc' },
        include: {
          batch: {
            select: {
              batchNumber: true,
              commodity: true,
              quantityProduced: true,
              qcTests: {
                select: {
                  testType: true,
                  result: true,
                  createdAt: true,
                },
                take: 1,
                orderBy: { createdAt: 'desc' },
              },
            },
          },
        },
      }),
    ]);

    const analytics = {
      procurements: {
        active: {
          orders: activeOrders.map((o) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            mill: o.mill.name,
            quantity: o.quantity,
            status: o.status,
            expectedDelivery: o.expectedDeliveryDate,
          })),
          rfps: activeRfps.map((r) => ({
            id: r.id,
            title: r.title,
            closingDate: r.closingDate,
            bidsReceived: r._count.bids,
            status: r.status,
          })),
          pendingBids,
        },
        completed: completedOrders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          mill: o.mill.name,
          deliveryDate: o.deliveryDate,
          quantity: o.quantity,
          totalPrice: o.totalPrice,
        })),
      },
      suppliers: {
        performance: supplierPerformance.map((s) => ({
          millId: s.millId,
          millName: s.millName,
          totalOrders: s.totalOrders,
          onTimeRate:
            s.totalOrders > 0
              ? Math.round((s.onTimeDeliveries / s.totalOrders) * 100)
              : 0,
          avgRating: s.avgQuality ? Math.round(s.avgQuality * 10) / 10 : 0,
        })),
        preferred: preferredSuppliers,
      },
      spending: {
        monthToDate: monthlySpend._sum.totalPrice || 0,
        yearToDate: yearlySpend._sum.totalPrice || 0,
        budget: budgetData?.annualBudget || null,
        budgetUtilization: budgetData?.annualBudget
          ? ((yearlySpend._sum.totalPrice || 0) / budgetData.annualBudget) * 100
          : null,
        costTrend: costTrend.map((t) => ({
          month: t.month,
          avgCostPerKg: Math.round(t.avgCostPerKg * 100) / 100,
          volume: t.totalQuantity,
        })),
      },
      quality: {
        issuesCount: qcIssues,
        recentIssues: issueResolution.slice(0, 5),
        traceability: batchTraceability.map((o) => ({
          orderNumber: o.orderNumber,
          batchNumber: o.batch?.batchNumber,
          commodity: o.batch?.commodity,
          qcResult: o.batch?.qcTests[0]?.result || 'N/A',
        })),
      },
    };

    return successResponse(analytics);
  } catch (error) {
    return handleApiError(error);
  }
}
