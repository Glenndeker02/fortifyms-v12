import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
} from '@/lib/api-helpers';
import { requirePermissions } from '@/lib/permissions-middleware';
import { Permission, isMillStaff } from '@/lib/rbac';

/**
 * GET /api/analytics/mill-operator
 * Analytics data for mill operator/technician dashboard
 *
 * Requires: Permission.ANALYTICS_MILL
 * Roles: MILL_OPERATOR, MILL_TECHNICIAN, MILL_MANAGER, SYSTEM_ADMIN
 */
export async function GET(request: NextRequest) {
  try {
    // Check permission and get session
    const session = await requirePermissions(Permission.ANALYTICS_MILL, 'mill analytics');

    // Only mill staff can access this
    if (!isMillStaff(session.user.role)) {
      return errorResponse('Only mill staff can access mill analytics', 403);
    }

    if (!session.user.millId) {
      return errorResponse('User is not assigned to a mill', 403);
    }

    const userId = session.user.id;
    const millId = session.user.millId;

    // Get date ranges
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    // Today's Focus
    const [
      todayBatches,
      scheduledBatches,
      dueMaintenance,
      pendingDiagnostics,
      myTrainingProgress,
    ] = await Promise.all([
      // Batches created today
      db.batch.count({
        where: {
          millId,
          createdAt: { gte: todayStart },
        },
      }),

      // Batches scheduled for today (from production line schedules)
      db.batch.count({
        where: {
          millId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          createdAt: { gte: todayStart },
        },
      }),

      // Maintenance due this week
      db.maintenanceTask.count({
        where: {
          millId,
          status: { in: ['SCHEDULED', 'OVERDUE'] },
          scheduledDate: { lte: weekStart },
        },
      }),

      // Pending diagnostics
      db.diagnosticResult.count({
        where: {
          millId,
          userId,
          status: 'PENDING',
        },
      }),

      // My training progress
      db.trainingProgress.findMany({
        where: { userId },
        select: {
          status: true,
          progress: true,
          course: {
            select: {
              title: true,
              difficulty: true,
            },
          },
        },
      }),
    ]);

    // My Performance (this month)
    const [myBatches, myBatchesWithQC, myTrainingCompleted, safetyIncidents] =
      await Promise.all([
        // Batches I created this month
        db.batch.count({
          where: {
            millId,
            createdBy: userId,
            createdAt: { gte: monthStart },
          },
        }),

        // My batches with QC results
        db.batch.findMany({
          where: {
            millId,
            createdBy: userId,
            createdAt: { gte: monthStart },
            status: 'QC_APPROVED',
          },
          select: { id: true },
        }),

        // Training completed
        db.trainingProgress.count({
          where: {
            userId,
            status: 'COMPLETED',
          },
        }),

        // Safety incidents (should be zero)
        db.auditLog.count({
          where: {
            userId,
            action: { contains: 'SAFETY' },
            timestamp: { gte: monthStart },
          },
        }),
      ]);

    const qcPassRate =
      myBatches > 0 ? (myBatchesWithQC.length / myBatches) * 100 : 0;

    // Recent batches
    const recentBatches = await db.batch.findMany({
      where: {
        millId,
        createdBy: userId,
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        batchNumber: true,
        productionLine: true,
        quantityProduced: true,
        status: true,
        createdAt: true,
      },
    });

    // Upcoming maintenance assigned to me
    const upcomingMaintenance = await db.maintenanceTask.findMany({
      where: {
        millId,
        assignedTo: userId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      },
      take: 5,
      orderBy: { scheduledDate: 'asc' },
      include: {
        equipment: {
          select: {
            name: true,
            type: true,
          },
        },
      },
    });

    const analytics = {
      todayFocus: {
        batchesToday: todayBatches,
        scheduledBatches,
        maintenanceDue: dueMaintenance,
        pendingDiagnostics,
        pendingTraining: myTrainingProgress.filter((p) => p.status === 'IN_PROGRESS')
          .length,
      },
      myPerformance: {
        batchesThisMonth: myBatches,
        qcPassRate: Math.round(qcPassRate),
        trainingCompleted: myTrainingCompleted,
        safetyIncidents,
      },
      recentActivity: {
        batches: recentBatches,
        maintenance: upcomingMaintenance,
        training: myTrainingProgress
          .filter((p) => p.status === 'IN_PROGRESS')
          .slice(0, 3),
      },
    };

    return successResponse(analytics);
  } catch (error) {
    return handleApiError(error);
  }
}
