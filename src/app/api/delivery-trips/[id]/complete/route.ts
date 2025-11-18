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

const completeTripSchema = z.object({
  endLocation: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  odometerReading: z.number().optional(),
  fuelUsed: z.number().optional(),
  notes: z.string().optional(),
  issues: z.array(z.object({
    type: z.string(),
    description: z.string(),
    orderId: z.string().optional(),
  })).optional(),
});

/**
 * POST /api/delivery-trips/[id]/complete
 * Complete a delivery trip
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermissions(Permission.TRIP_COMPLETE, 'trip completion');
    const tripId = params.id;

    const body = await request.json();
    const { endLocation, odometerReading, fuelUsed, notes, issues } =
      completeTripSchema.parse(body);

    const trip = await db.deliveryTrip.findUnique({
      where: { id: tripId },
      include: {
        proofOfDeliveries: true,
      },
    });

    if (!trip) {
      return errorResponse('Delivery trip not found', 404);
    }

    // Only drivers can complete trips
    if (
      session.user.role === Role.DRIVER_LOGISTICS &&
      trip.driverId !== session.user.id
    ) {
      return errorResponse('You can only complete your own delivery trips', 403);
    }

    // Check status - must be IN_PROGRESS
    if (trip.status !== 'IN_PROGRESS') {
      return errorResponse(`Cannot complete trip with status ${trip.status}`, 400);
    }

    // Check all deliveries have POD
    const orders = JSON.parse(trip.orders);
    const missingPODs = orders.filter(
      (order: any) =>
        !trip.proofOfDeliveries.some((pod) => pod.orderId === order.orderId)
    );

    if (missingPODs.length > 0) {
      return errorResponse(
        `Missing proof of delivery for ${missingPODs.length} order(s). Complete all deliveries before finishing trip.`,
        400
      );
    }

    // Calculate total distance from tracking data
    const trackingPoints = await db.tripTracking.findMany({
      where: { tripId },
      orderBy: { timestamp: 'asc' },
    });

    let totalDistance = 0;
    for (let i = 1; i < trackingPoints.length; i++) {
      const prev = trackingPoints[i - 1];
      const curr = trackingPoints[i];

      // Haversine formula
      const R = 6371;
      const dLat = ((curr.latitude - prev.latitude) * Math.PI) / 180;
      const dLon = ((curr.longitude - prev.longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((prev.latitude * Math.PI) / 180) *
          Math.cos((curr.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalDistance += R * c;
    }

    // Calculate average speed
    const tripDuration = trip.startTime
      ? (new Date().getTime() - new Date(trip.startTime).getTime()) / (1000 * 60 * 60)
      : 0;
    const avgSpeed = tripDuration > 0 ? totalDistance / tripDuration : 0;

    const result = await db.$transaction(async (tx) => {
      // Update trip status
      const completed = await tx.deliveryTrip.update({
        where: { id: tripId },
        data: {
          status: 'COMPLETED',
          endTime: new Date(),
          actualArrival: new Date(),
          totalDistance,
          avgSpeed,
          fuelUsed,
          completedStops: orders.length,
          notes,
          issues: issues ? JSON.stringify(issues) : trip.issues,
        },
      });

      // Create final tracking point
      await tx.tripTracking.create({
        data: {
          tripId,
          latitude: endLocation.latitude,
          longitude: endLocation.longitude,
          timestamp: new Date(),
          metadata: JSON.stringify({
            event: 'TRIP_COMPLETE',
            odometerReading,
            totalDistance,
            avgSpeed,
          }),
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'TRIP_COMPLETE',
          resourceType: 'DELIVERY_TRIP',
          resourceId: tripId,
          oldValues: JSON.stringify({ status: trip.status }),
          newValues: JSON.stringify({
            status: 'COMPLETED',
            endTime: new Date(),
            totalDistance,
            avgSpeed,
          }),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      return completed;
    });

    return successResponse({
      message: 'Delivery trip completed successfully',
      tripId: result.id,
      tripNumber: result.tripNumber,
      status: result.status,
      endTime: result.endTime,
      totalDistance: result.totalDistance,
      avgSpeed: result.avgSpeed,
      completedStops: result.completedStops,
    });
  } catch (error) {
    return handleApiError(error, 'trip completion');
  }
}
