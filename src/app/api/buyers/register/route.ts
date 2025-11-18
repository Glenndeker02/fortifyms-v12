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
import bcrypt from 'bcryptjs';

const registerSchema = z.object({
  // User account
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),

  // Organization details
  organizationName: z.string().min(2, 'Organization name is required'),
  organizationType: z.enum([
    'SCHOOL',
    'NGO',
    'GOVERNMENT_AGENCY',
    'HOSPITAL',
    'CORPORATE_CAFETERIA',
    'OTHER',
  ]),
  registrationId: z.string().optional(),

  // Contact information
  primaryContactName: z.string().min(2, 'Primary contact name is required'),
  primaryContactTitle: z.string().optional(),
  primaryContactPhone: z.string().optional(),
  primaryContactEmail: z.string().email('Invalid contact email'),

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

  // Preferences
  averageOrderVolume: z.number().positive().optional(),
  deliveryFrequency: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY']).optional(),
  preferredPaymentTerms: z
    .enum(['ADVANCE', 'ON_DELIVERY', 'NET_30', 'NET_60', 'ESCROW'])
    .optional(),
  currency: z.string().default('USD'),
});

/**
 * POST /api/buyers/register
 * Register a new institutional buyer account
 *
 * This creates both a User account and a BuyerProfile
 * Status starts as PENDING and requires verification by FWGA staff
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return errorResponse('Email address already registered', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Create user and buyer profile in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create user account
      const user = await tx.user.create({
        data: {
          email: validatedData.email,
          password: hashedPassword,
          name: validatedData.name,
          role: 'INSTITUTIONAL_BUYER' as any, // TypeScript enum issue
          isActive: true, // Account active, but profile needs verification
        },
      });

      // Create buyer profile
      const buyerProfile = await tx.buyerProfile.create({
        data: {
          userId: user.id,
          organizationName: validatedData.organizationName,
          organizationType: validatedData.organizationType,
          registrationId: validatedData.registrationId,
          primaryContactName: validatedData.primaryContactName,
          primaryContactTitle: validatedData.primaryContactTitle,
          primaryContactPhone: validatedData.primaryContactPhone,
          primaryContactEmail: validatedData.primaryContactEmail,
          billingAddress: validatedData.billingAddress
            ? JSON.stringify(validatedData.billingAddress)
            : null,
          averageOrderVolume: validatedData.averageOrderVolume,
          deliveryFrequency: validatedData.deliveryFrequency,
          preferredPaymentTerms: validatedData.preferredPaymentTerms,
          currency: validatedData.currency,
          verificationStatus: 'PENDING',
          isActive: false, // Inactive until verified
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'BUYER_REGISTER',
          resourceType: 'BUYER',
          resourceId: buyerProfile.id,
          newValues: JSON.stringify({
            userId: user.id,
            email: user.email,
            organizationName: buyerProfile.organizationName,
          }),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      return { user, buyerProfile };
    });

    return successResponse(
      {
        message:
          'Registration successful. Your account is pending verification by FWGA staff.',
        userId: result.user.id,
        buyerId: result.buyerProfile.id,
        verificationStatus: result.buyerProfile.verificationStatus,
      },
      201
    );
  } catch (error) {
    return handleApiError(error, 'buyer registration');
  }
}
