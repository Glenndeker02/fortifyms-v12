import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import {
  successResponse,
  errorResponse,
  handleApiError,
} from '@/lib/api-helpers';
import { requirePermissions } from '@/lib/permissions-middleware';
import { Permission } from '@/lib/rbac';

const closeSchema = z.object({
  resolution: z.string().min(10, 'Resolution notes must be at least 10 characters'),
  satisfactionRating: z.number().int().min(1).max(5).optional(),
});

/**
 * POST /api/support/tickets/[id]/close
 * Close a support ticket
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermissions(
      Permission.TICKET_RESOLVE,
      'ticket closure'
    );

    const ticketId = params.id;
    const body = await request.json();
    const validatedData = closeSchema.parse(body);

    const ticket = await db.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return errorResponse('Support ticket not found', 404);
    }

    // Check access
    const canViewAll = session.user.permissions?.includes(Permission.TICKET_VIEW_ALL) || false;
    const isCreator = ticket.createdBy === session.user.id;

    if (!canViewAll && !isCreator) {
      return errorResponse('Only support staff or ticket creator can close tickets', 403);
    }

    // Ticket must be in RESOLVED status before closing (or support staff can force close)
    if (ticket.status !== 'RESOLVED' && !canViewAll) {
      return errorResponse('Ticket must be resolved before closing', 400);
    }

    const result = await db.$transaction(async (tx) => {
      const updated = await tx.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: 'CLOSED',
          resolution: validatedData.resolution,
          satisfactionRating: validatedData.satisfactionRating,
          closedAt: new Date(),
          closedBy: session.user.id,
          ...(ticket.resolvedAt === null ? { resolvedAt: new Date() } : {}),
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

      // Create system comment about closure
      await tx.ticketComment.create({
        data: {
          ticketId,
          authorId: session.user.id,
          content: `Ticket closed.\n\nResolution: ${validatedData.resolution}${
            validatedData.satisfactionRating
              ? `\n\nSatisfaction Rating: ${validatedData.satisfactionRating}/5`
              : ''
          }`,
          isInternal: false,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'TICKET_CLOSE',
          resourceType: 'SUPPORT_TICKET',
          resourceId: ticketId,
          oldValues: JSON.stringify({ status: ticket.status }),
          newValues: JSON.stringify({
            status: 'CLOSED',
            resolution: validatedData.resolution,
            satisfactionRating: validatedData.satisfactionRating,
          }),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      return updated;
    });

    return successResponse({
      message: 'Ticket closed successfully',
      ticket: result,
    });
  } catch (error) {
    return handleApiError(error, 'ticket closure');
  }
}
