import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
  getPaginationParams,
  getSortingParams,
} from '@/lib/api-helpers';
import { requirePermissions, buildPermissionWhere } from '@/lib/permissions-middleware';
import { Permission, isMillStaff, Role } from '@/lib/rbac';

/**
 * GET /api/maintenance/tasks
 * List maintenance tasks with pagination and filtering
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - sortBy: Field to sort by (default: scheduledDate)
 * - sortOrder: Sort direction (asc/desc, default: asc)
 * - millId: Filter by mill ID
 * - status: Filter by status
 * - priority: Filter by priority
 * - type: Filter by maintenance type
 *
 * Reference: TODO.md Phase 2 - Maintenance Module
 */
export async function GET(request: NextRequest) {
  try {
    // Check permission and get session
    const session = await requirePermissions(Permission.MAINTENANCE_VIEW, 'maintenance tasks');

    // Get pagination and sorting params
    const { skip, take } = getPaginationParams(request);
    const { orderBy } = getSortingParams(request, 'scheduledDate');

    // Get filter params
    const { searchParams } = new URL(request.url);
    const millId = searchParams.get('millId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const type = searchParams.get('type');

    // Build base where clause
    const baseWhere: any = {};

    // Optional mill filter (for FWGA staff viewing specific mills)
    if (millId) {
      baseWhere.millId = millId;
    }

    // Status filter
    if (status) {
      baseWhere.status = status;
    }

    // Priority filter
    if (priority) {
      baseWhere.priority = priority;
    }

    // Type filter
    if (type) {
      baseWhere.type = type;
    }

    // Apply permission-based filtering (tenant/mill isolation)
    const where = buildPermissionWhere(session, baseWhere);

    // Get maintenance tasks with related data
    const [tasks, total] = await Promise.all([
      db.maintenanceTask.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          equipment: {
            select: {
              id: true,
              name: true,
              type: true,
              serialNumber: true,
            },
          },
          mill: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      db.maintenanceTask.count({ where }),
    ]);

    return successResponse({
      tasks,
      pagination: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/maintenance/tasks
 * Create a new maintenance task
 */
export async function POST(request: NextRequest) {
  try {
    // Check permission and get session
    const session = await requirePermissions(Permission.MAINTENANCE_CREATE, 'maintenance tasks');

    const body = await request.json();

    const {
      equipmentId,
      assignedTo,
      type,
      scheduledDate,
      priority,
      title,
      description,
      estimatedDuration,
    } = body;

    if (!equipmentId || !assignedTo || !type) {
      return errorResponse('Equipment, assignee, and type are required', 400);
    }

    // Get equipment to verify mill access
    const equipment = await db.equipment.findUnique({
      where: { id: equipmentId },
    });

    if (!equipment) {
      return errorResponse('Equipment not found', 404);
    }

    // Check mill access for mill staff (FWGA can create for any mill)
    if (isMillStaff(session.user.role)) {
      if (session.user.millId !== equipment.millId) {
        return errorResponse('You can only create tasks for your mill', 403);
      }
    }

    // Create maintenance task
    const task = await db.maintenanceTask.create({
      data: {
        equipmentId,
        millId: equipment.millId,
        assignedTo,
        createdBy: session.user.id,
        type,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
        scheduledTime: scheduledDate ? new Date(scheduledDate) : new Date(),
        priority: priority || 'MEDIUM',
        title,
        description,
        estimatedDuration,
        status: 'SCHEDULED',
      },
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        mill: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'MAINTENANCE_TASK_CREATE',
        resourceType: 'MAINTENANCE_TASK',
        resourceId: task.id,
        newValues: task,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return successResponse(task, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
