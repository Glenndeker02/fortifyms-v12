import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import {
  successResponse,
  errorResponse,
  handleApiError,
} from '@/lib/api-helpers';
import { requirePermissions } from '@/lib/permissions-middleware';
import { Permission } from '@/lib/rbac';

const updateRouteSchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE']).optional(),
});

/**
 * GET /api/routes/[id]
 * Get route details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermissions(Permission.ROUTE_VIEW, 'route details');
    const routeId = params.id;

    const route = await db.route.findUnique({
      where: { id: routeId },
      include: {
        deliveryTrips: {
          select: {
            id: true,
            tripNumber: true,
            status: true,
            scheduledDate: true,
            startTime: true,
            endTime: true,
          },
          orderBy: {
            scheduledDate: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!route) {
      return errorResponse('Route not found', 404);
    }

    // Parse JSON fields
    const routeWithParsedData = {
      ...route,
      startLocation: JSON.parse(route.startLocation),
      stops: JSON.parse(route.stops),
      endLocation: JSON.parse(route.endLocation),
      optimizationData: route.optimizationData
        ? JSON.parse(route.optimizationData)
        : null,
    };

    return successResponse(routeWithParsedData);
  } catch (error) {
    return handleApiError(error, 'fetching route details');
  }
}

/**
 * PATCH /api/routes/[id]
 * Update route
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermissions(Permission.ROUTE_EDIT, 'route update');
    const routeId = params.id;

    const body = await request.json();
    const validatedData = updateRouteSchema.parse(body);

    const route = await db.route.findUnique({
      where: { id: routeId },
    });

    if (!route) {
      return errorResponse('Route not found', 404);
    }

    const updated = await db.$transaction(async (tx) => {
      const result = await tx.route.update({
        where: { id: routeId },
        data: validatedData,
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'ROUTE_UPDATE',
          resourceType: 'ROUTE',
          resourceId: routeId,
          oldValues: JSON.stringify(route),
          newValues: JSON.stringify(result),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      return result;
    });

    return successResponse({
      message: 'Route updated successfully',
      routeId: updated.id,
    });
  } catch (error) {
    return handleApiError(error, 'route update');
  }
}

/**
 * DELETE /api/routes/[id]
 * Delete route (soft delete by setting inactive)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermissions(Permission.ROUTE_DELETE, 'route deletion');
    const routeId = params.id;

    const route = await db.route.findUnique({
      where: { id: routeId },
      include: {
        _count: {
          select: {
            deliveryTrips: true,
          },
        },
      },
    });

    if (!route) {
      return errorResponse('Route not found', 404);
    }

    // Check if route has active trips
    const activeTrips = await db.deliveryTrip.count({
      where: {
        routeId: routeId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      },
    });

    if (activeTrips > 0) {
      return errorResponse(
        'Cannot delete route with active delivery trips',
        400
      );
    }

    const result = await db.$transaction(async (tx) => {
      const deleted = await tx.route.update({
        where: { id: routeId },
        data: {
          isActive: false,
          status: 'INACTIVE',
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'ROUTE_DELETE',
          resourceType: 'ROUTE',
          resourceId: routeId,
          oldValues: JSON.stringify(route),
          newValues: JSON.stringify({ isActive: false, status: 'INACTIVE' }),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      return deleted;
    });

    return successResponse({
      message: 'Route deleted successfully',
      routeId: result.id,
    });
  } catch (error) {
    return handleApiError(error, 'route deletion');
  }
}
