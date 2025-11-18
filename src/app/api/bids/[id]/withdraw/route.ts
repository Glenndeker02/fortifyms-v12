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

const withdrawSchema = z.object({
  reason: z.string().min(10, 'Withdrawal reason must be at least 10 characters'),
});

/**
 * POST /api/bids/[id]/withdraw
 * Withdraw a submitted bid
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermissions(Permission.BID_WITHDRAW, 'bid withdrawal');
    const bidId = params.id;

    // Parse request body
    const body = await request.json();
    const { reason } = withdrawSchema.parse(body);

    // Get bid with RFP
    const bid = await db.bid.findUnique({
      where: { id: bidId },
      include: {
        rfp: true,
      },
    });

    if (!bid) {
      return errorResponse('Bid not found', 404);
    }

    // Check ownership
    if (bid.millId !== session.user.millId) {
      return errorResponse('You can only withdraw your own mill\'s bids', 403);
    }

    // Check status - can only withdraw DRAFT, SUBMITTED, or SHORTLISTED bids
    if (!['DRAFT', 'SUBMITTED', 'SHORTLISTED'].includes(bid.status)) {
      return errorResponse(
        `Cannot withdraw bid with status ${bid.status}`,
        400
      );
    }

    // Check if bid has been awarded - cannot withdraw awarded bids
    if (bid.rfp.awardedBidId === bidId) {
      return errorResponse('Cannot withdraw an awarded bid', 400);
    }

    // Withdraw bid
    const result = await db.$transaction(async (tx) => {
      const withdrawn = await tx.bid.update({
        where: { id: bidId },
        data: {
          status: 'WITHDRAWN',
          withdrawnAt: new Date(),
          withdrawalReason: reason,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'BID_WITHDRAW',
          resourceType: 'BID',
          resourceId: bidId,
          oldValues: JSON.stringify({ status: bid.status }),
          newValues: JSON.stringify({
            status: 'WITHDRAWN',
            withdrawnAt: new Date(),
            withdrawalReason: reason,
          }),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      // TODO: Send notification to buyer about withdrawn bid

      return withdrawn;
    });

    return successResponse({
      message: 'Bid withdrawn successfully',
      bidId: result.id,
      status: result.status,
      withdrawnAt: result.withdrawnAt,
    });
  } catch (error) {
    return handleApiError(error, 'bid withdrawal');
  }
}
