import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  handleApiError,
  requireAuth,
} from '@/lib/api-helpers';
import { isMillStaff } from '@/lib/auth';

/**
 * GET /api/batches/stats
 * Get batch statistics for dashboard
 *
 * Query parameters:
 * - millId: Filter by mill ID (optional for FWGA staff)
 * - period: Time period (today|week|month|year, default: today)
 *
 * Returns:
 * - total: Total batches
 * - pending: Batches pending QC
 * - approved: Approved batches
 * - failed: Failed batches
 * - avgVariance: Average premix variance
 * - qcPassRate: QC pass rate percentage
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    // Get query params
    const { searchParams } = new URL(request.url);
    const millId = searchParams.get('millId');
    const period = searchParams.get('period') || 'today';

    // Build where clause
    const where: any = {};

    // Role-based filtering
    if (isMillStaff(session.user.role)) {
      if (!session.user.millId) {
        return successResponse({
          total: 0,
          pending: 0,
          approved: 0,
          failed: 0,
          avgVariance: 0,
          qcPassRate: 0,
        });
      }
      where.millId = session.user.millId;
    } else if (millId) {
      where.millId = millId;
    }

    // Date filtering
    const now = new Date();
    switch (period) {
      case 'today':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        where.createdAt = { gte: today };
        break;
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        where.createdAt = { gte: weekAgo };
        break;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        where.createdAt = { gte: monthAgo };
        break;
      case 'year':
        const yearAgo = new Date(now);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        where.createdAt = { gte: yearAgo };
        break;
    }

    // Get batch counts by status
    const [total, pending, approved, failed, batches] = await Promise.all([
      db.batchLog.count({ where }),
      db.batchLog.count({ where: { ...where, status: 'QC_PENDING' } }),
      db.batchLog.count({ where: { ...where, status: 'APPROVED' } }),
      db.batchLog.count({
        where: {
          ...where,
          status: { in: ['FAILED', 'REJECTED'] },
        },
      }),
      db.batchLog.findMany({
        where,
        select: {
          variance: true,
          status: true,
        },
      }),
    ]);

    // Calculate average variance
    const avgVariance =
      batches.length > 0
        ? batches.reduce((sum, b) => sum + (b.variance || 0), 0) / batches.length
        : 0;

    // Calculate QC pass rate
    const totalQCTested = approved + failed;
    const qcPassRate = totalQCTested > 0 ? (approved / totalQCTested) * 100 : 0;

    return successResponse({
      total,
      pending,
      approved,
      failed,
      avgVariance: Math.round(avgVariance * 100) / 100,
      qcPassRate: Math.round(qcPassRate * 10) / 10,
      period,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
