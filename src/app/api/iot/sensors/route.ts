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
import { requirePermissions, buildPermissionWhere } from '@/lib/permissions-middleware';
import { Permission, Role } from '@/lib/rbac';

const createSensorSchema = z.object({
  equipmentId: z.string().cuid('Invalid equipment ID'),
  sensorType: z.enum([
    'TEMPERATURE',
    'HUMIDITY',
    'VIBRATION',
    'PRESSURE',
    'FLOW_RATE',
    'MOTOR_CURRENT',
    'BEARING_TEMPERATURE',
    'OIL_LEVEL',
    'DUST_LEVEL',
    'NOISE_LEVEL',
  ]),
  sensorId: z.string().min(3, 'Sensor ID must be at least 3 characters'),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  location: z.string().min(3, 'Location must be at least 3 characters'),
  minThreshold: z.number().optional(),
  maxThreshold: z.number().optional(),
  criticalMin: z.number().optional(),
  criticalMax: z.number().optional(),
  samplingInterval: z.number().int().positive().default(60), // seconds
  unit: z.string().default(''),
  calibrationDate: z.string().datetime().optional(),
  nextCalibrationDue: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * GET /api/iot/sensors
 * List IoT sensors with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requirePermissions(
      Permission.SENSOR_VIEW,
      'sensor access'
    );

    const { searchParams } = new URL(request.url);
    const { skip, take } = getPaginationParams(searchParams);
    const { sortBy, sortOrder } = getSortingParams(searchParams);

    const equipmentId = searchParams.get('equipmentId');
    const sensorType = searchParams.get('sensorType');
    const status = searchParams.get('status') as 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'FAULTY' | null;
    const hasAlerts = searchParams.get('hasAlerts') === 'true';

    // Build where clause with RBAC
    const permissionWhere = buildPermissionWhere(session, 'equipment');
    const where: any = {
      ...permissionWhere,
      isActive: true,
    };

    if (equipmentId) {
      where.equipmentId = equipmentId;
    }

    if (sensorType) {
      where.sensorType = sensorType;
    }

    if (status) {
      where.status = status;
    }

    if (hasAlerts) {
      where.alerts = {
        some: {
          status: 'ACTIVE',
        },
      };
    }

    // Build order by
    const orderBy: any = {};
    if (sortBy === 'lastReading') {
      orderBy.lastReadingAt = sortOrder || 'desc';
    } else if (sortBy === 'status') {
      orderBy.status = sortOrder;
    } else {
      orderBy.createdAt = sortOrder || 'desc';
    }

    const [sensors, total] = await Promise.all([
      db.ioTSensor.findMany({
        where,
        include: {
          equipment: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          _count: {
            select: {
              readings: true,
              alerts: {
                where: { status: 'ACTIVE' },
              },
            },
          },
        },
        orderBy,
        skip,
        take,
      }),
      db.ioTSensor.count({ where }),
    ]);

    return successResponse({
      sensors,
      pagination: {
        total,
        page: Math.floor(skip / take) + 1,
        pageSize: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    return handleApiError(error, 'fetching sensors');
  }
}

/**
 * POST /api/iot/sensors
 * Register a new IoT sensor
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requirePermissions(
      Permission.SENSOR_MANAGE,
      'sensor creation'
    );

    const body = await request.json();
    const validatedData = createSensorSchema.parse(body);

    // Validate equipment exists and user has access
    const equipment = await db.equipment.findUnique({
      where: { id: validatedData.equipmentId },
    });

    if (!equipment) {
      return errorResponse('Equipment not found', 404);
    }

    // Check mill access
    if (
      session.user.role !== Role.SYSTEM_ADMIN &&
      equipment.millId !== session.user.millId
    ) {
      return errorResponse('You do not have access to this equipment', 403);
    }

    // Check sensor ID uniqueness
    const existing = await db.ioTSensor.findUnique({
      where: { sensorId: validatedData.sensorId },
    });

    if (existing) {
      return errorResponse('A sensor with this ID already exists', 400);
    }

    const sensor = await db.$transaction(async (tx) => {
      const created = await tx.ioTSensor.create({
        data: {
          equipmentId: validatedData.equipmentId,
          millId: equipment.millId,
          sensorType: validatedData.sensorType,
          sensorId: validatedData.sensorId,
          manufacturer: validatedData.manufacturer,
          model: validatedData.model,
          location: validatedData.location,
          minThreshold: validatedData.minThreshold,
          maxThreshold: validatedData.maxThreshold,
          criticalMin: validatedData.criticalMin,
          criticalMax: validatedData.criticalMax,
          samplingInterval: validatedData.samplingInterval,
          unit: validatedData.unit,
          calibrationDate: validatedData.calibrationDate
            ? new Date(validatedData.calibrationDate)
            : null,
          nextCalibrationDue: validatedData.nextCalibrationDue
            ? new Date(validatedData.nextCalibrationDue)
            : null,
          metadata: validatedData.metadata ? JSON.stringify(validatedData.metadata) : null,
          status: 'ACTIVE',
          isActive: true,
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
          action: 'SENSOR_CREATE',
          resourceType: 'IOT_SENSOR',
          resourceId: created.id,
          newValues: JSON.stringify({
            sensorId: validatedData.sensorId,
            sensorType: validatedData.sensorType,
            equipmentId: validatedData.equipmentId,
          }),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      return created;
    });

    return successResponse(
      {
        message: 'Sensor registered successfully',
        sensor,
      },
      201
    );
  } catch (error) {
    return handleApiError(error, 'sensor creation');
  }
}
