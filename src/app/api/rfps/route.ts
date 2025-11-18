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

const createRFPSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().optional(),
  commodity: z.string().min(2, 'Commodity is required'),
  totalVolume: z.number().positive('Total volume must be positive'),
  unitPackaging: z.enum([
    '1KG_BAGS',
    '5KG_BAGS',
    '25KG_BAGS',
    '50KG_BAGS',
    'BULK',
    'CUSTOM',
  ]),
  numberOfUnits: z.number().int().positive().optional(),

  // Quality specifications
  qualitySpecs: z.any().optional(),
  certificationRequired: z.array(z.string()).optional(),
  dietaryRequirements: z.any().optional(),

  // Delivery requirements
  deliveryLocations: z.array(z.any()).min(1, 'At least one delivery location required'),
  deliverySchedule: z.any().optional(),
  deliveryConditions: z.any().optional(),

  // Pricing & payment
  maxUnitPrice: z.number().positive().optional(),
  totalBudget: z.number().positive().optional(),
  preferredPaymentTerms: z.string().optional(),
  priceInclusions: z.any().optional(),

  // Additional requirements
  packagingLabeling: z.any().optional(),
  documentationRequired: z.array(z.string()).optional(),
  samplingRequirements: z.any().optional(),

  // Eligibility
  geographicRestriction: z.any().optional(),
  millCertification: z.any().optional(),
  capacityRequirement: z.number().optional(),
  trackRecordRequirement: z.any().optional(),
  evaluationCriteria: z.any().optional(),

  // Timeline
  bidDeadline: z.string().datetime('Invalid bid deadline'),
  estimatedAwardDate: z.string().datetime().optional(),

  // Status
  visibility: z.enum(['PUBLIC', 'INVITATION_ONLY']).default('PUBLIC'),
});

/**
 * GET /api/rfps
 * List RFPs with pagination and filtering
 *
 * Query parameters:
 * - page, limit, sortBy, sortOrder: Standard pagination
 * - status: Filter by RFP status
 * - commodity: Filter by commodity type
 * - buyerId: Filter by buyer (for FWGA staff)
 * - search: Search in title and description
 */
