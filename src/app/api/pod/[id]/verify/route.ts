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

const verifySchema = z.object({
  verified: z.boolean(),
  notes: z.string().optional(),
});

/**
 * POST /api/pod/[id]/verify
 * Verify proof of delivery (buyer confirms)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermissions(Permission.POD_VERIFY, 'POD verification');
    const podId = params.id;

    // Only buyers can verify POD
    if (session.user.role !== Role.INSTITUTIONAL_BUYER) {
      return errorResponse('Only buyers can verify proof of delivery', 403);
    }

    const body = await request.json();
    const { verified, notes } = verifySchema.parse(body);

    const pod = await db.proofOfDelivery.findUnique({
      where: { id: podId },
      include: {
        trip: {
          include: {
            proofOfDeliveries: true,
          },
        },
      },
    });

    if (!pod) {
      return errorResponse('Proof of delivery not found', 404);
    }

    // Check POD status
    if (pod.status !== 'SUBMITTED') {
      return errorResponse(
        `Cannot verify POD with status ${pod.status}`,
        400
      );
    }

    const result = await db.$transaction(async (tx) => {
      const updated = await tx.proofOfDelivery.update({
        where: { id: podId },
        data: {
          status: verified ? 'VERIFIED' : 'DISPUTED',
          verifiedBy: session.user.id,
          verifiedAt: new Date(),
          dispute: verified
            ? null
            : JSON.stringify({
                reason: notes || 'Delivery not verified',
                createdAt: new Date(),
                createdBy: session.user.id,
              }),
        },
      });

      // If all PODs verified, update order status
      if (verified) {
        const allPODs = pod.trip.proofOfDeliveries;
        const allVerified = allPODs.every(
          (p) => p.id === podId || p.status === 'VERIFIED'
        );

        if (allVerified) {
          // Update order status to DELIVERED
          await tx.purchaseOrder.update({
            where: { id: pod.orderId },
            data: {
              status: 'DELIVERED',
              actualDeliveryDate: new Date(),
            },
          });
        }
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: verified ? 'POD_VERIFY' : 'POD_DISPUTE',
          resourceType: 'POD',
          resourceId: podId,
          oldValues: JSON.stringify({ status: pod.status }),
          newValues: JSON.stringify({
            status: verified ? 'VERIFIED' : 'DISPUTED',
            notes,
          }),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      return updated;
    });

    return successResponse({
      message: verified
        ? 'Proof of delivery verified successfully'
        : 'Proof of delivery disputed',
      podId: result.id,
      status: result.status,
      verifiedAt: result.verifiedAt,
    });
  } catch (error) {
    return handleApiError(error, 'POD verification');
  }
}
