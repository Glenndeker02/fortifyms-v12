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

const createRouteSchema = z.object({
  name: z.string().min(3, 'Route name must be at least 3 characters'),
  description: z.string().optional(),
  startLocation: z.object({
    address: z.string(),
    latitude: z.number(),
    longitude: z.number(),
  }),
  stops: z.array(
    z.object({
      sequence: z.number().int().positive(),
      address: z.string(),
      latitude: z.number(),
      longitude: z.number(),
      contactPerson: z.string().optional(),
      contactPhone: z.string().optional(),
      deliveryWindow: z.object({
        start: z.string().optional(),
        end: z.string().optional(),
      }).optional(),
    })
  ).min(1, 'Route must have at least one stop'),
  endLocation: z.object({
    address: z.string(),
    latitude: z.number(),
    longitude: z.number(),
  }),
  optimize: z.boolean().default(true),
});

/**
 * GET /api/routes
 * List delivery routes with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requirePermissions(Permission.ROUTE_VIEW, 'routes');

    const { skip, take } = getPaginationParams(request);
    const { orderBy } = getSortingParams(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [routes, total] = await Promise.all([
      db.route.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          _count: {
            select: {
              deliveryTrips: true,
            },
          },
        },
      }),
      db.route.count({ where }),
    ]);

    // Parse JSON fields
    const routesWithParsedData = routes.map((route) => ({
      ...route,
      startLocation: JSON.parse(route.startLocation),
      stops: JSON.parse(route.stops),
      endLocation: JSON.parse(route.endLocation),
      optimizationData: route.optimizationData
        ? JSON.parse(route.optimizationData)
        : null,
    }));

    return successResponse({
      routes: routesWithParsedData,
      pagination: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    return handleApiError(error, 'fetching routes');
  }
}

/**
 * POST /api/routes
 * Create a new delivery route with optional optimization
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requirePermissions(Permission.ROUTE_CREATE, 'route creation');

    const body = await request.json();
    const validatedData = createRouteSchema.parse(body);

    // Calculate basic route metrics
    let totalDistance = 0;
    let estimatedDuration = 0;

    // Sort stops by sequence
    const sortedStops = [...validatedData.stops].sort((a, b) => a.sequence - b.sequence);

    // Calculate distances between points (Haversine formula)
    const calculateDistance = (
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number
    ): number => {
      const R = 6371; // Earth's radius in km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // Calculate total distance
    let prevLat = validatedData.startLocation.latitude;
    let prevLon = validatedData.startLocation.longitude;

    for (const stop of sortedStops) {
      const distance = calculateDistance(prevLat, prevLon, stop.latitude, stop.longitude);
      totalDistance += distance;
      prevLat = stop.latitude;
      prevLon = stop.longitude;
    }

    // Add distance to end location
    totalDistance += calculateDistance(
      prevLat,
      prevLon,
      validatedData.endLocation.latitude,
      validatedData.endLocation.longitude
    );

    // Estimate duration (average 40 km/h + 15 min per stop)
    estimatedDuration = Math.round((totalDistance / 40) * 60 + sortedStops.length * 15);

    // Perform route optimization if requested
    let optimizedStops = sortedStops;
    let optimizationData = null;

    if (validatedData.optimize && sortedStops.length > 2) {
      // Simple nearest neighbor optimization
      const unvisited = [...sortedStops];
      const optimized = [];
      let current = {
        latitude: validatedData.startLocation.latitude,
        longitude: validatedData.startLocation.longitude,
      };

      while (unvisited.length > 0) {
        let nearestIdx = 0;
        let nearestDist = Infinity;

        unvisited.forEach((stop, idx) => {
          const dist = calculateDistance(
            current.latitude,
            current.longitude,
            stop.latitude,
            stop.longitude
          );
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestIdx = idx;
          }
        });

        const nearest = unvisited.splice(nearestIdx, 1)[0];
        optimized.push({ ...nearest, sequence: optimized.length + 1 });
        current = nearest;
      }

      optimizedStops = optimized;

      // Recalculate distance for optimized route
      let optimizedDistance = 0;
      prevLat = validatedData.startLocation.latitude;
      prevLon = validatedData.startLocation.longitude;

      for (const stop of optimizedStops) {
        const distance = calculateDistance(prevLat, prevLon, stop.latitude, stop.longitude);
        optimizedDistance += distance;
        prevLat = stop.latitude;
        prevLon = stop.longitude;
      }

      optimizedDistance += calculateDistance(
        prevLat,
        prevLon,
        validatedData.endLocation.latitude,
        validatedData.endLocation.longitude
      );

      optimizationData = {
        originalDistance: totalDistance,
        optimizedDistance,
        savings: totalDistance - optimizedDistance,
        savingsPercentage: ((totalDistance - optimizedDistance) / totalDistance) * 100,
        algorithm: 'nearest_neighbor',
        optimizedAt: new Date().toISOString(),
      };

      totalDistance = optimizedDistance;
      estimatedDuration = Math.round((totalDistance / 40) * 60 + optimizedStops.length * 15);
    }

    // Create route
    const route = await db.$transaction(async (tx) => {
      const created = await tx.route.create({
        data: {
          name: validatedData.name,
          description: validatedData.description,
          startLocation: JSON.stringify(validatedData.startLocation),
          stops: JSON.stringify(optimizedStops),
          endLocation: JSON.stringify(validatedData.endLocation),
          totalDistance,
          estimatedDuration,
          optimizationData: optimizationData ? JSON.stringify(optimizationData) : null,
          createdBy: session.user.id,
          status: 'ACTIVE',
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'ROUTE_CREATE',
          resourceType: 'ROUTE',
          resourceId: created.id,
          newValues: JSON.stringify(created),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      return created;
    });

    return successResponse(
      {
        message: 'Route created successfully',
        routeId: route.id,
        totalDistance: route.totalDistance,
        estimatedDuration: route.estimatedDuration,
        optimization: optimizationData,
      },
      201
    );
  } catch (error) {
    return handleApiError(error, 'route creation');
  }
}
