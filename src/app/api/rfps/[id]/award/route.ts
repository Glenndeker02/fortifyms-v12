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

const awardSchema = z.object({
  bidId: z.string().cuid('Invalid bid ID'),
  awardNotes: z.string().optional(),
  createPurchaseOrder: z.boolean().default(true),
});

/**
 * POST /api/rfps/[id]/award
 * Award an RFP to the winning bid and optionally create a purchase order
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermissions(Permission.BID_AWARD, 'bid award');
    const rfpId = params.id;

    // Only buyers and FWGA program managers can award
    if (
      session.user.role !== Role.INSTITUTIONAL_BUYER &&
      session.user.role !== Role.FWGA_PROGRAM_MANAGER &&
      session.user.role !== Role.SYSTEM_ADMIN
    ) {
      return errorResponse('Only buyers can award bids', 403);
    }

    // Parse request body
    const body = await request.json();
    const { bidId, awardNotes, createPurchaseOrder } = awardSchema.parse(body);

    // Get RFP
    const rfp = await db.rFP.findUnique({
      where: { id: rfpId },
      include: {
        buyer: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!rfp) {
      return errorResponse('RFP not found', 404);
    }

    // Check ownership
    if (
      session.user.role === Role.INSTITUTIONAL_BUYER &&
      rfp.buyer.userId !== session.user.id
    ) {
      return errorResponse('You can only award your own RFPs', 403);
    }

    // Check RFP status
    if (rfp.status === 'AWARDED') {
      return errorResponse('RFP has already been awarded', 400);
    }

    if (rfp.status !== 'CLOSED') {
      return errorResponse('RFP must be closed before awarding', 400);
    }

    // Get the winning bid
    const winningBid = await db.bid.findUnique({
      where: { id: bidId },
      include: {
        mill: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!winningBid) {
      return errorResponse('Bid not found', 404);
    }

    // Check bid belongs to this RFP
    if (winningBid.rfpId !== rfpId) {
      return errorResponse('Bid does not belong to this RFP', 400);
    }

    // Check bid is in valid status
    if (!['SUBMITTED', 'SHORTLISTED'].includes(winningBid.status)) {
      return errorResponse(
        `Cannot award bid with status ${winningBid.status}`,
        400
      );
    }

    // Award bid and optionally create purchase order
    const result = await db.$transaction(async (tx) => {
      // Update winning bid status
      const awardedBid = await tx.bid.update({
        where: { id: bidId },
        data: {
          status: 'AWARDED',
        },
      });

      // Update RFP status and awarded bid
      const awardedRfp = await tx.rFP.update({
        where: { id: rfpId },
        data: {
          status: 'AWARDED',
          awardedBidId: bidId,
        },
      });

      // Update other bids to NOT_SELECTED
      await tx.bid.updateMany({
        where: {
          rfpId: rfpId,
          id: { not: bidId },
          status: { in: ['SUBMITTED', 'SHORTLISTED'] },
        },
        data: {
          status: 'NOT_SELECTED',
        },
      });

      // Create purchase order if requested
      let purchaseOrder = null;
      if (createPurchaseOrder) {
        // Generate PO number
        const year = new Date().getFullYear();
        const count = await tx.purchaseOrder.count({
          where: {
            buyerId: rfp.buyer.id,
            createdAt: {
              gte: new Date(`${year}-01-01`),
            },
          },
        });
        const poNumber = `PO-${year}-${String(count + 1).padStart(6, '0')}`;

        purchaseOrder = await tx.purchaseOrder.create({
          data: {
            poNumber,
            rfpId: rfpId,
            bidId: bidId,
            buyerId: rfp.buyer.id,
            millId: winningBid.millId,
            productSpecs: JSON.stringify({
              commodity: rfp.commodity,
              totalVolume: rfp.totalVolume,
              unitPackaging: rfp.unitPackaging,
              qualitySpecs: rfp.qualitySpecs,
            }),
            quantity: rfp.totalVolume,
            unitPrice: winningBid.unitPrice,
            totalAmount: winningBid.totalBidAmount,
            deliverySchedule: winningBid.deliverySchedule || rfp.deliverySchedule,
            paymentTerms: winningBid.paymentTerms || rfp.preferredPaymentTerms || 'NET_30',
            qualityStandards: rfp.qualitySpecs,
            status: 'DRAFT',
          },
        });
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'BID_AWARD',
          resourceType: 'RFP',
          resourceId: rfpId,
          oldValues: JSON.stringify({ status: rfp.status }),
          newValues: JSON.stringify({
            status: 'AWARDED',
            awardedBidId: bidId,
            awardNotes,
            poNumber: purchaseOrder?.poNumber,
          }),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      // TODO: Send notifications
      // - Notify winning mill
      // - Notify other mills (not selected)
      // - Create alert for winning mill

      return {
        awardedBid,
        awardedRfp,
        purchaseOrder,
      };
    });

    return successResponse({
      message: 'Bid awarded successfully',
      rfpId: result.awardedRfp.id,
      bidId: result.awardedBid.id,
      millName: winningBid.mill.name,
      totalAmount: winningBid.totalBidAmount,
      purchaseOrder: result.purchaseOrder
        ? {
            id: result.purchaseOrder.id,
            poNumber: result.purchaseOrder.poNumber,
          }
        : null,
    });
  } catch (error) {
    return handleApiError(error, 'bid award');
  }
}
