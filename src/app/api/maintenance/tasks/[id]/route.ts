import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
  requireAuth,
} from '@/lib/api-helpers';
import { isMillStaff } from '@/lib/auth';

/**
 * GET /api/maintenance/tasks/[id]
 * Get detailed information about a specific maintenance task
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();

    const task = await db.maintenanceTask.findUnique({
      where: { id: params.id },
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            type: true,
            serialNumber: true,
            location: true,
          },
        },
        mill: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!task) {
      return errorResponse('Maintenance task not found', 404);
    }

    // Check access permissions
    if (isMillStaff(session.user.role)) {
      if (!session.user.millId || task.millId !== session.user.millId) {
        return errorResponse('You can only view tasks from your mill', 403);
      }
    }

    return successResponse(task);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/maintenance/tasks/[id]
 * Update a maintenance task
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();

    const existingTask = await db.maintenanceTask.findUnique({
      where: { id: params.id },
    });

    if (!existingTask) {
      return errorResponse('Maintenance task not found', 404);
    }

    // Check access permissions
    if (isMillStaff(session.user.role)) {
      if (!session.user.millId || existingTask.millId !== session.user.millId) {
        return errorResponse('You can only update tasks from your mill', 403);
      }
    }

    const body = await request.json();
    const updateData: any = {};

    // Status transitions
    if (body.status) {
      const validTransitions: Record<string, string[]> = {
        SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
        IN_PROGRESS: ['COMPLETED', 'CANCELLED', 'SCHEDULED'],
        COMPLETED: [],
        CANCELLED: ['SCHEDULED'],
        OVERDUE: ['IN_PROGRESS', 'CANCELLED'],
      };

      if (!validTransitions[existingTask.status]?.includes(body.status)) {
        return errorResponse(
          `Cannot transition from ${existingTask.status} to ${body.status}`,
          400
        );
      }

      updateData.status = body.status;

      // Auto-set completion timestamp
      if (body.status === 'COMPLETED' && !existingTask.completedAt) {
        updateData.completedAt = new Date();
      }
    }

    // Allowed fields for update
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.assignedTo !== undefined) updateData.assignedTo = body.assignedTo;
    if (body.scheduledDate !== undefined) {
      updateData.scheduledDate = new Date(body.scheduledDate);
    }
    if (body.scheduledTime !== undefined) {
      updateData.scheduledTime = new Date(body.scheduledTime);
    }
    if (body.estimatedDuration !== undefined) {
      updateData.estimatedDuration = body.estimatedDuration;
    }
    if (body.actualDuration !== undefined) {
      updateData.actualDuration = body.actualDuration;
    }
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.partsUsed !== undefined) updateData.partsUsed = body.partsUsed;
    if (body.costEstimate !== undefined) updateData.costEstimate = body.costEstimate;
    if (body.actualCost !== undefined) updateData.actualCost = body.actualCost;

    const updatedTask = await db.maintenanceTask.update({
      where: { id: params.id },
      data: updateData,
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        mill: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'MAINTENANCE_TASK_UPDATE',
        resourceType: 'MAINTENANCE_TASK',
        resourceId: params.id,
        oldValues: existingTask,
        newValues: updatedTask,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return successResponse(updatedTask);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/maintenance/tasks/[id]
 * Delete a maintenance task
 *
 * Only system admins can delete tasks
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();

    // Only system admins can delete tasks
    if (session.user.role !== 'SYSTEM_ADMIN') {
      return errorResponse('Only system administrators can delete maintenance tasks', 403);
    }

    const task = await db.maintenanceTask.findUnique({
      where: { id: params.id },
    });

    if (!task) {
      return errorResponse('Maintenance task not found', 404);
    }

    // Delete the task
    await db.maintenanceTask.delete({
      where: { id: params.id },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'MAINTENANCE_TASK_DELETE',
        resourceType: 'MAINTENANCE_TASK',
        resourceId: params.id,
        oldValues: task,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return successResponse({ message: 'Maintenance task deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
