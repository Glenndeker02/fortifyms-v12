import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
  requireAuth,
  getPaginationParams,
} from '@/lib/api-helpers';

/**
 * GET /api/action-items
 * List action items for the current user
 *
 * Query parameters:
 * - page, limit: Pagination
 * - status: Filter by status (PENDING, IN_PROGRESS, COMPLETED, OVERDUE)
 * - priority: Filter by priority
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { skip, take } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    // Build where clause
    const where: any = {
      assignedToId: session.user.id,
    };

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    // Get current date for overdue calculation
    const now = new Date();

    const [actionItems, total] = await Promise.all([
      db.actionItem.findMany({
        where,
        skip,
        take,
        orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
        include: {
          alert: {
            select: {
              id: true,
              type: true,
              title: true,
              severity: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      db.actionItem.count({ where }),
    ]);

    // Calculate overdue items
    const overdueCount = actionItems.filter(
      (item) => item.status !== 'COMPLETED' && item.dueDate < now
    ).length;

    return successResponse({
      actionItems: actionItems.map((item) => ({
        ...item,
        isOverdue: item.status !== 'COMPLETED' && item.dueDate < now,
      })),
      pagination: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        pages: Math.ceil(total / take),
      },
      overdueCount,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/action-items
 * Create a new action item
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const {
      title,
      description,
      priority,
      dueDate,
      assignedToId,
      alertId,
      resourceType,
      resourceId,
    } = body;

    if (!title || !dueDate || !assignedToId) {
      return errorResponse('Title, due date, and assignee are required', 400);
    }

    // Create action item
    const actionItem = await db.actionItem.create({
      data: {
        title,
        description,
        priority: priority || 'MEDIUM',
        status: 'PENDING',
        dueDate: new Date(dueDate),
        assignedToId,
        alertId,
        resourceType,
        resourceId,
        createdBy: session.user.id,
      },
      include: {
        alert: {
          select: {
            id: true,
            type: true,
            title: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create notification for assignee
    await db.alert.create({
      data: {
        type: 'ACTION_ITEM_ASSIGNED',
        title: `New Action Item: ${title}`,
        message: description || 'You have been assigned a new action item',
        severity: 'MEDIUM',
        category: 'PRODUCTION',
        status: 'PENDING',
        recipientId: assignedToId,
        resourceType: 'ACTION_ITEM',
        resourceId: actionItem.id,
        metadata: {
          actionItemId: actionItem.id,
          dueDate: dueDate,
        },
        createdBy: session.user.id,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'ACTION_ITEM_CREATE',
        resourceType: 'ACTION_ITEM',
        resourceId: actionItem.id,
        newValues: actionItem,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return successResponse(actionItem, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
