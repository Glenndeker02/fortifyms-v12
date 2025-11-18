import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
} from '@/lib/api-helpers';
import { requirePermissions } from '@/lib/permissions-middleware';
import { Permission } from '@/lib/rbac';

/**
 * GET /api/tracking/trip/[id]
 * Get current tracking data and recent location history for a trip
 * Used by real-time tracking dashboards
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermissions(Permission.TRACKING_VIEW, 'trip tracking');
    const tripId = params.id;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const since = searchParams.get('since'); // ISO timestamp

    // Get trip with latest tracking data
    const trip = await db.deliveryTrip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        tripNumber: true,
        status: true,
        driverId: true,
        scheduledDate: true,
        startTime: true,
        endTime: true,
        currentLocation: true,
        orders: true,
        deliverySequence: true,
      },
    });

    if (!trip) {
      return errorResponse('Delivery trip not found', 404);
    }

    // Build where clause for tracking points
    const where: any = { tripId };
    if (since) {
      where.timestamp = {
        gte: new Date(since),
      };
    }

    // Get tracking points
    const trackingPoints = await db.tripTracking.findMany({
      where,
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    });

    // Calculate ETA for active trips
    let eta = null;
    if (trip.status === 'IN_PROGRESS' && trackingPoints.length > 0) {
      const orders = JSON.parse(trip.orders);
      const deliverySequence = trip.deliverySequence
        ? JSON.parse(trip.deliverySequence)
        : [];

      // Find next undelivered stop
      const nextStop = deliverySequence.find((stop: any) => !stop.completed);

      if (nextStop && trip.currentLocation) {
        const currentLoc = JSON.parse(trip.currentLocation);

        // Calculate distance to next stop (simple straight-line)
        const R = 6371;
        const dLat = ((nextStop.location.latitude - currentLoc.latitude) * Math.PI) / 180;
        const dLon = ((nextStop.location.longitude - currentLoc.longitude) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((currentLoc.latitude * Math.PI) / 180) *
            Math.cos((nextStop.location.latitude * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = R * c;

        // Calculate average speed from recent tracking points
        const recentPoints = trackingPoints.slice(0, 10);
        const avgSpeed =
          recentPoints.reduce((sum, p) => sum + (p.speed || 0), 0) / recentPoints.length || 40;

        // Calculate ETA
        const hoursToNext = distanceKm / avgSpeed;
        eta = new Date(Date.now() + hoursToNext * 60 * 60 * 1000);
      }
    }

    return successResponse({
      trip: {
        ...trip,
        currentLocation: trip.currentLocation
          ? JSON.parse(trip.currentLocation)
          : null,
        orders: JSON.parse(trip.orders),
        deliverySequence: trip.deliverySequence
          ? JSON.parse(trip.deliverySequence)
          : null,
      },
      tracking: {
        points: trackingPoints.reverse(), // Oldest first for replay
        count: trackingPoints.length,
        latest: trackingPoints[0] || null,
        eta,
      },
    });
  } catch (error) {
    return handleApiError(error, 'fetching trip tracking');
  }
}
