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

const updateBidSchema = z.object({
  // Pricing
  unitPrice: z.number().positive().optional(),
  deliveryCost: z.number().nonnegative().optional(),
  additionalCosts: z.number().nonnegative().optional(),
  priceValidity: z.number().int().positive().optional(),
  paymentTerms: z.string().optional(),

  // Delivery proposal
  deliverySchedule: z.any().optional(),
  leadTime: z.number().int().positive().optional(),
  deliveryMethod: z.enum(['OWN_FLEET', 'THIRD_PARTY', 'BUYER_PICKUP']).optional(),
  vehicleType: z.string().optional(),
  contingencyPlan: z.string().optional(),

  // Quality assurance
  complianceDocs: z.array(z.any()).optional(),
  recentQCResults: z.array(z.any()).optional(),
  premixSource: z.string().optional(),
  qualityGuarantee: z.string().optional(),
  sampleOffer: z.boolean().optional(),

  // Capacity & profile
  productionCapacity: z.any().optional(),
  currentUtilization: z.number().min(0).max(100).optional(),
  availableCapacity: z.string().optional(),
  simultaneousOrders: z.boolean().optional(),
  scaleUpCapability: z.boolean().optional(),

  // Track record
  previousOrders: z.array(z.any()).optional(),
  references: z.any().optional(),
  certifications: z.array(z.any()).optional(),
  awards: z.array(z.any()).optional(),

  // Additional information
  valueAddedServices: z.any().optional(),
  sustainability: z.string().optional(),
  socialImpact: z.string().optional(),
  riskMitigation: z.any().optional(),
});

