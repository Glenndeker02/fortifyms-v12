import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
} from '@/lib/api-helpers';
import { requirePermissions } from '@/lib/permissions-middleware';
import { Permission, isMillStaff, Role } from '@/lib/rbac';

/**
 * GET /api/batches/[id]
 * Get detailed information about a specific batch
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check permission and get session
    const session = await requirePermissions(Permission.BATCH_VIEW, 'batches');

    const batch = await db.batchLog.findUnique({
      where: { id: params.id },
      include: {
        mill: {
          select: {
            id: true,
            name: true,
            code: true,
            address: true,
            region: true,
            country: true,
          },
        },
        operator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        qcTests: {
          include: {
            tester: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        premixUsage: true,
        traceabilityRecords: {
          orderBy: {
            timestamp: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!batch) {
      return errorResponse('Batch not found', 404);
    }

    // Check mill access for mill staff (FWGA can access any mill)
    if (isMillStaff(session.user.role)) {
      if (session.user.millId !== batch.millId) {
        return errorResponse('You do not have access to this batch', 403);
      }
    }

    return successResponse(batch);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/batches/[id]
 * Update batch information
 *
 * Allowed updates:
 * - notes
 * - status (with proper authorization)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check permission and get session
    const session = await requirePermissions(Permission.BATCH_EDIT, 'batches');

    // Get existing batch
    const existingBatch = await db.batchLog.findUnique({
      where: { id: params.id },
    });

    if (!existingBatch) {
      return errorResponse('Batch not found', 404);
    }

    // Check mill access for mill staff (FWGA can access any mill)
    if (isMillStaff(session.user.role)) {
      if (session.user.millId !== existingBatch.millId) {
        return errorResponse('You do not have access to this batch', 403);
      }
    }

    const body = await request.json();
    const updateData: any = {};

    // Only allow updating certain fields
    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    // Status updates require BATCH_APPROVE permission
    if (body.status !== undefined) {
      if (session.user.role !== Role.MILL_MANAGER && session.user.role !== Role.SYSTEM_ADMIN) {
        return errorResponse('Only mill managers can update batch status', 403);
      }
      updateData.status = body.status;
    }

    // Update batch
    const updatedBatch = await db.batchLog.update({
      where: { id: params.id },
      data: updateData,
      include: {
        mill: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        operator: {
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
        action: 'BATCH_UPDATE',
        resourceType: 'BATCH',
        resourceId: params.id,
        oldValues: existingBatch,
        newValues: updatedBatch,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return successResponse(updatedBatch);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/batches/[id]
 * Delete a batch (soft delete by marking as cancelled)
 *
 * Only system admins can delete batches
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check permission and get session (only system admins have delete permission)
    const session = await requirePermissions(Permission.BATCH_DELETE, 'batches');

    // Only system admins can delete batches
    if (session.user.role !== Role.SYSTEM_ADMIN) {
      return errorResponse('Only system administrators can delete batches', 403);
    }

    const batch = await db.batchLog.findUnique({
      where: { id: params.id },
    });

    if (!batch) {
      return errorResponse('Batch not found', 404);
    }

    // Soft delete by marking as cancelled
    const deletedBatch = await db.batchLog.update({
      where: { id: params.id },
      data: {
        status: 'CANCELLED',
        notes: `${batch.notes || ''}\n\nCANCELLED by ${session.user.name} on ${new Date().toISOString()}`,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'BATCH_DELETE',
        resourceType: 'BATCH',
        resourceId: params.id,
        oldValues: batch,
        newValues: deletedBatch,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return successResponse({ message: 'Batch cancelled successfully', batch: deletedBatch });
  } catch (error) {
    return handleApiError(error);
  }
}
