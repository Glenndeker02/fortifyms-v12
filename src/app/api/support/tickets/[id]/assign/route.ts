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

const assignSchema = z.object({
  assignedTo: z.string().cuid('Invalid user ID'),
  notes: z.string().optional(),
});

/**
 * POST /api/support/tickets/[id]/assign
 * Assign ticket to a support agent
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermissions(
      Permission.TICKET_ASSIGN,
      'ticket assignment'
    );

    const ticketId = params.id;
    const body = await request.json();
    const validatedData = assignSchema.parse(body);

    const ticket = await db.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return errorResponse('Support ticket not found', 404);
    }

    // Validate assignee exists and is support staff
    const assignee = await db.user.findUnique({
      where: { id: validatedData.assignedTo },
    });

    if (!assignee) {
      return errorResponse('Assignee not found', 404);
    }

    // Check assignee is support staff or admin
    if (
      ![
        Role.SYSTEM_ADMIN,
        Role.FWGA_PROGRAM_MANAGER,
        Role.QUALITY_CONTROL_OFFICER,
      ].includes(assignee.role as Role)
    ) {
      return errorResponse('Can only assign to support staff or administrators', 400);
    }

    const result = await db.$transaction(async (tx) => {
      const updated = await tx.supportTicket.update({
        where: { id: ticketId },
        data: {
          assignedTo: validatedData.assignedTo,
          status: ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status,
          updatedAt: new Date(),
        },
        include: {
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

      // Create system comment about assignment
      await tx.ticketComment.create({
        data: {
          ticketId,
          authorId: session.user.id,
          content: `Ticket assigned to ${assignee.firstName} ${assignee.lastName}${
            validatedData.notes ? `\n\nNotes: ${validatedData.notes}` : ''
          }`,
          isInternal: true,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'TICKET_ASSIGN',
          resourceType: 'SUPPORT_TICKET',
          resourceId: ticketId,
          oldValues: JSON.stringify({ assignedTo: ticket.assignedTo }),
          newValues: JSON.stringify({
            assignedTo: validatedData.assignedTo,
            notes: validatedData.notes,
          }),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      // TODO: Send notification to assignee

      return updated;
    });

    return successResponse({
      message: 'Ticket assigned successfully',
      ticket: result,
    });
  } catch (error) {
    return handleApiError(error, 'ticket assignment');
  }
}
