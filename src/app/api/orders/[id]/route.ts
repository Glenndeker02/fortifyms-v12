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

const updateStatusSchema = z.object({
  status: z.enum([
    'DRAFT',
    'CONFIRMED',
    'IN_PRODUCTION',
    'READY',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
  ]),
  notes: z.string().optional(),
});

/**
 * GET /api/orders/[id]
 * Get purchase order details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermissions(Permission.ORDER_VIEW, 'order details');
    const orderId = params.id;

    // Get order
    const order = await db.purchaseOrder.findUnique({
      where: { id: orderId },
      include: {
        buyer: {
          select: {
            id: true,
            organizationName: true,
            organizationType: true,
            primaryContactName: true,
            primaryContactEmail: true,
            primaryContactPhone: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        mill: {
          select: {
            id: true,
            name: true,
            code: true,
            region: true,
            address: true,
            phone: true,
            email: true,
          },
        },
        rfp: {
          select: {
            id: true,
            referenceNumber: true,
            title: true,
            commodity: true,
          },
        },
        deliveries: {
          orderBy: {
            scheduledDate: 'asc',
          },
        },
        reviews: true,
      },
    });

    if (!order) {
      return errorResponse('Order not found', 404);
    }

    // Check access permissions
    const canAccess =
      session.user.role === Role.SYSTEM_ADMIN ||
      session.user.role === Role.FWGA_INSPECTOR ||
      session.user.role === Role.FWGA_PROGRAM_MANAGER ||
      (order.mill.id === session.user.millId) ||
      (session.user.role === Role.INSTITUTIONAL_BUYER &&
        order.buyer.user.id === session.user.id);

    if (!canAccess) {
      return errorResponse('You do not have permission to view this order', 403);
    }

    // Parse JSON fields
    const orderWithParsedData = {
      ...order,
      productSpecs: order.productSpecs ? JSON.parse(order.productSpecs) : null,
      deliverySchedule: order.deliverySchedule
        ? JSON.parse(order.deliverySchedule)
        : null,
      qualityStandards: order.qualityStandards
        ? JSON.parse(order.qualityStandards)
        : null,
      qualityCheckpoints: order.qualityCheckpoints
        ? JSON.parse(order.qualityCheckpoints)
        : null,
      batchLinkage: order.batchLinkage ? JSON.parse(order.batchLinkage) : [],
      issues: order.issues ? JSON.parse(order.issues) : [],
      resolutions: order.resolutions ? JSON.parse(order.resolutions) : [],
    };

    return successResponse(orderWithParsedData);
  } catch (error) {
    return handleApiError(error, 'fetching order details');
  }
}

/**
 * PATCH /api/orders/[id]
 * Update purchase order status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermissions(Permission.ORDER_EDIT, 'order update');
    const orderId = params.id;

    // Parse request body
    const body = await request.json();
    const { status, notes } = updateStatusSchema.parse(body);

    // Get order
    const order = await db.purchaseOrder.findUnique({
      where: { id: orderId },
      include: {
        buyer: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!order) {
      return errorResponse('Order not found', 404);
    }

    // Check permissions based on status transition
    // Buyers can confirm/cancel orders
    // Mills can update production status
    const isBuyer =
      session.user.role === Role.INSTITUTIONAL_BUYER &&
      order.buyer.userId === session.user.id;
    const isMill =
      (session.user.role === Role.MILL_MANAGER ||
       session.user.role === Role.MILL_TECHNICIAN) &&
      order.millId === session.user.millId;
    const isFWGA =
      session.user.role === Role.FWGA_PROGRAM_MANAGER ||
      session.user.role === Role.SYSTEM_ADMIN;

    if (!isBuyer && !isMill && !isFWGA) {
      return errorResponse('You do not have permission to update this order', 403);
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      DRAFT: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['IN_PRODUCTION', 'CANCELLED'],
      IN_PRODUCTION: ['READY', 'CANCELLED'],
      READY: ['DELIVERED'],
      DELIVERED: ['COMPLETED'],
      COMPLETED: [],
      CANCELLED: [],
    };

    if (!validTransitions[order.status]?.includes(status)) {
      return errorResponse(
        `Invalid status transition from ${order.status} to ${status}`,
        400
      );
    }

    // Update order
    const result = await db.$transaction(async (tx) => {
      const updated = await tx.purchaseOrder.update({
        where: { id: orderId },
        data: {
          status,
          confirmedAt:
            status === 'CONFIRMED' && !order.confirmedAt ? new Date() : undefined,
          confirmedBy:
            status === 'CONFIRMED' && !order.confirmedBy
              ? session.user.id
              : undefined,
          productionStartDate:
            status === 'IN_PRODUCTION' && !order.productionStartDate
              ? new Date()
              : undefined,
          actualDeliveryDate:
            status === 'DELIVERED' && !order.actualDeliveryDate
              ? new Date()
              : undefined,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'ORDER_STATUS_UPDATE',
          resourceType: 'ORDER',
          resourceId: orderId,
          oldValues: JSON.stringify({ status: order.status }),
          newValues: JSON.stringify({ status, notes }),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      // TODO: Send notifications based on status change

      return updated;
    });

    return successResponse({
      message: 'Order status updated successfully',
      orderId: result.id,
      status: result.status,
    });
  } catch (error) {
    return handleApiError(error, 'order status update');
  }
}
