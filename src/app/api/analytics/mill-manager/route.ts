import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
} from '@/lib/api-helpers';
import { requirePermissions } from '@/lib/permissions-middleware';
import { Permission, Role } from '@/lib/rbac';

/**
 * GET /api/analytics/mill-manager
 * Analytics data for mill manager dashboard
 *
 * Requires: Permission.ANALYTICS_MILL
 * Roles: MILL_MANAGER, SYSTEM_ADMIN
 */
export async function GET(request: NextRequest) {
  try {
    // Check permission and get session
    const session = await requirePermissions(Permission.ANALYTICS_MILL, 'mill analytics');

    // Only mill managers and admins can access this endpoint
    if (
      session.user.role !== Role.MILL_MANAGER &&
      session.user.role !== Role.SYSTEM_ADMIN
    ) {
      return errorResponse('Only mill managers can access mill analytics', 403);
    }

    const millId = session.user.millId;
    if (!millId && session.user.role !== Role.SYSTEM_ADMIN) {
      return errorResponse('User is not assigned to a mill', 403);
    }

    // Get date ranges
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const last30Days = new Date(now);
    last30Days.setDate(last30Days.getDate() - 30);
    const last12Months = new Date(now);
    last12Months.setMonth(last12Months.getMonth() - 12);

    // Build where clause for mill filtering
    const millWhere = millId ? { millId } : {};

    // KPI Cards
    const [
      thisMonthProduction,
      lastMonthProduction,
      thisMonthBatches,
      lastMonthBatches,
      thisMonthQcApproved,
      latestAudit,
      activeOrders,
      thisMonthRevenue,
    ] = await Promise.all([
      // This month production
      db.batch.aggregate({
        where: {
          ...millWhere,
          createdAt: { gte: thisMonthStart },
        },
        _sum: { quantityProduced: true },
      }),

      // Last month production
      db.batch.aggregate({
        where: {
          ...millWhere,
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { quantityProduced: true },
      }),

      // This month batches for QC rate
      db.batch.count({
        where: {
          ...millWhere,
          createdAt: { gte: thisMonthStart },
        },
      }),

      // Last month batches
      db.batch.count({
        where: {
          ...millWhere,
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
      }),

      // QC approved this month
      db.batch.count({
        where: {
          ...millWhere,
          createdAt: { gte: thisMonthStart },
          status: 'QC_APPROVED',
        },
      }),

      // Latest audit
      db.complianceAudit.findFirst({
        where: millWhere,
        orderBy: { auditDate: 'desc' },
        select: {
          id: true,
          status: true,
          score: true,
          auditDate: true,
        },
      }),

      // Active institutional orders
      db.institutionalOrder.count({
        where: {
          ...millWhere,
          status: { in: ['PENDING', 'IN_PRODUCTION', 'READY'] },
        },
      }),

      // Revenue this month (from institutional orders)
      db.institutionalOrder.aggregate({
        where: {
          ...millWhere,
          status: 'DELIVERED',
          deliveryDate: { gte: thisMonthStart },
        },
        _sum: { totalPrice: true },
      }),
    ]);

    const productionVolume = thisMonthProduction._sum.quantityProduced || 0;
    const lastMonthProductionVol = lastMonthProduction._sum.quantityProduced || 0;
    const productionChange =
      lastMonthProductionVol > 0
        ? ((productionVolume - lastMonthProductionVol) / lastMonthProductionVol) * 100
        : 0;

    const qcPassRate =
      thisMonthBatches > 0 ? (thisMonthQcApproved / thisMonthBatches) * 100 : 0;

    // Alerts & Actions
    const [qcFailures, overdueMaintenance, lowInventoryAlerts, pendingApprovals] =
      await Promise.all([
        // QC failures (last 7 days)
        db.batch.count({
          where: {
            ...millWhere,
            status: 'QC_FAILED',
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),

        // Overdue maintenance
        db.maintenanceTask.count({
          where: {
            ...millWhere,
            status: 'OVERDUE',
          },
        }),

        // Low inventory (assuming we have inventory tracking)
        db.premix.count({
          where: {
            ...millWhere,
            currentStock: { lt: db.raw('reorderLevel') },
          },
        }),

        // Items requiring manager approval (audits pending review)
        db.complianceAudit.count({
          where: {
            ...millWhere,
            status: 'PENDING_REVIEW',
          },
        }),
      ]);

    // Daily production chart (last 30 days)
    const dailyProduction = await db.$queryRaw<
      Array<{ date: Date; quantity: number }>
    >`
      SELECT
        DATE(created_at) as date,
        SUM(quantity_produced) as quantity
      FROM batches
      WHERE ${millId ? db.raw(`mill_id = '${millId}'`) : db.raw('1=1')}
        AND created_at >= ${last30Days}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    // Recent batch QC results
    const recentBatches = await db.batch.findMany({
      where: millWhere,
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        batchNumber: true,
        quantityProduced: true,
        status: true,
        createdAt: true,
        qcTests: {
          select: {
            id: true,
            testType: true,
            result: true,
            createdAt: true,
          },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Equipment uptime/downtime
    const equipmentStats = await db.equipment.findMany({
      where: millWhere,
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        lastMaintenanceDate: true,
      },
    });

    // Compliance trend (last 12 months)
    const complianceTrend = await db.complianceAudit.findMany({
      where: {
        ...millWhere,
        auditDate: { gte: last12Months },
      },
      select: {
        auditDate: true,
        score: true,
        status: true,
      },
      orderBy: { auditDate: 'asc' },
    });

    // Team performance
    const teamStats = await db.user.findMany({
      where: {
        ...millWhere,
        role: { in: ['MILL_OPERATOR', 'MILL_TECHNICIAN'] },
      },
      select: {
        id: true,
        name: true,
        role: true,
        _count: {
          select: {
            batchesCreated: true,
          },
        },
      },
    });

    const analytics = {
      kpiCards: {
        productionVolume: {
          value: Math.round(productionVolume),
          change: Math.round(productionChange),
          unit: 'kg',
        },
        qcPassRate: {
          value: Math.round(qcPassRate),
          unit: '%',
        },
        complianceScore: {
          value: latestAudit?.score || 0,
          status: latestAudit?.status || 'N/A',
        },
        activeOrders: {
          value: activeOrders,
        },
        revenue: {
          value: thisMonthRevenue._sum.totalPrice || 0,
          unit: 'USD',
        },
      },
      alerts: {
        high: [
          ...(qcFailures > 0
            ? [{ type: 'QC_FAILURE', count: qcFailures, message: 'QC failures detected' }]
            : []),
          ...(overdueMaintenance > 0
            ? [
                {
                  type: 'OVERDUE_MAINTENANCE',
                  count: overdueMaintenance,
                  message: 'Overdue maintenance tasks',
                },
              ]
            : []),
        ],
        medium: [
          ...(lowInventoryAlerts > 0
            ? [
                {
                  type: 'LOW_INVENTORY',
                  count: lowInventoryAlerts,
                  message: 'Low premix inventory',
                },
              ]
            : []),
        ],
        actions: [
          ...(pendingApprovals > 0
            ? [
                {
                  type: 'PENDING_APPROVAL',
                  count: pendingApprovals,
                  message: 'Audits pending review',
                },
              ]
            : []),
        ],
      },
      production: {
        dailyChart: dailyProduction,
        recentBatches,
        equipmentStatus: equipmentStats,
      },
      compliance: {
        trend: complianceTrend,
        latestAudit: latestAudit,
      },
      team: {
        operators: teamStats,
      },
    };

    return successResponse(analytics);
  } catch (error) {
    return handleApiError(error);
  }
}
