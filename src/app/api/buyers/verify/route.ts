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

const verifySchema = z.object({
  buyerId: z.string().cuid('Invalid buyer ID'),
  status: z.enum(['VERIFIED', 'REJECTED']),
  notes: z.string().optional(),
});

/**
 * POST /api/buyers/verify
 * Verify or reject a buyer registration (FWGA staff only)
 */
export async function POST(request: NextRequest) {
  try {
    // Check permission - only FWGA staff can verify buyers
    const session = await requirePermissions(
      Permission.BUYER_VERIFY,
      'buyer verification'
    );

    // Parse and validate request body
    const body = await request.json();
    const { buyerId, status, notes } = verifySchema.parse(body);

    // Get buyer profile
    const buyerProfile = await db.buyerProfile.findUnique({
      where: { id: buyerId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!buyerProfile) {
      return errorResponse('Buyer profile not found', 404);
    }

    // Check if already verified/rejected
    if (buyerProfile.verificationStatus !== 'PENDING') {
      return errorResponse(
        `Buyer already ${buyerProfile.verificationStatus.toLowerCase()}`,
        400
      );
    }

    // Update buyer profile
    const result = await db.$transaction(async (tx) => {
      const updated = await tx.buyerProfile.update({
        where: { id: buyerId },
        data: {
          verificationStatus: status,
          verifiedAt: status === 'VERIFIED' ? new Date() : null,
          verifiedBy: session.user.id,
          isActive: status === 'VERIFIED', // Activate profile if verified
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: `BUYER_${status}`,
          resourceType: 'BUYER',
          resourceId: buyerId,
          oldValues: JSON.stringify({
            verificationStatus: buyerProfile.verificationStatus,
          }),
          newValues: JSON.stringify({
            verificationStatus: status,
            verifiedBy: session.user.id,
            notes,
          }),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      // TODO: Send notification email to buyer
      // This would be implemented with an email service

      return updated;
    });

    return successResponse({
      message: `Buyer ${status === 'VERIFIED' ? 'verified' : 'rejected'} successfully`,
      buyerId: result.id,
      status: result.verificationStatus,
      verifiedAt: result.verifiedAt,
    });
  } catch (error) {
    return handleApiError(error, 'buyer verification');
  }
}
