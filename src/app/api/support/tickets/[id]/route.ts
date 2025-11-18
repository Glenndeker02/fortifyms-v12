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

const updateTicketSchema = z.object({
  subject: z.string().min(5).optional(),
  description: z.string().min(20).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z
    .enum(['OPEN', 'IN_PROGRESS', 'WAITING_ON_USER', 'WAITING_ON_SUPPORT', 'RESOLVED', 'CLOSED'])
    .optional(),
});

/**
 * GET /api/support/tickets/[id]
 * Get ticket details with comments and attachments
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermissions(
      Permission.TICKET_VIEW,
      'ticket access'
    );

    const ticketId = params.id;

    const ticket = await db.supportTicket.findUnique({
      where: { id: ticketId },
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
        comments: {
          include: {
            author: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        attachments: {
          include: {
            uploader: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!ticket) {
      return errorResponse('Support ticket not found', 404);
    }

    // Check access: user must be creator, assignee, or have TICKET_VIEW_ALL permission
    const canViewAll = session.user.permissions?.includes(Permission.TICKET_VIEW_ALL) || false;
    const isInvolved =
      ticket.createdBy === session.user.id || ticket.assignedTo === session.user.id;

    if (!canViewAll && !isInvolved) {
      return errorResponse('You do not have access to this ticket', 403);
    }

    // Calculate SLA metrics
    const now = new Date();
    const slaMetrics = {
      firstResponseOverdue:
        ticket.firstResponseAt === null && ticket.firstResponseDue
          ? now > ticket.firstResponseDue
          : false,
      resolutionOverdue:
        ticket.resolvedAt === null && ticket.resolutionDue ? now > ticket.resolutionDue : false,
      firstResponseTime: ticket.firstResponseAt
        ? (ticket.firstResponseAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60)
        : null,
      resolutionTime: ticket.resolvedAt
        ? (ticket.resolvedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60)
        : null,
    };

    return successResponse({
      ticket,
      slaMetrics,
    });
  } catch (error) {
    return handleApiError(error, 'fetching ticket details');
  }
}

/**
 * PATCH /api/support/tickets/[id]
 * Update ticket details
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermissions(
      Permission.TICKET_VIEW,
      'ticket update'
    );

    const ticketId = params.id;
    const body = await request.json();
    const validatedData = updateTicketSchema.parse(body);

    const ticket = await db.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return errorResponse('Support ticket not found', 404);
    }

    // Check access
    const canViewAll = session.user.permissions?.includes(Permission.TICKET_VIEW_ALL) || false;
    const isCreator = ticket.createdBy === session.user.id;
    const isAssignee = ticket.assignedTo === session.user.id;

    if (!canViewAll && !isCreator && !isAssignee) {
      return errorResponse('You do not have access to update this ticket', 403);
    }

    // Regular users can only update certain fields
    if (!canViewAll) {
      if (validatedData.status && !['WAITING_ON_SUPPORT', 'RESOLVED'].includes(validatedData.status)) {
        return errorResponse('You can only mark tickets as WAITING_ON_SUPPORT or RESOLVED', 403);
      }
    }

    const updated = await db.$transaction(async (tx) => {
      const result = await tx.supportTicket.update({
        where: { id: ticketId },
        data: {
          ...validatedData,
          updatedAt: new Date(),
          ...(validatedData.status === 'RESOLVED' && !ticket.resolvedAt
            ? { resolvedAt: new Date() }
            : {}),
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
          assignedUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'TICKET_UPDATE',
          resourceType: 'SUPPORT_TICKET',
          resourceId: ticketId,
          oldValues: JSON.stringify({
            subject: ticket.subject,
            priority: ticket.priority,
            status: ticket.status,
          }),
          newValues: JSON.stringify(validatedData),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      return result;
    });

    return successResponse({
      message: 'Ticket updated successfully',
      ticket: updated,
    });
  } catch (error) {
    return handleApiError(error, 'ticket update');
  }
}
