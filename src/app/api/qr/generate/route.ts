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

const generateQRSchema = z.object({
  batchId: z.string().cuid('Invalid batch ID'),
  includeInCertificate: z.boolean().default(true),
});

/**
 * POST /api/qr/generate
 * Generate QR code for a batch
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requirePermissions(
      Permission.BATCH_VIEW,
      'QR code generation'
    );

    const body = await request.json();
    const validatedData = generateQRSchema.parse(body);

    // Get batch details
    const batch = await db.batch.findUnique({
      where: { id: validatedData.batchId },
      include: {
        product: {
          include: {
            mill: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        qualityTests: {
          where: { status: 'PASSED' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!batch) {
      return errorResponse('Batch not found', 404);
    }

    // Generate QR code data URL (in production, use a proper QR library)
    const qrData = {
      batchNumber: batch.batchNumber,
      productName: batch.product.name,
      millName: batch.product.mill.name,
      productionDate: batch.productionDate,
      expiryDate: batch.expiryDate,
      quantity: batch.quantity,
      qualityTested: batch.qualityTests.length > 0,
      verificationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/verify/${batch.batchNumber}`,
    };

    // In a real implementation, generate actual QR code image using a library like qrcode
    const qrCodeDataUrl = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;

    // Update batch with QR code
    const updated = await db.batch.update({
      where: { id: validatedData.batchId },
      data: {
        qrCode: qrCodeDataUrl,
        qrCodeData: JSON.stringify(qrData),
      },
    });

    // Optionally generate digital certificate
    if (validatedData.includeInCertificate && batch.qualityTests.length > 0) {
      const certificate = await db.batchCertificate.create({
        data: {
          batchId: batch.id,
          certificateNumber: `CERT-${batch.batchNumber}`,
          issuedBy: session.user.id,
          qrCode: qrCodeDataUrl,
          certificateData: JSON.stringify({
            ...qrData,
            qualityTest: batch.qualityTests[0],
            issuedAt: new Date(),
          }),
        },
      });
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'QR_GENERATE',
        resourceType: 'BATCH',
        resourceId: batch.id,
        newValues: JSON.stringify({ batchNumber: batch.batchNumber }),
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return successResponse({
      message: 'QR code generated successfully',
      qrCode: qrCodeDataUrl,
      qrData,
      verificationUrl: qrData.verificationUrl,
    });
  } catch (error) {
    return handleApiError(error, 'QR code generation');
  }
}
