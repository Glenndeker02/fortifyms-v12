import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
} from '@/lib/api-helpers';
import { requirePermissions } from '@/lib/permissions-middleware';
import { Permission, Role } from '@/lib/rbac';

/**
 * GET /api/delivery-trips/[id]
 * Get delivery trip details with tracking data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermissions(Permission.TRIP_VIEW, 'trip details');
    const tripId = params.id;

    const trip = await db.deliveryTrip.findUnique({
      where: { id: tripId },
      include: {
        route: {
          select: {
            id: true,
            name: true,
            startLocation: true,
            stops: true,
            endLocation: true,
            totalDistance: true,
            estimatedDuration: true,
          },
        },
        trackingUpdates: {
          orderBy: {
            timestamp: 'desc',
          },
          take: 100, // Last 100 tracking points
        },
        proofOfDeliveries: {
          orderBy: {
            deliveredAt: 'asc',
          },
        },
      },
    });

    if (!trip) {
      return errorResponse('Delivery trip not found', 404);
    }

    // Check access - drivers see their trips, others see all
    if (
      session.user.role === Role.DRIVER_LOGISTICS &&
      trip.driverId !== session.user.id
    ) {
      return errorResponse('You can only view your own delivery trips', 403);
    }

    // Parse JSON fields
    const tripWithParsedData = {
      ...trip,
      vehicleInfo: trip.vehicleInfo ? JSON.parse(trip.vehicleInfo) : null,
      orders: JSON.parse(trip.orders),
      deliverySequence: trip.deliverySequence
        ? JSON.parse(trip.deliverySequence)
        : null,
      currentLocation: trip.currentLocation
        ? JSON.parse(trip.currentLocation)
        : null,
      locationHistory: trip.locationHistory
        ? JSON.parse(trip.locationHistory)
        : [],
      issues: trip.issues ? JSON.parse(trip.issues) : [],
      route: trip.route
        ? {
            ...trip.route,
            startLocation: JSON.parse(trip.route.startLocation),
            stops: JSON.parse(trip.route.stops),
            endLocation: JSON.parse(trip.route.endLocation),
          }
        : null,
    };

    return successResponse(tripWithParsedData);
  } catch (error) {
    return handleApiError(error, 'fetching trip details');
  }
}
