import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
  requireAuth,
} from '@/lib/api-helpers';
import { AlertStatus } from '@/lib/alerts';

/**
 * GET /api/alerts/[id]
 * Get alert details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();

    const alert = await db.alert.findUnique({
      where: { id: params.id },
      include: {
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        actionItem: {
          include: {
            assignedTo: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        escalations: {
          orderBy: { createdAt: 'asc' },
          include: {
            escalatedTo: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!alert) {
      return errorResponse('Alert not found', 404);
    }

    // Check if user has access to this alert
    if (
      alert.recipientId !== session.user.id &&
      alert.recipientRole !== session.user.role &&
      !alert.escalations.find((e) => e.escalatedToId === session.user.id)
    ) {
      return errorResponse('Access denied', 403);
    }

    // Mark as read if not already
    if (!alert.readAt && alert.recipientId === session.user.id) {
      await db.alert.update({
        where: { id: params.id },
        data: { readAt: new Date() },
      });
    }

    return successResponse(alert);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/alerts/[id]
 * Update alert status (acknowledge, resolve, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const alert = await db.alert.findUnique({
      where: { id: params.id },
    });

    if (!alert) {
      return errorResponse('Alert not found', 404);
    }

    // Check access
    if (
      alert.recipientId !== session.user.id &&
      alert.recipientRole !== session.user.role
    ) {
      return errorResponse('Access denied', 403);
    }

    const updateData: any = {};

    // Handle status transitions
    if (body.status) {
      const validTransitions: Record<string, string[]> = {
        PENDING: ['ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED'],
        ACKNOWLEDGED: ['IN_PROGRESS', 'RESOLVED'],
        IN_PROGRESS: ['RESOLVED', 'ESCALATED'],
        ESCALATED: ['IN_PROGRESS', 'RESOLVED'],
        RESOLVED: [], // Cannot change from resolved
      };

      if (!validTransitions[alert.status]?.includes(body.status)) {
        return errorResponse(
          `Cannot transition from ${alert.status} to ${body.status}`,
          400
        );
      }

      updateData.status = body.status;

      // Set timestamps based on status
      if (body.status === 'ACKNOWLEDGED' && !alert.acknowledgedAt) {
        updateData.acknowledgedAt = new Date();
        updateData.acknowledgedBy = session.user.id;
      }

      if (body.status === 'RESOLVED' && !alert.resolvedAt) {
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = session.user.id;
      }
    }

    // Handle resolution notes
    if (body.resolutionNotes) {
      updateData.resolutionNotes = body.resolutionNotes;
    }

    // Update alert
    const updatedAlert = await db.alert.update({
      where: { id: params.id },
      data: updateData,
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'ALERT_UPDATE',
        resourceType: 'ALERT',
        resourceId: params.id,
        oldValues: alert,
        newValues: updatedAlert,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return successResponse(updatedAlert);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/alerts/[id]
 * Delete an alert (admins only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();

    // Only admins can delete alerts
    if (session.user.role !== 'SYSTEM_ADMIN') {
      return errorResponse('Only administrators can delete alerts', 403);
    }

    const alert = await db.alert.findUnique({
      where: { id: params.id },
    });

    if (!alert) {
      return errorResponse('Alert not found', 404);
    }

    await db.alert.delete({
      where: { id: params.id },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'ALERT_DELETE',
        resourceType: 'ALERT',
        resourceId: params.id,
        oldValues: alert,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return successResponse({ message: 'Alert deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
