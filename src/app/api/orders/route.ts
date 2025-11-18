import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
  getPaginationParams,
  getSortingParams,
} from '@/lib/api-helpers';
import { requirePermissions } from '@/lib/permissions-middleware';
import { Permission, Role } from '@/lib/rbac';

/**
 * GET /api/orders
 * List purchase orders with pagination and filtering
 *
 * Query parameters:
 * - page, limit, sortBy, sortOrder: Standard pagination
 * - status: Filter by order status
 * - millId: Filter by mill (for buyers/FWGA)
 * - buyerId: Filter by buyer (for FWGA)
 * - search: Search by PO number or product specs
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requirePermissions(Permission.ORDER_VIEW, 'orders');

    // Get pagination and sorting params
    const { skip, take } = getPaginationParams(request);
    const { orderBy } = getSortingParams(request);

    // Get filter params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const millId = searchParams.get('millId');
    const buyerId = searchParams.get('buyerId');
    const search = searchParams.get('search');

    // Build where clause based on role
    const where: any = {};

    // Mills see only their orders
    if (
      session.user.role === Role.MILL_MANAGER ||
      session.user.role === Role.MILL_OPERATOR ||
      session.user.role === Role.MILL_TECHNICIAN
    ) {
      if (!session.user.millId) {
        return errorResponse('Mill staff must be assigned to a mill', 403);
      }
      where.millId = session.user.millId;
    }

    // Buyers see only their orders
    if (session.user.role === Role.INSTITUTIONAL_BUYER) {
      where.buyer = { userId: session.user.id };
    }

    // FWGA staff can filter
    if (
      session.user.role === Role.FWGA_INSPECTOR ||
      session.user.role === Role.FWGA_PROGRAM_MANAGER ||
      session.user.role === Role.SYSTEM_ADMIN
    ) {
      if (millId) where.millId = millId;
      if (buyerId) where.buyerId = buyerId;
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Search
    if (search) {
      where.OR = [
        { poNumber: { contains: search, mode: 'insensitive' } },
        { productSpecs: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get orders with related data
    const [orders, total] = await Promise.all([
      db.purchaseOrder.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          buyer: {
            select: {
              id: true,
              organizationName: true,
              organizationType: true,
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
            },
          },
          rfp: {
            select: {
              id: true,
              referenceNumber: true,
              title: true,
            },
          },
          deliveries: {
            select: {
              id: true,
              scheduledDate: true,
              actualDate: true,
              status: true,
            },
          },
        },
      }),
      db.purchaseOrder.count({ where }),
    ]);

    // Parse JSON fields
    const ordersWithParsedData = orders.map((order) => ({
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
    }));

    return successResponse({
      orders: ordersWithParsedData,
      pagination: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    return handleApiError(error, 'fetching orders');
  }
}
