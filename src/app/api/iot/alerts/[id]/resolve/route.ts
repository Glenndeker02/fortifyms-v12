import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import {
  successResponse,
  errorResponse,
  handleApiError,
} from '@/lib/api-helpers';
import { requirePermissions } from '@/lib/permissions-middleware';
import { Permission, Role } from '@/lib/rbac';

const resolveSchema = z.object({
  resolution: z.string().min(10, 'Resolution notes must be at least 10 characters'),
  rootCause: z.string().optional(),
  preventiveMeasures: z.string().optional(),
});

/**
 * POST /api/iot/alerts/[id]/resolve
 * Resolve a sensor alert
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermissions(
      Permission.SENSOR_ALERT_VIEW,
      'alert resolution'
    );

    const alertId = params.id;
    const body = await request.json();
    const validatedData = resolveSchema.parse(body);

    const alert = await db.sensorAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      return errorResponse('Alert not found', 404);
    }

    // Check mill access
    if (
      session.user.role !== Role.SYSTEM_ADMIN &&
      alert.millId !== session.user.millId
    ) {
      return errorResponse('You do not have access to this alert', 403);
    }

    if (alert.status === 'RESOLVED') {
      return errorResponse('Alert is already resolved', 400);
    }

    const updated = await db.$transaction(async (tx) => {
      const result = await tx.sensorAlert.update({
        where: { id: alertId },
        data: {
          status: 'RESOLVED',
          resolvedBy: session.user.id,
          resolvedAt: new Date(),
          resolution: validatedData.resolution,
          rootCause: validatedData.rootCause,
          preventiveMeasures: validatedData.preventiveMeasures,
          // Auto-acknowledge if not already acknowledged
          ...(alert.acknowledgedBy === null && {
            acknowledgedBy: session.user.id,
            acknowledgedAt: new Date(),
          }),
        },
        include: {
          sensor: {
            select: {
              id: true,
              sensorId: true,
              sensorType: true,
            },
          },
          equipment: {
            select: {
              id: true,
              name: true,
            },
          },
          resolvedByUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Calculate resolution time
      const resolutionTime =
        (result.resolvedAt!.getTime() - result.createdAt.getTime()) / (1000 * 60 * 60);

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'ALERT_RESOLVE',
          resourceType: 'SENSOR_ALERT',
          resourceId: alertId,
          oldValues: JSON.stringify({ status: alert.status }),
          newValues: JSON.stringify({
            status: 'RESOLVED',
            resolution: validatedData.resolution,
            rootCause: validatedData.rootCause,
            resolutionTimeHours: resolutionTime,
          }),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      return result;
    });

    return successResponse({
      message: 'Alert resolved successfully',
      alert: updated,
    });
  } catch (error) {
    return handleApiError(error, 'alert resolution');
  }
}
