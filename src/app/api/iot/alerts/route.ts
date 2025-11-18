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

/**
 * GET /api/iot/alerts
 * List sensor alerts with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requirePermissions(
      Permission.SENSOR_ALERT_VIEW,
      'alert access'
    );

    const { searchParams } = new URL(request.url);
    const { skip, take } = getPaginationParams(searchParams);
    const { sortBy, sortOrder } = getSortingParams(searchParams);

    const sensorId = searchParams.get('sensorId');
    const equipmentId = searchParams.get('equipmentId');
    const severity = searchParams.get('severity') as 'INFO' | 'WARNING' | 'CRITICAL' | null;
    const status = searchParams.get('status') as 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | null;

    // Build where clause with RBAC
    const permissionWhere = buildPermissionWhere(session, 'mill');
    const where: any = {
      ...permissionWhere,
    };

    if (sensorId) {
      where.sensorId = sensorId;
    }

    if (equipmentId) {
      where.equipmentId = equipmentId;
    }

    if (severity) {
      where.severity = severity;
    }

    if (status) {
      where.status = status;
    }

    // Build order by
    const orderBy: any = {};
    if (sortBy === 'severity') {
      // Custom severity order: CRITICAL > WARNING > INFO
      orderBy.severity = sortOrder;
    } else {
      orderBy.createdAt = sortOrder || 'desc';
    }

    const [alerts, total] = await Promise.all([
      db.sensorAlert.findMany({
        where,
        include: {
          sensor: {
            select: {
              id: true,
              sensorId: true,
              sensorType: true,
              location: true,
            },
          },
          equipment: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          acknowledgedByUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          resolvedByUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy,
        skip,
        take,
      }),
      db.sensorAlert.count({ where }),
    ]);

    // Get summary statistics
    const stats = await db.sensorAlert.groupBy({
      by: ['severity', 'status'],
      where: permissionWhere,
      _count: true,
    });

    return successResponse({
      alerts,
      pagination: {
        total,
        page: Math.floor(skip / take) + 1,
        pageSize: take,
        totalPages: Math.ceil(total / take),
      },
      stats,
    });
  } catch (error) {
    return handleApiError(error, 'fetching alerts');
  }
}
