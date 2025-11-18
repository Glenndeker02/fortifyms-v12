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

const createPODSchema = z.object({
  tripId: z.string().cuid(),
  orderId: z.string().cuid(),
  deliveryLocation: z.object({
    address: z.string(),
    latitude: z.number(),
    longitude: z.number(),
  }),
  receivedBy: z.string().min(2, 'Receiver name is required'),
  receivedByTitle: z.string().optional(),
  receivedByPhone: z.string().optional(),
  quantityOrdered: z.number().positive(),
  quantityDelivered: z.number().positive(),
  discrepancyReason: z.string().optional(),
  conditionNotes: z.string().optional(),
  signatureUrl: z.string().url().optional(),
  photoUrls: z.array(z.string().url()).optional(),
  batchNumbers: z.array(z.string()).optional(),
});

/**
 * GET /api/pod
 * List proof of deliveries with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requirePermissions(Permission.POD_VIEW, 'proof of delivery');

    const { skip, take } = getPaginationParams(request);
    const { orderBy } = getSortingParams(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const tripId = searchParams.get('tripId');
    const orderId = searchParams.get('orderId');

    const where: any = {};

    // Drivers see PODs for their trips
    if (session.user.role === Role.DRIVER_LOGISTICS) {
      where.trip = { driverId: session.user.id };
    }

    if (status) where.status = status;
    if (tripId) where.tripId = tripId;
    if (orderId) where.orderId = orderId;

    const [pods, total] = await Promise.all([
      db.proofOfDelivery.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          trip: {
            select: {
              id: true,
              tripNumber: true,
              driverId: true,
            },
          },
        },
      }),
      db.proofOfDelivery.count({ where }),
    ]);

    // Parse JSON fields
    const podsWithParsedData = pods.map((pod) => ({
      ...pod,
      deliveryLocation: JSON.parse(pod.deliveryLocation),
      photoUrls: pod.photoUrls ? JSON.parse(pod.photoUrls) : [],
      batchNumbers: pod.batchNumbers ? JSON.parse(pod.batchNumbers) : [],
      dispute: pod.dispute ? JSON.parse(pod.dispute) : null,
      resolution: pod.resolution ? JSON.parse(pod.resolution) : null,
    }));

    return successResponse({
      pods: podsWithParsedData,
      pagination: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    return handleApiError(error, 'fetching PODs');
  }
}

/**
 * POST /api/pod
 * Create a new proof of delivery (driver submits)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requirePermissions(Permission.POD_CREATE, 'POD creation');

    const body = await request.json();
    const validatedData = createPODSchema.parse(body);

    // Verify trip exists
    const trip = await db.deliveryTrip.findUnique({
      where: { id: validatedData.tripId },
    });

    if (!trip) {
      return errorResponse('Delivery trip not found', 404);
    }

    // Only assigned driver can create POD
    if (
      session.user.role === Role.DRIVER_LOGISTICS &&
      trip.driverId !== session.user.id
    ) {
      return errorResponse('You can only create POD for your own trips', 403);
    }

    // Check trip is in progress
    if (trip.status !== 'IN_PROGRESS') {
      return errorResponse(
        'Can only create POD for trips in progress',
        400
      );
    }

    // Calculate discrepancy
    const discrepancy = validatedData.quantityDelivered - validatedData.quantityOrdered;

    const pod = await db.$transaction(async (tx) => {
      const created = await tx.proofOfDelivery.create({
        data: {
          tripId: validatedData.tripId,
          orderId: validatedData.orderId,
          deliveryLocation: JSON.stringify(validatedData.deliveryLocation),
          receivedBy: validatedData.receivedBy,
          receivedByTitle: validatedData.receivedByTitle,
          receivedByPhone: validatedData.receivedByPhone,
          quantityOrdered: validatedData.quantityOrdered,
          quantityDelivered: validatedData.quantityDelivered,
          discrepancy,
          discrepancyReason: validatedData.discrepancyReason,
          conditionNotes: validatedData.conditionNotes,
          signatureUrl: validatedData.signatureUrl,
          photoUrls: validatedData.photoUrls
            ? JSON.stringify(validatedData.photoUrls)
            : null,
          batchNumbers: validatedData.batchNumbers
            ? JSON.stringify(validatedData.batchNumbers)
            : null,
          status: 'SUBMITTED',
        },
      });

      // Update delivery sequence in trip
      const deliverySequence = trip.deliverySequence
        ? JSON.parse(trip.deliverySequence)
        : [];
      const updatedSequence = deliverySequence.map((stop: any) =>
        stop.orderId === validatedData.orderId
          ? { ...stop, completed: true, completedAt: new Date() }
          : stop
      );

      await tx.deliveryTrip.update({
        where: { id: validatedData.tripId },
        data: {
          deliverySequence: JSON.stringify(updatedSequence),
          completedStops: updatedSequence.filter((s: any) => s.completed).length,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'POD_CREATE',
          resourceType: 'POD',
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
        message: 'Proof of delivery submitted successfully',
        podId: pod.id,
        orderId: pod.orderId,
        status: pod.status,
        hasDiscrepancy: discrepancy !== 0,
      },
      201
    );
  } catch (error) {
    return handleApiError(error, 'POD creation');
  }
}
