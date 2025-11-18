import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
  requireAuth,
  getPaginationParams,
  getSortingParams,
} from '@/lib/api-helpers';
import { canAccessMillData, isMillStaff } from '@/lib/auth';

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
    const session = await requireAuth();

    // Get pagination and sorting params
    const { skip, take } = getPaginationParams(request);
    const { orderBy } = getSortingParams(request, 'scheduledDate');

    // Get filter params
    const { searchParams } = new URL(request.url);
    const millId = searchParams.get('millId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const type = searchParams.get('type');

    // Build where clause
    const where: any = {};

    // Role-based filtering
    if (isMillStaff(session.user.role)) {
      // Mill staff can only see tasks from their mill
      if (!session.user.millId) {
        return errorResponse('User is not assigned to a mill', 403);
      }
      where.millId = session.user.millId;
    } else if (millId) {
      // FWGA staff and admins can filter by mill
      where.millId = millId;
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Priority filter
    if (priority) {
      where.priority = priority;
    }

    // Type filter
    if (type) {
      where.type = type;
    }

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
    const session = await requireAuth();

    // Only mill staff can create tasks
    if (!isMillStaff(session.user.role) && session.user.role !== 'SYSTEM_ADMIN') {
      return errorResponse('Only mill staff can create maintenance tasks', 403);
    }

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

    // Check access permissions
    if (isMillStaff(session.user.role) && session.user.millId !== equipment.millId) {
      return errorResponse('You can only create tasks for your mill', 403);
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
