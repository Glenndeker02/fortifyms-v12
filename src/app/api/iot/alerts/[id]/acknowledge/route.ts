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

const acknowledgeSchema = z.object({
  notes: z.string().optional(),
});

/**
 * POST /api/iot/alerts/[id]/acknowledge
 * Acknowledge a sensor alert
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermissions(
      Permission.SENSOR_ALERT_VIEW,
      'alert acknowledgment'
    );

    const alertId = params.id;
    const body = await request.json();
    const validatedData = acknowledgeSchema.parse(body);

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

    if (alert.status !== 'ACTIVE') {
      return errorResponse('Only active alerts can be acknowledged', 400);
    }

    const updated = await db.$transaction(async (tx) => {
      const result = await tx.sensorAlert.update({
        where: { id: alertId },
        data: {
          status: 'ACKNOWLEDGED',
          acknowledgedBy: session.user.id,
          acknowledgedAt: new Date(),
          notes: validatedData.notes,
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
          acknowledgedByUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'ALERT_ACKNOWLEDGE',
          resourceType: 'SENSOR_ALERT',
          resourceId: alertId,
          oldValues: JSON.stringify({ status: alert.status }),
          newValues: JSON.stringify({
            status: 'ACKNOWLEDGED',
            notes: validatedData.notes,
          }),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      return result;
    });

    return successResponse({
      message: 'Alert acknowledged successfully',
      alert: updated,
    });
  } catch (error) {
    return handleApiError(error, 'alert acknowledgment');
  }
}
