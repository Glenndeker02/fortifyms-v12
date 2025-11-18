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

const createBidSchema = z.object({
  rfpId: z.string().cuid('Invalid RFP ID'),

  // Pricing
  unitPrice: z.number().positive('Unit price must be positive'),
  deliveryCost: z.number().nonnegative().optional(),
  additionalCosts: z.number().nonnegative().optional(),
  priceValidity: z.number().int().positive('Price validity must be positive'),
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
  sampleOffer: z.boolean().default(false),

  // Capacity & profile
  productionCapacity: z.any().optional(),
  currentUtilization: z.number().min(0).max(100).optional(),
  availableCapacity: z.string().optional(),
  simultaneousOrders: z.boolean().default(true),
  scaleUpCapability: z.boolean().default(false),

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
 * GET /api/bids
 * List bids with filtering
 *
 * - Buyers see all bids for their RFPs
 * - Mills see only their own bids
 * - FWGA staff see all bids
 */
export async function GET(request: NextRequest) {
  try {
    // Check permission
    const session = await requirePermissions(Permission.BID_VIEW, 'bids');

    // Get pagination and sorting params
    const { skip, take } = getPaginationParams(request);
    const { orderBy } = getSortingParams(request);

    // Get filter params
    const { searchParams } = new URL(request.url);
    const rfpId = searchParams.get('rfpId');
    const status = searchParams.get('status');

    // Build where clause based on role
    const where: any = {};

    if (rfpId) {
      where.rfpId = rfpId;
    }

    if (status) {
      where.status = status;
    }

    // Mills can only see their own bids
    if (
      session.user.role === Role.MILL_MANAGER ||
      session.user.role === Role.MILL_OPERATOR ||
      session.user.role === Role.MILL_TECHNICIAN
    ) {
      if (!session.user.millId) {
        return errorResponse('Mill staff must be assigned to a mill', 403);
      }
      where.millId = session.user.millId;
    }

    // Buyers can only see bids for their RFPs
    if (session.user.role === Role.INSTITUTIONAL_BUYER) {
      where.rfp = {
        buyer: {
          userId: session.user.id,
        },
      };
    }

    // Get bids with related data
    const [bids, total] = await Promise.all([
      db.bid.findMany({
        where,
        skip,
        take,
        orderBy,
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
        },
      }),
      db.bid.count({ where }),
    ]);

    // Parse JSON fields
    const bidsWithParsedData = bids.map((bid) => ({
      ...bid,
      deliverySchedule: bid.deliverySchedule
        ? JSON.parse(bid.deliverySchedule)
        : null,
      complianceDocs: bid.complianceDocs ? JSON.parse(bid.complianceDocs) : [],
      recentQCResults: bid.recentQCResults
        ? JSON.parse(bid.recentQCResults)
        : [],
      productionCapacity: bid.productionCapacity
        ? JSON.parse(bid.productionCapacity)
        : null,
      previousOrders: bid.previousOrders
        ? JSON.parse(bid.previousOrders)
        : [],
      references: bid.references ? JSON.parse(bid.references) : null,
      certifications: bid.certifications
        ? JSON.parse(bid.certifications)
        : [],
      awards: bid.awards ? JSON.parse(bid.awards) : [],
      valueAddedServices: bid.valueAddedServices
        ? JSON.parse(bid.valueAddedServices)
        : null,
      riskMitigation: bid.riskMitigation
        ? JSON.parse(bid.riskMitigation)
        : null,
      supportingDocs: bid.supportingDocs
        ? JSON.parse(bid.supportingDocs)
        : [],
    }));

    return successResponse({
      bids: bidsWithParsedData,
      pagination: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    return handleApiError(error, 'fetching bids');
  }
}

/**
 * POST /api/bids
 * Create a new bid (mills only)
 */
export async function POST(request: NextRequest) {
  try {
    // Check permission - mills can create bids
    const session = await requirePermissions(Permission.BID_CREATE, 'bid creation');

    // Only mill staff can create bids
    if (
      session.user.role !== Role.MILL_MANAGER &&
      session.user.role !== Role.MILL_TECHNICIAN &&
      session.user.role !== Role.MILL_OPERATOR
    ) {
      return errorResponse('Only mill staff can create bids', 403);
    }

    if (!session.user.millId) {
      return errorResponse('Mill staff must be assigned to a mill', 403);
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createBidSchema.parse(body);

    // Get RFP
    const rfp = await db.rFP.findUnique({
      where: { id: validatedData.rfpId },
    });

    if (!rfp) {
      return errorResponse('RFP not found', 404);
    }

    // Check RFP is open
    if (rfp.status !== 'OPEN') {
      return errorResponse('RFP is not open for bidding', 400);
    }

    // Check bid deadline hasn't passed
    if (new Date(rfp.bidDeadline) <= new Date()) {
      return errorResponse('Bid deadline has passed', 400);
    }

    // Check if mill already has a bid for this RFP
    const existingBid = await db.bid.findFirst({
      where: {
        rfpId: validatedData.rfpId,
        millId: session.user.millId,
      },
    });

    if (existingBid) {
      return errorResponse(
        'Your mill already has a bid for this RFP. Please update your existing bid instead.',
        409
      );
    }

    // Calculate total bid amount
    const totalProductCost = validatedData.unitPrice * rfp.totalVolume;
    const totalBidAmount =
      totalProductCost +
      (validatedData.deliveryCost || 0) +
      (validatedData.additionalCosts || 0);

    // Create bid
    const bid = await db.$transaction(async (tx) => {
      const created = await tx.bid.create({
        data: {
          rfpId: validatedData.rfpId,
          millId: session.user.millId,
          unitPrice: validatedData.unitPrice,
          totalProductCost,
          deliveryCost: validatedData.deliveryCost,
          additionalCosts: validatedData.additionalCosts,
          totalBidAmount,
          priceValidity: validatedData.priceValidity,
          paymentTerms: validatedData.paymentTerms,
          deliverySchedule: validatedData.deliverySchedule
            ? JSON.stringify(validatedData.deliverySchedule)
            : null,
          leadTime: validatedData.leadTime,
          deliveryMethod: validatedData.deliveryMethod,
          vehicleType: validatedData.vehicleType,
          contingencyPlan: validatedData.contingencyPlan,
          complianceDocs: validatedData.complianceDocs
            ? JSON.stringify(validatedData.complianceDocs)
            : null,
          recentQCResults: validatedData.recentQCResults
            ? JSON.stringify(validatedData.recentQCResults)
            : null,
          premixSource: validatedData.premixSource,
          qualityGuarantee: validatedData.qualityGuarantee,
          sampleOffer: validatedData.sampleOffer,
          productionCapacity: validatedData.productionCapacity
            ? JSON.stringify(validatedData.productionCapacity)
            : null,
          currentUtilization: validatedData.currentUtilization,
          availableCapacity: validatedData.availableCapacity,
          simultaneousOrders: validatedData.simultaneousOrders,
          scaleUpCapability: validatedData.scaleUpCapability,
          previousOrders: validatedData.previousOrders
            ? JSON.stringify(validatedData.previousOrders)
            : null,
          references: validatedData.references
            ? JSON.stringify(validatedData.references)
            : null,
          certifications: validatedData.certifications
            ? JSON.stringify(validatedData.certifications)
            : null,
          awards: validatedData.awards ? JSON.stringify(validatedData.awards) : null,
          valueAddedServices: validatedData.valueAddedServices
            ? JSON.stringify(validatedData.valueAddedServices)
            : null,
          sustainability: validatedData.sustainability,
          socialImpact: validatedData.socialImpact,
          riskMitigation: validatedData.riskMitigation
            ? JSON.stringify(validatedData.riskMitigation)
            : null,
          status: 'DRAFT', // Starts as draft
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'BID_CREATE',
          resourceType: 'BID',
          resourceId: created.id,
          newValues: JSON.stringify(created),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      return created;
    });

    return successResponse(
      {
        message: 'Bid created successfully',
        bidId: bid.id,
        rfpId: bid.rfpId,
        totalBidAmount: bid.totalBidAmount,
        status: bid.status,
      },
      201
    );
  } catch (error) {
    return handleApiError(error, 'bid creation');
  }
}
