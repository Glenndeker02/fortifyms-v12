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

const createTicketSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  category: z.enum([
    'TECHNICAL',
    'BILLING',
    'ACCOUNT',
    'PROCUREMENT',
    'LOGISTICS',
    'MILL_OPERATIONS',
    'OTHER',
  ]),
  relatedResourceType: z.enum(['RFP', 'BID', 'ORDER', 'TRIP', 'SENSOR', 'OTHER']).optional(),
  relatedResourceId: z.string().cuid().optional(),
  attachmentUrls: z.array(z.string().url()).default([]),
});

/**
 * GET /api/support/tickets
 * List support tickets with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requirePermissions(
      Permission.TICKET_VIEW,
      'ticket access'
    );

    const { searchParams } = new URL(request.url);
    const { skip, take } = getPaginationParams(searchParams);
    const { sortBy, sortOrder } = getSortingParams(searchParams);

    const status = searchParams.get('status') as
      | 'OPEN'
      | 'IN_PROGRESS'
      | 'WAITING_ON_USER'
      | 'WAITING_ON_SUPPORT'
      | 'RESOLVED'
      | 'CLOSED'
      | null;
    const priority = searchParams.get('priority') as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | null;
    const category = searchParams.get('category');
    const assignedTo = searchParams.get('assignedTo');
    const query = searchParams.get('q');

    // Build where clause
    const where: any = {};

    // Users can only see their own tickets unless they have TICKET_VIEW_ALL permission
    const canViewAll = session.user.permissions?.includes(Permission.TICKET_VIEW_ALL) || false;
    if (!canViewAll) {
      where.createdBy = session.user.id;
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (category) {
      where.category = category;
    }

    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    // Search in subject and description
    if (query) {
      where.OR = [
        { subject: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { ticketNumber: { contains: query, mode: 'insensitive' } },
      ];
    }

    // Build order by
    const orderBy: any = {};
    if (sortBy === 'priority') {
      // Custom priority order: URGENT > HIGH > MEDIUM > LOW
      orderBy.priority = sortOrder;
    } else if (sortBy === 'updated') {
      orderBy.updatedAt = sortOrder;
    } else {
      orderBy.createdAt = sortOrder || 'desc';
    }

    const [tickets, total] = await Promise.all([
      db.supportTicket.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          assignedUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              comments: true,
              attachments: true,
            },
          },
        },
        orderBy,
        skip,
        take,
      }),
      db.supportTicket.count({ where }),
    ]);

    return successResponse({
      tickets,
      pagination: {
        total,
        page: Math.floor(skip / take) + 1,
        pageSize: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    return handleApiError(error, 'fetching support tickets');
  }
}

/**
 * POST /api/support/tickets
 * Create a new support ticket
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requirePermissions(
      Permission.TICKET_CREATE,
      'ticket creation'
    );

    const body = await request.json();
    const validatedData = createTicketSchema.parse(body);

    // Generate ticket number: TICKET-YYYYMM-####
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const count = await db.supportTicket.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-${month}-01`),
        },
      },
    });
    const ticketNumber = `TICKET-${year}${month}-${String(count + 1).padStart(4, '0')}`;

    // Calculate SLA deadlines based on priority
    const now = new Date();
    const slaHours = {
      URGENT: { firstResponse: 1, resolution: 4 },
      HIGH: { firstResponse: 2, resolution: 8 },
      MEDIUM: { firstResponse: 8, resolution: 24 },
      LOW: { firstResponse: 24, resolution: 72 },
    };

    const sla = slaHours[validatedData.priority];
    const firstResponseDue = new Date(now.getTime() + sla.firstResponse * 60 * 60 * 1000);
    const resolutionDue = new Date(now.getTime() + sla.resolution * 60 * 60 * 1000);

    const ticket = await db.$transaction(async (tx) => {
      const created = await tx.supportTicket.create({
        data: {
          ticketNumber,
          subject: validatedData.subject,
          description: validatedData.description,
          priority: validatedData.priority,
          category: validatedData.category,
          relatedResourceType: validatedData.relatedResourceType,
          relatedResourceId: validatedData.relatedResourceId,
          status: 'OPEN',
          createdBy: session.user.id,
          firstResponseDue,
          resolutionDue,
        },
        include: {
          creator: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Create attachments if provided
      if (validatedData.attachmentUrls.length > 0) {
        await Promise.all(
          validatedData.attachmentUrls.map((url) =>
            tx.ticketAttachment.create({
              data: {
                ticketId: created.id,
                fileName: url.split('/').pop() || 'attachment',
                fileUrl: url,
                uploadedBy: session.user.id,
              },
            })
          )
        );
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'TICKET_CREATE',
          resourceType: 'SUPPORT_TICKET',
          resourceId: created.id,
          newValues: JSON.stringify({
            ticketNumber,
            subject: validatedData.subject,
            priority: validatedData.priority,
            category: validatedData.category,
          }),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      // TODO: Send notification to support team
      // TODO: Auto-assign based on category and availability

      return created;
    });

    return successResponse(
      {
        message: 'Support ticket created successfully',
        ticket,
      },
      201
    );
  } catch (error) {
    return handleApiError(error, 'ticket creation');
  }
}
