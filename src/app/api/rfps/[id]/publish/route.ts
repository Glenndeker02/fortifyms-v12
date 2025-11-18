import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
} from '@/lib/api-helpers';
import { requirePermissions } from '@/lib/permissions-middleware';
import { Permission, Role } from '@/lib/rbac';

/**
 * POST /api/rfps/[id]/publish
 * Publish an RFP to make it visible to mills
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check permission
    const session = await requirePermissions(
      Permission.RFP_PUBLISH,
      'RFP publishing'
    );

    const rfpId = params.id;

    // Get RFP
    const rfp = await db.rFP.findUnique({
      where: { id: rfpId },
      include: {
        buyer: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!rfp) {
      return errorResponse('RFP not found', 404);
    }

    // Check ownership (buyers can only publish their own RFPs)
    if (
      session.user.role === Role.INSTITUTIONAL_BUYER &&
      rfp.buyer.userId !== session.user.id
    ) {
      return errorResponse('You do not have permission to publish this RFP', 403);
    }

    // Check if already published
    if (rfp.status !== 'DRAFT') {
      return errorResponse(`RFP is already ${rfp.status.toLowerCase()}`, 400);
    }

    // Validate RFP is complete
    if (!rfp.bidDeadline || !rfp.deliveryLocations) {
      return errorResponse(
        'RFP must have bid deadline and delivery locations to be published',
        400
      );
    }

    // Check bid deadline is in the future
    if (new Date(rfp.bidDeadline) <= new Date()) {
      return errorResponse('Bid deadline must be in the future', 400);
    }

    // Publish RFP
    const result = await db.$transaction(async (tx) => {
      const published = await tx.rFP.update({
        where: { id: rfpId },
        data: {
          status: 'OPEN',
          openDate: new Date(),
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'RFP_PUBLISH',
          resourceType: 'RFP',
          resourceId: rfpId,
          oldValues: JSON.stringify({ status: rfp.status }),
          newValues: JSON.stringify({ status: 'OPEN' }),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      // TODO: Send notifications to matching mills
      // This would involve:
      // 1. Finding mills that match criteria (geographic, certification, capacity)
      // 2. Creating alert notifications for those mills
      // 3. Sending email/SMS notifications

      return published;
    });

    return successResponse({
      message: 'RFP published successfully',
      rfpId: result.id,
      status: result.status,
      openDate: result.openDate,
    });
  } catch (error) {
    return handleApiError(error, 'RFP publishing');
  }
}
