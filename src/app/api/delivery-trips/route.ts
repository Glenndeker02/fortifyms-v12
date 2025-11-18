import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import {
  successResponse,
  errorResponse,
  handleApiError,
  getPaginationParams,
  getSortingParams,
} from '@/lib/api-helpers';
import { requirePermissions } from '@/lib/permissions-middleware';
import { Permission, Role } from '@/lib/rbac';

const createTripSchema = z.object({
  routeId: z.string().cuid().optional(),
  driverId: z.string(),
  vehicleInfo: z.object({
    type: z.string(),
    capacity: z.number(),
    plateNumber: z.string(),
    model: z.string().optional(),
  }),
  scheduledDate: z.string().datetime(),
  orders: z.array(
    z.object({
      orderId: z.string().cuid(),
      deliveryLocation: z.object({
        address: z.string(),
        latitude: z.number(),
        longitude: z.number(),
      }),
      quantity: z.number().positive(),
      contactPerson: z.string().optional(),
      contactPhone: z.string().optional(),
    })
  ).min(1, 'Trip must have at least one order'),
});

/**
 * GET /api/delivery-trips
 * List delivery trips with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requirePermissions(Permission.TRIP_VIEW, 'delivery trips');

    const { skip, take } = getPaginationParams(request);
    const { orderBy } = getSortingParams(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const driverId = searchParams.get('driverId');
    const search = searchParams.get('search');

    const where: any = {};

    // Drivers see only their trips
    if (session.user.role === Role.DRIVER_LOGISTICS) {
      where.driverId = session.user.id;
    } else if (driverId) {
      where.driverId = driverId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { tripNumber: { contains: search, mode: 'insensitive' } },
        { driverId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [trips, total] = await Promise.all([
      db.deliveryTrip.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          route: {
            select: {
              id: true,
              name: true,
              totalDistance: true,
            },
          },
          _count: {
            select: {
              trackingUpdates: true,
              proofOfDeliveries: true,
            },
          },
        },
      }),
      db.deliveryTrip.count({ where }),
    ]);

    // Parse JSON fields
    const tripsWithParsedData = trips.map((trip) => ({
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
    }));

    return successResponse({
      trips: tripsWithParsedData,
      pagination: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    return handleApiError(error, 'fetching delivery trips');
  }
}

/**
 * POST /api/delivery-trips
 * Create a new delivery trip
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requirePermissions(Permission.TRIP_CREATE, 'trip creation');

    const body = await request.json();
    const validatedData = createTripSchema.parse(body);

    // Generate trip number
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const count = await db.deliveryTrip.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-${month}-01`),
        },
      },
    });
    const tripNumber = `TRIP-${year}${month}-${String(count + 1).padStart(4, '0')}`;

    // Create delivery sequence based on order locations
    const deliverySequence = validatedData.orders.map((order, idx) => ({
      sequence: idx + 1,
      orderId: order.orderId,
      location: order.deliveryLocation,
      completed: false,
    }));

    // Create trip
    const trip = await db.$transaction(async (tx) => {
      const created = await tx.deliveryTrip.create({
        data: {
          tripNumber,
          routeId: validatedData.routeId,
          driverId: validatedData.driverId,
          vehicleInfo: JSON.stringify(validatedData.vehicleInfo),
          scheduledDate: new Date(validatedData.scheduledDate),
          orders: JSON.stringify(validatedData.orders),
          deliverySequence: JSON.stringify(deliverySequence),
          status: 'SCHEDULED',
          stops: validatedData.orders.length,
          completedStops: 0,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'TRIP_CREATE',
          resourceType: 'DELIVERY_TRIP',
          resourceId: created.id,
          newValues: JSON.stringify(created),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      // TODO: Send notification to driver

      return created;
    });

    return successResponse(
      {
        message: 'Delivery trip created successfully',
        tripId: trip.id,
        tripNumber: trip.tripNumber,
        status: trip.status,
        stops: trip.stops,
      },
      201
    );
  } catch (error) {
    return handleApiError(error, 'trip creation');
  }
}
