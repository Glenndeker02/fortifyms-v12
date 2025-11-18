import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
  requireAuth,
  getPaginationParams,
} from '@/lib/api-helpers';
import { AlertType, AlertSeverity, AlertStatus, getAlertConfig } from '@/lib/alerts';

/**
 * GET /api/alerts
 * List alerts for the current user
 *
 * Query parameters:
 * - page, limit: Pagination
 * - status: Filter by status
 * - severity: Filter by severity
 * - category: Filter by category
 * - unreadOnly: Show only unread alerts
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { skip, take } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const category = searchParams.get('category');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    // Build where clause
    const where: any = {
      OR: [
        { recipientId: session.user.id },
        {
          recipientRole: session.user.role,
          millId: session.user.millId || undefined,
        },
      ],
    };

    if (status) {
      where.status = status;
    }

    if (severity) {
      where.severity = severity;
    }

    if (category) {
      where.category = category;
    }

    if (unreadOnly) {
      where.readAt = null;
    }

    const [alerts, total, unreadCount] = await Promise.all([
      db.alert.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          recipient: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          actionItem: {
            select: {
              id: true,
              status: true,
              dueDate: true,
            },
          },
        },
      }),
      db.alert.count({ where }),
      db.alert.count({
        where: {
          ...where,
          readAt: null,
        },
      }),
    ]);

    return successResponse({
      alerts,
      pagination: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        pages: Math.ceil(total / take),
      },
      unreadCount,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/alerts
 * Create a new alert
 *
 * This endpoint is typically called by system triggers, not directly by users
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const {
      type,
      title,
      message,
      severity,
      category,
      recipientId,
      recipientRole,
      millId,
      resourceType,
      resourceId,
      metadata,
    } = body;

    if (!type || !title || !message) {
      return errorResponse('Alert type, title, and message are required', 400);
    }

    // Get alert configuration
    const config = getAlertConfig(type as AlertType);

    // Create alert
    const alert = await db.alert.create({
      data: {
        type,
        title,
        message,
        severity: severity || config.severity,
        category: category || config.category,
        status: AlertStatus.PENDING,
        recipientId,
        recipientRole,
        millId,
        resourceType,
        resourceId,
        metadata: metadata || {},
        createdBy: session.user.id,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'ALERT_CREATE',
        resourceType: 'ALERT',
        resourceId: alert.id,
        newValues: alert,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    // TODO: Trigger notification delivery (push, SMS, email)
    // This would be handled by a background job/queue in production

    return successResponse(alert, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
