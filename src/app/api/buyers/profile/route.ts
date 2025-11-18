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

const updateProfileSchema = z.object({
  // Organization details
  organizationName: z.string().min(2).optional(),
  organizationType: z
    .enum([
      'SCHOOL',
      'NGO',
      'GOVERNMENT_AGENCY',
      'HOSPITAL',
      'CORPORATE_CAFETERIA',
      'OTHER',
    ])
    .optional(),
  registrationId: z.string().optional(),

  // Contact information
  primaryContactName: z.string().min(2).optional(),
  primaryContactTitle: z.string().optional(),
  primaryContactPhone: z.string().optional(),
  primaryContactEmail: z.string().email().optional(),

  // Address
  billingAddress: z
    .object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      country: z.string(),
      postalCode: z.string(),
    })
    .optional(),
  deliveryAddresses: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string(),
        street: z.string(),
        city: z.string(),
        state: z.string(),
        country: z.string(),
        postalCode: z.string(),
        contactPerson: z.string().optional(),
        contactPhone: z.string().optional(),
        deliveryInstructions: z.string().optional(),
      })
    )
    .optional(),

  // Preferences
  averageOrderVolume: z.number().positive().optional(),
  deliveryFrequency: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY']).optional(),
  preferredPaymentTerms: z
    .enum(['ADVANCE', 'ON_DELIVERY', 'NET_30', 'NET_60', 'ESCROW'])
    .optional(),
  qualitySpecs: z.any().optional(), // JSON object for quality specifications
  budgetConstraints: z.any().optional(), // JSON object for budget information
});

/**
 * GET /api/buyers/profile
 * Get the buyer profile for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Check permission and get session
    const session = await requirePermissions(Permission.BUYER_VIEW, 'buyer profile');

    // Get buyer profile
    const buyerProfile = await db.buyerProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
        },
        rfps: {
          select: {
            id: true,
            title: true,
            status: true,
            totalVolume: true,
            commodity: true,
            bidDeadline: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5, // Latest 5 RFPs
        },
        purchaseOrders: {
          select: {
            id: true,
            poNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5, // Latest 5 orders
        },
      },
    });

    if (!buyerProfile) {
      return errorResponse('Buyer profile not found', 404);
    }

    // Parse JSON fields
    const profile = {
      ...buyerProfile,
      billingAddress: buyerProfile.billingAddress
        ? JSON.parse(buyerProfile.billingAddress)
        : null,
      deliveryAddresses: buyerProfile.deliveryAddresses
        ? JSON.parse(buyerProfile.deliveryAddresses)
        : [],
      qualitySpecs: buyerProfile.qualitySpecs
        ? JSON.parse(buyerProfile.qualitySpecs)
        : null,
      budgetConstraints: buyerProfile.budgetConstraints
        ? JSON.parse(buyerProfile.budgetConstraints)
        : null,
    };

    return successResponse(profile);
  } catch (error) {
    return handleApiError(error, 'fetching buyer profile');
  }
}

/**
 * PATCH /api/buyers/profile
 * Update the buyer profile for the authenticated user
 */
export async function PATCH(request: NextRequest) {
  try {
    // Check permission and get session
    const session = await requirePermissions(Permission.BUYER_EDIT, 'buyer profile');

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    // Check if buyer profile exists
    const existingProfile = await db.buyerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!existingProfile) {
      return errorResponse('Buyer profile not found', 404);
    }

    // Check if profile is verified
    if (existingProfile.verificationStatus === 'PENDING') {
      return errorResponse(
        'Cannot update profile while verification is pending',
        403
      );
    }

    // Update buyer profile
    const updatedProfile = await db.$transaction(async (tx) => {
      const updated = await tx.buyerProfile.update({
        where: { userId: session.user.id },
        data: {
          ...validatedData,
          billingAddress: validatedData.billingAddress
            ? JSON.stringify(validatedData.billingAddress)
            : undefined,
          deliveryAddresses: validatedData.deliveryAddresses
            ? JSON.stringify(validatedData.deliveryAddresses)
            : undefined,
          qualitySpecs: validatedData.qualitySpecs
            ? JSON.stringify(validatedData.qualitySpecs)
            : undefined,
          budgetConstraints: validatedData.budgetConstraints
            ? JSON.stringify(validatedData.budgetConstraints)
            : undefined,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'BUYER_UPDATE',
          resourceType: 'BUYER',
          resourceId: updated.id,
          oldValues: JSON.stringify(existingProfile),
          newValues: JSON.stringify(updated),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      return updated;
    });

    // Parse JSON fields for response
    const profile = {
      ...updatedProfile,
      billingAddress: updatedProfile.billingAddress
        ? JSON.parse(updatedProfile.billingAddress)
        : null,
      deliveryAddresses: updatedProfile.deliveryAddresses
        ? JSON.parse(updatedProfile.deliveryAddresses)
        : [],
      qualitySpecs: updatedProfile.qualitySpecs
        ? JSON.parse(updatedProfile.qualitySpecs)
        : null,
      budgetConstraints: updatedProfile.budgetConstraints
        ? JSON.parse(updatedProfile.budgetConstraints)
        : null,
    };

    return successResponse(profile);
  } catch (error) {
    return handleApiError(error, 'updating buyer profile');
  }
}
