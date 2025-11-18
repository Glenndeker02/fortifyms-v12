import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  handleApiError,
} from '@/lib/api-helpers';
import { requirePermissions, buildPermissionWhere } from '@/lib/permissions-middleware';
import { Permission } from '@/lib/rbac';

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
    // Check permission and get session
    const session = await requirePermissions(Permission.BATCH_VIEW, 'batch statistics');

    // Get query params
    const { searchParams } = new URL(request.url);
    const millId = searchParams.get('millId');
    const period = searchParams.get('period') || 'today';

    // Build base where clause
    const baseWhere: any = {};

    // Optional mill filter (for FWGA staff viewing specific mills)
    if (millId) {
      baseWhere.millId = millId;
    }

    // Date filtering
    const now = new Date();
    switch (period) {
      case 'today':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        baseWhere.createdAt = { gte: today };
        break;
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        baseWhere.createdAt = { gte: weekAgo };
        break;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        baseWhere.createdAt = { gte: monthAgo };
        break;
      case 'year':
        const yearAgo = new Date(now);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        baseWhere.createdAt = { gte: yearAgo };
        break;
    }

    // Apply permission-based filtering (tenant/mill isolation)
    const where = buildPermissionWhere(session, baseWhere);

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
