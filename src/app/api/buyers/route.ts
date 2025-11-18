import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
  getPaginationParams,
  getSortingParams,
} from '@/lib/api-helpers';
import { requirePermissions } from '@/lib/permissions-middleware';
import { Permission } from '@/lib/rbac';

/**
 * GET /api/buyers
 * List all buyers with pagination and filtering (FWGA staff only)
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - sortBy: Field to sort by (default: createdAt)
 * - sortOrder: Sort direction (asc/desc, default: desc)
 * - status: Filter by verification status
 * - organizationType: Filter by organization type
 * - search: Search by organization name or email
 */
export async function GET(request: NextRequest) {
  try {
    // Check permission - only FWGA staff can view all buyers
    const session = await requirePermissions(Permission.BUYER_VIEW, 'buyers list');

    // Get pagination and sorting params
    const { skip, take } = getPaginationParams(request);
    const { orderBy } = getSortingParams(request);

    // Get filter params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const organizationType = searchParams.get('organizationType');
    const search = searchParams.get('search');

    // Build where clause
    const where: any = {};

    if (status) {
      where.verificationStatus = status;
    }

    if (organizationType) {
      where.organizationType = organizationType;
    }

    if (search) {
      where.OR = [
        { organizationName: { contains: search, mode: 'insensitive' } },
        { primaryContactEmail: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Get buyers with related data
    const [buyers, total] = await Promise.all([
      db.buyerProfile.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              createdAt: true,
              lastLoginAt: true,
            },
          },
          _count: {
            select: {
              rfps: true,
              purchaseOrders: true,
            },
          },
        },
      }),
      db.buyerProfile.count({ where }),
    ]);

    // Parse JSON fields
    const buyersWithParsedData = buyers.map((buyer) => ({
      ...buyer,
      billingAddress: buyer.billingAddress
        ? JSON.parse(buyer.billingAddress)
        : null,
      deliveryAddresses: buyer.deliveryAddresses
        ? JSON.parse(buyer.deliveryAddresses)
        : [],
      qualitySpecs: buyer.qualitySpecs
        ? JSON.parse(buyer.qualitySpecs)
        : null,
      budgetConstraints: buyer.budgetConstraints
        ? JSON.parse(buyer.budgetConstraints)
        : null,
    }));

    return successResponse({
      buyers: buyersWithParsedData,
      pagination: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    return handleApiError(error, 'fetching buyers');
  }
}
