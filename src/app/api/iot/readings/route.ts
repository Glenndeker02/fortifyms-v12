import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import {
  successResponse,
  errorResponse,
  handleApiError,
  getPaginationParams,
} from '@/lib/api-helpers';
import { requirePermissions } from '@/lib/permissions-middleware';
import { Permission, Role } from '@/lib/rbac';

const createReadingSchema = z.object({
  sensorId: z.string().cuid('Invalid sensor ID'),
  value: z.number(),
  timestamp: z.string().datetime().optional(),
  quality: z.number().min(0).max(100).optional(), // Signal quality percentage
  metadata: z.record(z.any()).optional(),
});

const bulkReadingsSchema = z.object({
  readings: z.array(createReadingSchema).min(1).max(1000),
});

/**
 * GET /api/iot/readings
 * Query sensor readings with time-based filtering
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requirePermissions(
      Permission.SENSOR_DATA_VIEW,
      'sensor data access'
    );

    const { searchParams } = new URL(request.url);
    const { skip, take } = getPaginationParams(searchParams);

    const sensorId = searchParams.get('sensorId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const aggregation = searchParams.get('aggregation') as 'raw' | 'hourly' | 'daily' | null;

    if (!sensorId) {
      return errorResponse('sensorId parameter is required', 400);
    }

    // Verify sensor exists and user has access
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

    // Build time range filter
    const where: any = { sensorId };
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    if (aggregation === 'raw' || !aggregation) {
      // Return raw readings
      const [readings, total] = await Promise.all([
        db.sensorReading.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          skip,
          take,
        }),
        db.sensorReading.count({ where }),
      ]);

      return successResponse({
        readings,
        pagination: {
          total,
          page: Math.floor(skip / take) + 1,
          pageSize: take,
          totalPages: Math.ceil(total / take),
        },
      });
    } else {
      // Aggregated data - use raw SQL for performance
      // This is a simplified version; production would use time-series database
      const readings = await db.sensorReading.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: 10000, // Limit for aggregation
      });

      // Group by hour or day
      const groupedData: { [key: string]: number[] } = {};
      readings.forEach((reading) => {
        const date = new Date(reading.timestamp);
        let key: string;
        if (aggregation === 'hourly') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
            date.getDate()
          ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
        } else {
          // daily
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
            date.getDate()
          ).padStart(2, '0')}`;
        }

        if (!groupedData[key]) {
          groupedData[key] = [];
        }
        groupedData[key].push(reading.value);
      });

      const aggregatedReadings = Object.entries(groupedData).map(([timestamp, values]) => ({
        timestamp,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length,
      }));

      return successResponse({
        readings: aggregatedReadings,
        aggregation,
        total: aggregatedReadings.length,
      });
    }
  } catch (error) {
    return handleApiError(error, 'fetching sensor readings');
  }
}

/**
 * POST /api/iot/readings
 * Ingest sensor readings (bulk or single)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requirePermissions(
      Permission.SENSOR_MANAGE,
      'sensor data ingestion'
    );

    const body = await request.json();

    // Support both single reading and bulk
    let readings: z.infer<typeof createReadingSchema>[];
    if (Array.isArray(body.readings)) {
      const validatedData = bulkReadingsSchema.parse(body);
      readings = validatedData.readings;
    } else {
      const validatedData = createReadingSchema.parse(body);
      readings = [validatedData];
    }

    // Verify all sensors exist and user has access
    const sensorIds = [...new Set(readings.map((r) => r.sensorId))];
    const sensors = await db.ioTSensor.findMany({
      where: { id: { in: sensorIds } },
    });

    if (sensors.length !== sensorIds.length) {
      return errorResponse('One or more sensors not found', 404);
    }

    // Check mill access
    if (session.user.role !== Role.SYSTEM_ADMIN) {
      const unauthorized = sensors.some((s) => s.millId !== session.user.millId);
      if (unauthorized) {
        return errorResponse('You do not have access to one or more sensors', 403);
      }
    }

    const result = await db.$transaction(async (tx) => {
      // Create readings
      const created = await Promise.all(
        readings.map((reading) =>
          tx.sensorReading.create({
            data: {
              sensorId: reading.sensorId,
              value: reading.value,
              timestamp: reading.timestamp ? new Date(reading.timestamp) : new Date(),
              quality: reading.quality,
              metadata: reading.metadata ? JSON.stringify(reading.metadata) : null,
            },
          })
        )
      );

      // Update sensor last reading timestamp
      await Promise.all(
        sensorIds.map((sensorId) =>
          tx.ioTSensor.update({
            where: { id: sensorId },
            data: { lastReadingAt: new Date() },
          })
        )
      );

      // Check thresholds and create alerts
      for (const reading of readings) {
        const sensor = sensors.find((s) => s.id === reading.sensorId);
        if (!sensor) continue;

        let severity: 'INFO' | 'WARNING' | 'CRITICAL' | null = null;
        let message = '';

        // Critical thresholds
        if (
          (sensor.criticalMax !== null && reading.value > sensor.criticalMax) ||
          (sensor.criticalMin !== null && reading.value < sensor.criticalMin)
        ) {
          severity = 'CRITICAL';
          message = `Critical threshold exceeded: ${reading.value}${sensor.unit || ''}`;
        }
        // Warning thresholds
        else if (
          (sensor.maxThreshold !== null && reading.value > sensor.maxThreshold) ||
          (sensor.minThreshold !== null && reading.value < sensor.minThreshold)
        ) {
          severity = 'WARNING';
          message = `Threshold exceeded: ${reading.value}${sensor.unit || ''}`;
        }

        // Create alert if threshold exceeded
        if (severity) {
          // Check if there's already an active alert for this condition
          const existingAlert = await tx.sensorAlert.findFirst({
            where: {
              sensorId: reading.sensorId,
              status: 'ACTIVE',
              severity,
            },
          });

          if (!existingAlert) {
            await tx.sensorAlert.create({
              data: {
                sensorId: reading.sensorId,
                equipmentId: sensor.equipmentId,
                millId: sensor.millId,
                severity,
                message,
                detectedValue: reading.value,
                threshold:
                  severity === 'CRITICAL'
                    ? sensor.criticalMax || sensor.criticalMin || 0
                    : sensor.maxThreshold || sensor.minThreshold || 0,
                status: 'ACTIVE',
              },
            });
          }
        }
      }

      return created;
    });

    return successResponse(
      {
        message: `${result.length} reading(s) ingested successfully`,
        count: result.length,
      },
      201
    );
  } catch (error) {
    return handleApiError(error, 'sensor data ingestion');
  }
}
