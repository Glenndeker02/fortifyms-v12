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

const trackingUpdateSchema = z.object({
  tripId: z.string().cuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
  speed: z.number().nonnegative().optional(),
  heading: z.number().min(0).max(360).optional(),
  altitude: z.number().optional(),
  batteryLevel: z.number().min(0).max(100).optional(),
});

/**
 * POST /api/tracking/update
 * Update driver location (from mobile app)
 * This endpoint is called frequently (every 30-60 seconds) during active trips
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requirePermissions(
      Permission.TRACKING_UPDATE,
      'tracking update'
    );

    const body = await request.json();
    const validatedData = trackingUpdateSchema.parse(body);

    // Verify trip exists and driver owns it
    const trip = await db.deliveryTrip.findUnique({
      where: { id: validatedData.tripId },
    });

    if (!trip) {
      return errorResponse('Delivery trip not found', 404);
    }

    // Only the assigned driver can update tracking
    if (
      session.user.role === Role.DRIVER_LOGISTICS &&
      trip.driverId !== session.user.id
    ) {
      return errorResponse('You can only update tracking for your own trips', 403);
    }

    // Check trip is in progress
    if (trip.status !== 'IN_PROGRESS') {
      return errorResponse(
        'Can only update tracking for trips in progress',
        400
      );
    }

    const result = await db.$transaction(async (tx) => {
      // Create tracking point
      const tracking = await tx.tripTracking.create({
        data: {
          tripId: validatedData.tripId,
          latitude: validatedData.latitude,
          longitude: validatedData.longitude,
          accuracy: validatedData.accuracy,
          speed: validatedData.speed,
          heading: validatedData.heading,
          altitude: validatedData.altitude,
          batteryLevel: validatedData.batteryLevel,
          timestamp: new Date(),
        },
      });

      // Update trip's current location
      await tx.deliveryTrip.update({
        where: { id: validatedData.tripId },
        data: {
          currentLocation: JSON.stringify({
            latitude: validatedData.latitude,
            longitude: validatedData.longitude,
            accuracy: validatedData.accuracy,
            timestamp: new Date(),
          }),
        },
      });

      return tracking;
    });

    // TODO: Broadcast to WebSocket clients subscribed to this trip
    // This would push real-time updates to dashboards and monitoring systems

    return successResponse({
      message: 'Location updated successfully',
      trackingId: result.id,
      timestamp: result.timestamp,
    });
  } catch (error) {
    return handleApiError(error, 'tracking update');
  }
}