/**
 * GET /api/bids/[id]
 * Get bid details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermissions(Permission.BID_VIEW, 'bid details');
    const bidId = params.id;

    // Get bid
    const bid = await db.bid.findUnique({
      where: { id: bidId },
      include: {
        rfp: {
          select: {
            id: true,
            title: true,
            referenceNumber: true,
            commodity: true,
            totalVolume: true,
            bidDeadline: true,
            status: true,
            buyer: {
              select: {
                id: true,
                organizationName: true,
                organizationType: true,
              },
            },
          },
        },
        mill: {
          select: {
            id: true,
            name: true,
            code: true,
            region: true,
            certificationStatus: true,
          },
        },
        questions: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        negotiations: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!bid) {
      return errorResponse('Bid not found', 404);
    }

    // Check access permissions
    const canAccess =
      session.user.role === Role.SYSTEM_ADMIN ||
      session.user.role === Role.FWGA_INSPECTOR ||
      session.user.role === Role.FWGA_PROGRAM_MANAGER ||
      (bid.mill.id === session.user.millId &&
        (session.user.role === Role.MILL_MANAGER ||
         session.user.role === Role.MILL_TECHNICIAN ||
         session.user.role === Role.MILL_OPERATOR)) ||
      (session.user.role === Role.INSTITUTIONAL_BUYER &&
        bid.rfp.buyer.id === session.user.id);

    if (!canAccess) {
      return errorResponse('You do not have permission to view this bid', 403);
    }

    // Parse JSON fields
    const bidWithParsedData = {
      ...bid,
      deliverySchedule: bid.deliverySchedule ? JSON.parse(bid.deliverySchedule) : null,
      complianceDocs: bid.complianceDocs ? JSON.parse(bid.complianceDocs) : [],
      recentQCResults: bid.recentQCResults ? JSON.parse(bid.recentQCResults) : [],
      productionCapacity: bid.productionCapacity ? JSON.parse(bid.productionCapacity) : null,
      previousOrders: bid.previousOrders ? JSON.parse(bid.previousOrders) : [],
      references: bid.references ? JSON.parse(bid.references) : null,
      certifications: bid.certifications ? JSON.parse(bid.certifications) : [],
      awards: bid.awards ? JSON.parse(bid.awards) : [],
      valueAddedServices: bid.valueAddedServices ? JSON.parse(bid.valueAddedServices) : null,
      riskMitigation: bid.riskMitigation ? JSON.parse(bid.riskMitigation) : null,
      supportingDocs: bid.supportingDocs ? JSON.parse(bid.supportingDocs) : [],
    };

    return successResponse(bidWithParsedData);
  } catch (error) {
    return handleApiError(error, 'fetching bid details');
  }
}

/**
 * PATCH /api/bids/[id]
 * Update a draft bid
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermissions(Permission.BID_EDIT, 'bid update');
    const bidId = params.id;

    // Get bid
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
      return errorResponse('You can only update your own mill\'s bids', 403);
    }

    // Check status - can only update draft or submitted bids before deadline
    if (!['DRAFT', 'SUBMITTED'].includes(bid.status)) {
      return errorResponse(
        `Cannot update bid with status ${bid.status}`,
        400
      );
    }

    // Check bid deadline hasn't passed
    if (new Date(bid.rfp.bidDeadline) <= new Date()) {
      return errorResponse('Bid deadline has passed', 400);
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateBidSchema.parse(body);

    // Recalculate total if pricing changed
    let totalProductCost = bid.totalProductCost;
    let totalBidAmount = bid.totalBidAmount;

    if (validatedData.unitPrice !== undefined) {
      totalProductCost = validatedData.unitPrice * bid.rfp.totalVolume;
      totalBidAmount =
        totalProductCost +
        (validatedData.deliveryCost ?? bid.deliveryCost ?? 0) +
        (validatedData.additionalCosts ?? bid.additionalCosts ?? 0);
    } else if (
      validatedData.deliveryCost !== undefined ||
      validatedData.additionalCosts !== undefined
    ) {
      totalBidAmount =
        totalProductCost +
        (validatedData.deliveryCost ?? bid.deliveryCost ?? 0) +
        (validatedData.additionalCosts ?? bid.additionalCosts ?? 0);
    }

    // Update bid
    const updatedBid = await db.$transaction(async (tx) => {
      const updated = await tx.bid.update({
        where: { id: bidId },
        data: {
          ...validatedData,
          totalProductCost:
            validatedData.unitPrice !== undefined ? totalProductCost : undefined,
          totalBidAmount:
            validatedData.unitPrice !== undefined ||
            validatedData.deliveryCost !== undefined ||
            validatedData.additionalCosts !== undefined
              ? totalBidAmount
              : undefined,
          deliverySchedule: validatedData.deliverySchedule
            ? JSON.stringify(validatedData.deliverySchedule)
            : undefined,
          complianceDocs: validatedData.complianceDocs
            ? JSON.stringify(validatedData.complianceDocs)
            : undefined,
          recentQCResults: validatedData.recentQCResults
            ? JSON.stringify(validatedData.recentQCResults)
            : undefined,
          productionCapacity: validatedData.productionCapacity
            ? JSON.stringify(validatedData.productionCapacity)
            : undefined,
          previousOrders: validatedData.previousOrders
            ? JSON.stringify(validatedData.previousOrders)
            : undefined,
          references: validatedData.references
            ? JSON.stringify(validatedData.references)
            : undefined,
          certifications: validatedData.certifications
            ? JSON.stringify(validatedData.certifications)
            : undefined,
          awards: validatedData.awards
            ? JSON.stringify(validatedData.awards)
            : undefined,
          valueAddedServices: validatedData.valueAddedServices
            ? JSON.stringify(validatedData.valueAddedServices)
            : undefined,
          riskMitigation: validatedData.riskMitigation
            ? JSON.stringify(validatedData.riskMitigation)
            : undefined,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'BID_UPDATE',
          resourceType: 'BID',
          resourceId: bidId,
          oldValues: JSON.stringify(bid),
          newValues: JSON.stringify(updated),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      return updated;
    });

    return successResponse({
      message: 'Bid updated successfully',
      bidId: updatedBid.id,
      totalBidAmount: updatedBid.totalBidAmount,
    });
  } catch (error) {
    return handleApiError(error, 'bid update');
  }
}
