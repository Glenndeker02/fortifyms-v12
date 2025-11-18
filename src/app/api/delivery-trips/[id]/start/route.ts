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

const startTripSchema = z.object({
  startLocation: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  odometerReading: z.number().optional(),
  fuelLevel: z.number().min(0).max(100).optional(),
});

/**
 * POST /api/delivery-trips/[id]/start
 * Start a delivery trip
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermissions(Permission.TRIP_START, 'trip start');
    const tripId = params.id;

    const body = await request.json();
    const { startLocation, odometerReading, fuelLevel } = startTripSchema.parse(body);

    const trip = await db.deliveryTrip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      return errorResponse('Delivery trip not found', 404);
    }

    // Only drivers can start trips
    if (
      session.user.role === Role.DRIVER_LOGISTICS &&
      trip.driverId !== session.user.id
    ) {
      return errorResponse('You can only start your own delivery trips', 403);
    }

    // Check status - must be SCHEDULED
    if (trip.status !== 'SCHEDULED') {
      return errorResponse(`Cannot start trip with status ${trip.status}`, 400);
    }

    const result = await db.$transaction(async (tx) => {
      // Update trip status
      const started = await tx.deliveryTrip.update({
        where: { id: tripId },
        data: {
          status: 'IN_PROGRESS',
          startTime: new Date(),
          currentLocation: JSON.stringify(startLocation),
        },
      });

      // Create first tracking point
      await tx.tripTracking.create({
        data: {
          tripId,
          latitude: startLocation.latitude,
          longitude: startLocation.longitude,
          timestamp: new Date(),
          metadata: JSON.stringify({
            event: 'TRIP_START',
            odometerReading,
            fuelLevel,
          }),
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'TRIP_START',
          resourceType: 'DELIVERY_TRIP',
          resourceId: tripId,
          oldValues: JSON.stringify({ status: trip.status }),
          newValues: JSON.stringify({ status: 'IN_PROGRESS', startTime: new Date() }),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      return started;
    });

    return successResponse({
      message: 'Delivery trip started successfully',
      tripId: result.id,
      tripNumber: result.tripNumber,
      status: result.status,
      startTime: result.startTime,
    });
  } catch (error) {
    return handleApiError(error, 'trip start');
  }
}
