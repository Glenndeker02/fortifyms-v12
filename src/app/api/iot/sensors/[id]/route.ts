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

const updateSensorSchema = z.object({
  location: z.string().min(3).optional(),
  minThreshold: z.number().optional(),
  maxThreshold: z.number().optional(),
  criticalMin: z.number().optional(),
  criticalMax: z.number().optional(),
  samplingInterval: z.number().int().positive().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'FAULTY']).optional(),
  calibrationDate: z.string().datetime().optional(),
  nextCalibrationDue: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * GET /api/iot/sensors/[id]
 * Get sensor details with recent readings
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermissions(
      Permission.SENSOR_VIEW,
      'sensor access'
    );

    const sensorId = params.id;

    const sensor = await db.ioTSensor.findUnique({
      where: { id: sensorId },
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            type: true,
            serialNumber: true,
          },
        },
        alerts: {
          where: {
            status: 'ACTIVE',
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!sensor) {
      return errorResponse('Sensor not found', 404);
    }

    // Check mill access
    if (
      session.user.role !== Role.SYSTEM_ADMIN &&
      sensor.millId !== session.user.millId
    ) {
      return errorResponse('You do not have access to this sensor', 403);
    }

    // Get recent readings (last 24 hours)
    const recentReadings = await db.sensorReading.findMany({
      where: {
        sensorId,
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 100,
    });

    // Calculate statistics from recent readings
    const stats = {
      count: recentReadings.length,
      average: 0,
      min: 0,
      max: 0,
      latest: recentReadings[0]?.value || null,
    };

    if (recentReadings.length > 0) {
      const values = recentReadings.map((r) => r.value);
      stats.average = values.reduce((a, b) => a + b, 0) / values.length;
      stats.min = Math.min(...values);
      stats.max = Math.max(...values);
    }

    return successResponse({
      sensor,
      recentReadings: recentReadings.slice(0, 20), // Latest 20 for display
      stats,
    });
  } catch (error) {
    return handleApiError(error, 'fetching sensor details');
  }
}

/**
 * PATCH /api/iot/sensors/[id]
 * Update sensor configuration
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermissions(
      Permission.SENSOR_MANAGE,
      'sensor update'
    );

    const sensorId = params.id;
    const body = await request.json();
    const validatedData = updateSensorSchema.parse(body);

    const sensor = await db.ioTSensor.findUnique({
      where: { id: sensorId },
    });

    if (!sensor) {
      return errorResponse('Sensor not found', 404);
    }

    // Check mill access
    if (
      session.user.role !== Role.SYSTEM_ADMIN &&
      sensor.millId !== session.user.millId
    ) {
      return errorResponse('You do not have access to this sensor', 403);
    }

    const updated = await db.$transaction(async (tx) => {
      const result = await tx.ioTSensor.update({
        where: { id: sensorId },
        data: {
          ...validatedData,
          ...(validatedData.calibrationDate && {
            calibrationDate: new Date(validatedData.calibrationDate),
          }),
          ...(validatedData.nextCalibrationDue && {
            nextCalibrationDue: new Date(validatedData.nextCalibrationDue),
          }),
          ...(validatedData.metadata && {
            metadata: JSON.stringify(validatedData.metadata),
          }),
        },
        include: {
          equipment: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'SENSOR_UPDATE',
          resourceType: 'IOT_SENSOR',
          resourceId: sensorId,
          oldValues: JSON.stringify({
            status: sensor.status,
            minThreshold: sensor.minThreshold,
            maxThreshold: sensor.maxThreshold,
          }),
          newValues: JSON.stringify(validatedData),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      return result;
    });

    return successResponse({
      message: 'Sensor updated successfully',
      sensor: updated,
    });
  } catch (error) {
    return handleApiError(error, 'sensor update');
  }
}

/**
 * DELETE /api/iot/sensors/[id]
 * Soft delete a sensor
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermissions(
      Permission.SENSOR_MANAGE,
      'sensor deletion'
    );

    const sensorId = params.id;

    const sensor = await db.ioTSensor.findUnique({
      where: { id: sensorId },
    });

    if (!sensor) {
      return errorResponse('Sensor not found', 404);
    }

    // Check mill access
    if (
      session.user.role !== Role.SYSTEM_ADMIN &&
      sensor.millId !== session.user.millId
    ) {
      return errorResponse('You do not have access to this sensor', 403);
    }

    await db.$transaction(async (tx) => {
      // Soft delete
      await tx.ioTSensor.update({
        where: { id: sensorId },
        data: {
          isActive: false,
          status: 'INACTIVE',
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'SENSOR_DELETE',
          resourceType: 'IOT_SENSOR',
          resourceId: sensorId,
          oldValues: JSON.stringify({
            sensorId: sensor.sensorId,
            status: sensor.status,
          }),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });
    });

    return successResponse({
      message: 'Sensor deleted successfully',
    });
  } catch (error) {
    return handleApiError(error, 'sensor deletion');
  }
}
