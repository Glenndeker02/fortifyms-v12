import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
  requireAuth,
} from '@/lib/api-helpers';

/**
 * GET /api/analytics/fwga-program-manager
 * Analytics data for FWGA program manager dashboard
 *
 * Comprehensive program-wide analytics including:
 * - Hero metrics (total output, certified mills, compliance, deliveries)
 * - Geographic analysis
 * - Performance trends
 * - Mill benchmarking
 * - Institutional supply metrics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    // Only FWGA program managers and admins
    if (
      session.user.role !== 'FWGA_PROGRAM_MANAGER' &&
      session.user.role !== 'SYSTEM_ADMIN'
    ) {
      return errorResponse('Access denied', 403);
    }

    // Get date ranges
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const last12Months = new Date(now);
    last12Months.setMonth(last12Months.getMonth() - 12);

    // HERO METRICS
    const [
      totalOutput,
      lastMonthOutput,
      activeMills,
      newCertifiedMills,
      avgComplianceScore,
      completedDeliveries,
      peopleReached,
    ] = await Promise.all([
      // Total fortified output (all time)
      db.batch.aggregate({
        _sum: { quantityProduced: true },
      }),

      // Last month output for trend
      db.batch.aggregate({
        where: {
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { quantityProduced: true },
      }),

      // Active certified mills
      db.mill.count({
        where: {
          isActive: true,
          certificationStatus: 'CERTIFIED',
        },
      }),

      // New certifications this month
      db.mill.count({
        where: {
          certificationStatus: 'CERTIFIED',
          certificationDate: { gte: thisMonthStart },
        },
      }),

      // Average compliance score
      db.complianceAudit.aggregate({
        where: {
          status: 'APPROVED',
          auditDate: { gte: last12Months },
        },
        _avg: { score: true },
      }),

      // Institutional deliveries completed
      db.institutionalOrder.count({
        where: {
          status: 'DELIVERED',
        },
      }),

      // Estimate people reached (using 0.5 kg per person per month average)
      db.batch.aggregate({
        _sum: { quantityProduced: true },
      }),
    ]);

    const totalKg = totalOutput._sum.quantityProduced || 0;
    const lastMonthKg = lastMonthOutput._sum.quantityProduced || 0;
    const productionTrend = lastMonthKg > 0 ? ((totalKg - lastMonthKg) / lastMonthKg) * 100 : 0;
    const estimatedPeopleReached = Math.round(totalKg / 6); // 6kg per person per year

    // GEOGRAPHIC VIEW
    const millsByLocation = await db.mill.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        region: true,
        country: true,
        latitude: true,
        longitude: true,
        certificationStatus: true,
      },
    });

    // Get latest compliance score for each mill
    const millComplianceScores = await db.$queryRaw<
      Array<{ millId: string; score: number }>
    >`
      SELECT DISTINCT ON (mill_id)
        mill_id as millId,
        score
      FROM compliance_audits
      WHERE status = 'APPROVED'
      ORDER BY mill_id, audit_date DESC
    `;

    const millsWithScores = millsByLocation.map((mill) => {
      const scoreData = millComplianceScores.find((s) => s.millId === mill.id);
      return {
        ...mill,
        complianceScore: scoreData?.score || null,
      };
    });

    // Production by region
    const productionByRegion = await db.$queryRaw<
      Array<{ region: string; totalProduction: number }>
    >`
      SELECT
        m.region,
        SUM(b.quantity_produced) as totalProduction
      FROM batches b
      JOIN mills m ON b.mill_id = m.id
      WHERE b.created_at >= ${last12Months}
      GROUP BY m.region
      ORDER BY totalProduction DESC
    `;

    // PERFORMANCE TRENDS
    // Compliance trend over time
    const complianceTrend = await db.$queryRaw<
      Array<{ month: string; avgScore: number }>
    >`
      SELECT
        DATE_TRUNC('month', audit_date) as month,
        AVG(score) as avgScore
      FROM compliance_audits
      WHERE status = 'APPROVED'
        AND audit_date >= ${last12Months}
      GROUP BY DATE_TRUNC('month', audit_date)
      ORDER BY month ASC
    `;

    // Production volume trend (by commodity)
    const productionTrend = await db.$queryRaw<
      Array<{ month: string; commodity: string; volume: number }>
    >`
      SELECT
        DATE_TRUNC('month', b.created_at) as month,
        b.commodity,
        SUM(b.quantity_produced) as volume
      FROM batches b
      WHERE b.created_at >= ${last12Months}
      GROUP BY DATE_TRUNC('month', b.created_at), b.commodity
      ORDER BY month ASC
    `;

    // QC pass rate trend
    const qcTrend = await db.$queryRaw<
      Array<{ month: string; totalBatches: number; passedBatches: number }>
    >`
      SELECT
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as totalBatches,
        SUM(CASE WHEN status = 'QC_APPROVED' THEN 1 ELSE 0 END) as passedBatches
      FROM batches
      WHERE created_at >= ${last12Months}
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    `;

    // Training completion rate
    const trainingStats = await db.trainingProgress.aggregate({
      where: {
        updatedAt: { gte: last12Months },
      },
      _count: {
        id: true,
      },
    });

    const completedTraining = await db.trainingProgress.count({
      where: {
        status: 'COMPLETED',
        updatedAt: { gte: last12Months },
      },
    });

    const trainingCompletionRate =
      trainingStats._count.id > 0
        ? (completedTraining / trainingStats._count.id) * 100
        : 0;

    // MILL PERFORMANCE ANALYSIS
    // Top performers (by compliance and production)
    const topPerformers = await db.$queryRaw<
      Array<{
        millId: string;
        millName: string;
        avgCompliance: number;
        totalProduction: number;
      }>
    >`
      SELECT
        m.id as millId,
        m.name as millName,
        AVG(ca.score) as avgCompliance,
        SUM(b.quantity_produced) as totalProduction
      FROM mills m
      LEFT JOIN compliance_audits ca ON m.id = ca.mill_id AND ca.status = 'APPROVED'
      LEFT JOIN batches b ON m.id = b.mill_id
      WHERE b.created_at >= ${last12Months}
      GROUP BY m.id, m.name
      ORDER BY avgCompliance DESC, totalProduction DESC
      LIMIT 10
    `;

    // At-risk mills (declining compliance or low production)
    const atRiskMills = await db.$queryRaw<
      Array<{
        millId: string;
        millName: string;
        latestScore: number;
        previousScore: number;
      }>
    >`
      WITH ranked_audits AS (
        SELECT
          mill_id,
          score,
          ROW_NUMBER() OVER (PARTITION BY mill_id ORDER BY audit_date DESC) as rn
        FROM compliance_audits
        WHERE status = 'APPROVED'
      )
      SELECT
        m.id as millId,
        m.name as millName,
        a1.score as latestScore,
        a2.score as previousScore
      FROM mills m
      JOIN ranked_audits a1 ON m.id = a1.mill_id AND a1.rn = 1
      LEFT JOIN ranked_audits a2 ON m.id = a2.mill_id AND a2.rn = 2
      WHERE a1.score < 70 OR (a2.score IS NOT NULL AND a1.score < a2.score)
      ORDER BY a1.score ASC
      LIMIT 10
    `;

    // INSTITUTIONAL SUPPLY
    const [rfpStats, deliveryPerformance, buyerLocations] = await Promise.all([
      // RFP activity
      db.rfp.groupBy({
        by: ['status'],
        _count: true,
        where: {
          createdAt: { gte: last12Months },
        },
      }),

      // Delivery performance
      db.institutionalOrder.aggregate({
        where: {
          status: 'DELIVERED',
          deliveryDate: { gte: last12Months },
        },
        _count: true,
      }),

      // Buyer locations
      db.institutionalBuyer.findMany({
        where: { isActive: true },
        select: {
          id: true,
          organizationName: true,
          country: true,
          region: true,
          latitude: true,
          longitude: true,
        },
      }),
    ]);

    const analytics = {
      heroMetrics: {
        totalOutput: {
          value: Math.round(totalKg),
          trend: Math.round(productionTrend),
          unit: 'kg',
        },
        activeMills: {
          value: activeMills,
          newThisMonth: newCertifiedMills,
        },
        avgCompliance: {
          value: Math.round(avgComplianceScore._avg.score || 0),
          unit: '%',
        },
        deliveries: {
          value: completedDeliveries,
        },
        peopleReached: {
          value: estimatedPeopleReached,
          description: 'Estimated beneficiaries',
        },
      },
      geographic: {
        mills: millsWithScores,
        productionByRegion,
        buyers: buyerLocations,
      },
      trends: {
        compliance: complianceTrend,
        production: productionTrend,
        qcPassRate: qcTrend.map((m) => ({
          month: m.month,
          passRate:
            m.totalBatches > 0 ? (m.passedBatches / m.totalBatches) * 100 : 0,
        })),
        trainingCompletion: trainingCompletionRate,
      },
      millAnalysis: {
        topPerformers,
        atRisk: atRiskMills,
      },
      institutionalSupply: {
        rfpActivity: rfpStats,
        deliveryPerformance: {
          totalDeliveries: deliveryPerformance._count,
        },
      },
    };

    return successResponse(analytics);
  } catch (error) {
    return handleApiError(error);
  }
}
