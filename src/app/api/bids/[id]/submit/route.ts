import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
} from '@/lib/api-helpers';
import { requirePermissions } from '@/lib/permissions-middleware';
import { Permission } from '@/lib/rbac';

/**
 * POST /api/bids/[id]/submit
 * Submit a draft bid for evaluation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermissions(Permission.BID_CREATE, 'bid submission');
    const bidId = params.id;

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
      return errorResponse('You can only submit your own mill\'s bids', 403);
    }

    // Check status - must be DRAFT
    if (bid.status !== 'DRAFT') {
      return errorResponse(
        `Cannot submit bid with status ${bid.status}. Only draft bids can be submitted.`,
        400
      );
    }

    // Check RFP is still open
    if (bid.rfp.status !== 'OPEN') {
      return errorResponse('RFP is not open for bidding', 400);
    }

    // Check bid deadline hasn't passed
    if (new Date(bid.rfp.bidDeadline) <= new Date()) {
      return errorResponse('Bid deadline has passed', 400);
    }

    // Validate bid is complete (required fields)
    const missingFields: string[] = [];
    if (!bid.unitPrice) missingFields.push('unit price');
    if (!bid.priceValidity) missingFields.push('price validity');
    if (!bid.deliveryMethod) missingFields.push('delivery method');
    if (!bid.leadTime) missingFields.push('lead time');

    if (missingFields.length > 0) {
      return errorResponse(
        `Bid is incomplete. Missing: ${missingFields.join(', ')}`,
        400
      );
    }

    // Submit bid
    const result = await db.$transaction(async (tx) => {
      const submitted = await tx.bid.update({
        where: { id: bidId },
        data: {
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'BID_SUBMIT',
          resourceType: 'BID',
          resourceId: bidId,
          oldValues: JSON.stringify({ status: bid.status }),
          newValues: JSON.stringify({ status: 'SUBMITTED', submittedAt: new Date() }),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      // TODO: Send notification to buyer about new bid

      return submitted;
    });

    return successResponse({
      message: 'Bid submitted successfully',
      bidId: result.id,
      status: result.status,
      submittedAt: result.submittedAt,
    });
  } catch (error) {
    return handleApiError(error, 'bid submission');
  }
}
