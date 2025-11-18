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

const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty'),
  isInternal: z.boolean().default(false),
  attachmentUrls: z.array(z.string().url()).default([]),
});

/**
 * POST /api/support/tickets/[id]/comments
 * Add a comment to a ticket
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermissions(
      Permission.TICKET_VIEW,
      'adding ticket comment'
    );

    const ticketId = params.id;
    const body = await request.json();
    const validatedData = createCommentSchema.parse(body);

    const ticket = await db.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return errorResponse('Support ticket not found', 404);
    }

    // Check access
    const canViewAll = session.user.permissions?.includes(Permission.TICKET_VIEW_ALL) || false;
    const isInvolved =
      ticket.createdBy === session.user.id || ticket.assignedTo === session.user.id;

    if (!canViewAll && !isInvolved) {
      return errorResponse('You do not have access to this ticket', 403);
    }

    // Only support staff can create internal comments
    if (validatedData.isInternal && !canViewAll) {
      return errorResponse('Only support staff can create internal comments', 403);
    }

    const result = await db.$transaction(async (tx) => {
      const comment = await tx.ticketComment.create({
        data: {
          ticketId,
          authorId: session.user.id,
          content: validatedData.content,
          isInternal: validatedData.isInternal,
        },
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
      });

      // Create attachments if provided
      if (validatedData.attachmentUrls.length > 0) {
        await Promise.all(
          validatedData.attachmentUrls.map((url) =>
            tx.ticketAttachment.create({
              data: {
                ticketId,
                fileName: url.split('/').pop() || 'attachment',
                fileUrl: url,
                uploadedBy: session.user.id,
              },
            })
          )
        );
      }

      // Update ticket's updated timestamp
      await tx.supportTicket.update({
        where: { id: ticketId },
        data: { updatedAt: new Date() },
      });

      // Set first response time if this is the first support response
      if (canViewAll && !ticket.firstResponseAt) {
        await tx.supportTicket.update({
          where: { id: ticketId },
          data: {
            firstResponseAt: new Date(),
            status: 'IN_PROGRESS',
          },
        });
      }

      // Auto-update status based on who commented
      if (canViewAll && ticket.status === 'WAITING_ON_SUPPORT') {
        await tx.supportTicket.update({
          where: { id: ticketId },
          data: { status: 'WAITING_ON_USER' },
        });
      } else if (!canViewAll && ticket.status === 'WAITING_ON_USER') {
        await tx.supportTicket.update({
          where: { id: ticketId },
          data: { status: 'WAITING_ON_SUPPORT' },
        });
      }

      // TODO: Send notification to other participants

      return comment;
    });

    return successResponse(
      {
        message: 'Comment added successfully',
        comment: result,
      },
      201
    );
  } catch (error) {
    return handleApiError(error, 'adding ticket comment');
  }
}