export async function GET(request: NextRequest) {
  try {
    // Check permission
    const session = await requirePermissions(Permission.RFP_VIEW, 'RFPs');

    // Get pagination and sorting params
    const { skip, take } = getPaginationParams(request);
    const { orderBy } = getSortingParams(request);

    // Get filter params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const commodity = searchParams.get('commodity');
    const buyerId = searchParams.get('buyerId');
    const search = searchParams.get('search');

    // Build where clause
    const where: any = {};

    // Buyers can only see their own RFPs
    if (session.user.role === Role.INSTITUTIONAL_BUYER) {
      where.buyer = { userId: session.user.id };
    } else if (buyerId) {
      // FWGA staff can filter by buyer
      where.buyerId = buyerId;
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Commodity filter
    if (commodity) {
      where.commodity = commodity;
    }

    // Search
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { referenceNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Mills can only see OPEN RFPs (public or invited)
    if (
      session.user.role === Role.MILL_MANAGER ||
      session.user.role === Role.MILL_OPERATOR ||
      session.user.role === Role.MILL_TECHNICIAN
    ) {
      where.status = 'OPEN';
      where.visibility = 'PUBLIC'; // TODO: Add invitation logic
    }

    // Get RFPs with related data
    const [rfps, total] = await Promise.all([
      db.rFP.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          buyer: {
            select: {
              id: true,
              organizationName: true,
              organizationType: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              bids: true,
            },
          },
        },
      }),
      db.rFP.count({ where }),
    ]);

    // Parse JSON fields
    const rfpsWithParsedData = rfps.map((rfp) => ({
      ...rfp,
      qualitySpecs: rfp.qualitySpecs ? JSON.parse(rfp.qualitySpecs) : null,
      certificationRequired: rfp.certificationRequired
        ? JSON.parse(rfp.certificationRequired)
        : [],
      dietaryRequirements: rfp.dietaryRequirements
        ? JSON.parse(rfp.dietaryRequirements)
        : null,
      deliveryLocations: rfp.deliveryLocations
        ? JSON.parse(rfp.deliveryLocations)
        : [],
      deliverySchedule: rfp.deliverySchedule
        ? JSON.parse(rfp.deliverySchedule)
        : null,
      deliveryConditions: rfp.deliveryConditions
        ? JSON.parse(rfp.deliveryConditions)
        : null,
      priceInclusions: rfp.priceInclusions
        ? JSON.parse(rfp.priceInclusions)
        : null,
      packagingLabeling: rfp.packagingLabeling
        ? JSON.parse(rfp.packagingLabeling)
        : null,
      documentationRequired: rfp.documentationRequired
        ? JSON.parse(rfp.documentationRequired)
        : [],
      samplingRequirements: rfp.samplingRequirements
        ? JSON.parse(rfp.samplingRequirements)
        : null,
      geographicRestriction: rfp.geographicRestriction
        ? JSON.parse(rfp.geographicRestriction)
        : null,
      millCertification: rfp.millCertification
        ? JSON.parse(rfp.millCertification)
        : null,
      trackRecordRequirement: rfp.trackRecordRequirement
        ? JSON.parse(rfp.trackRecordRequirement)
        : null,
      evaluationCriteria: rfp.evaluationCriteria
        ? JSON.parse(rfp.evaluationCriteria)
        : null,
      shortlistedBids: rfp.shortlistedBids
        ? JSON.parse(rfp.shortlistedBids)
        : null,
    }));

    return successResponse({
      rfps: rfpsWithParsedData,
      pagination: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    return handleApiError(error, 'fetching RFPs');
  }
}

/**
 * POST /api/rfps
 * Create a new RFP (buyers only)
 */
export async function POST(request: NextRequest) {
  try {
    // Check permission - only buyers can create RFPs
    const session = await requirePermissions(Permission.RFP_CREATE, 'RFP creation');

    // Buyers only
    if (session.user.role !== Role.INSTITUTIONAL_BUYER) {
      return errorResponse('Only institutional buyers can create RFPs', 403);
    }

    // Get buyer profile
    const buyerProfile = await db.buyerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!buyerProfile) {
      return errorResponse('Buyer profile not found', 404);
    }

    if (!buyerProfile.isActive || buyerProfile.verificationStatus !== 'VERIFIED') {
      return errorResponse(
        'Buyer account must be verified to create RFPs',
        403
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createRFPSchema.parse(body);

    // Generate reference number
    const year = new Date().getFullYear();
    const count = await db.rFP.count({
      where: {
        buyerId: buyerProfile.id,
        createdAt: {
          gte: new Date(`${year}-01-01`),
        },
      },
    });
    const referenceNumber = `RFP-${year}-${buyerProfile.organizationName
      .substring(0, 3)
      .toUpperCase()}-${String(count + 1).padStart(4, '0')}`;

    // Create RFP
    const rfp = await db.$transaction(async (tx) => {
      const created = await tx.rFP.create({
        data: {
          buyerId: buyerProfile.id,
          referenceNumber,
          title: validatedData.title,
          description: validatedData.description,
          commodity: validatedData.commodity,
          totalVolume: validatedData.totalVolume,
          unitPackaging: validatedData.unitPackaging,
          numberOfUnits: validatedData.numberOfUnits,
          qualitySpecs: validatedData.qualitySpecs
            ? JSON.stringify(validatedData.qualitySpecs)
            : null,
          certificationRequired: validatedData.certificationRequired
            ? JSON.stringify(validatedData.certificationRequired)
            : null,
          dietaryRequirements: validatedData.dietaryRequirements
            ? JSON.stringify(validatedData.dietaryRequirements)
            : null,
          deliveryLocations: JSON.stringify(validatedData.deliveryLocations),
          deliverySchedule: validatedData.deliverySchedule
            ? JSON.stringify(validatedData.deliverySchedule)
            : null,
          deliveryConditions: validatedData.deliveryConditions
            ? JSON.stringify(validatedData.deliveryConditions)
            : null,
          maxUnitPrice: validatedData.maxUnitPrice,
          totalBudget: validatedData.totalBudget,
          preferredPaymentTerms: validatedData.preferredPaymentTerms,
          priceInclusions: validatedData.priceInclusions
            ? JSON.stringify(validatedData.priceInclusions)
            : null,
          packagingLabeling: validatedData.packagingLabeling
            ? JSON.stringify(validatedData.packagingLabeling)
            : null,
          documentationRequired: validatedData.documentationRequired
            ? JSON.stringify(validatedData.documentationRequired)
            : null,
          samplingRequirements: validatedData.samplingRequirements
            ? JSON.stringify(validatedData.samplingRequirements)
            : null,
          geographicRestriction: validatedData.geographicRestriction
            ? JSON.stringify(validatedData.geographicRestriction)
            : null,
          millCertification: validatedData.millCertification
            ? JSON.stringify(validatedData.millCertification)
            : null,
          capacityRequirement: validatedData.capacityRequirement,
          trackRecordRequirement: validatedData.trackRecordRequirement
            ? JSON.stringify(validatedData.trackRecordRequirement)
            : null,
          evaluationCriteria: validatedData.evaluationCriteria
            ? JSON.stringify(validatedData.evaluationCriteria)
            : null,
          bidDeadline: new Date(validatedData.bidDeadline),
          estimatedAwardDate: validatedData.estimatedAwardDate
            ? new Date(validatedData.estimatedAwardDate)
            : null,
          visibility: validatedData.visibility,
          status: 'DRAFT', // Starts as draft
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'RFP_CREATE',
          resourceType: 'RFP',
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
        message: 'RFP created successfully',
        rfpId: rfp.id,
        referenceNumber: rfp.referenceNumber,
        status: rfp.status,
      },
      201
    );
  } catch (error) {
    return handleApiError(error, 'RFP creation');
  }
}
