import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
} from '@/lib/api-helpers';
import { requirePermissions } from '@/lib/permissions-middleware';
import { Permission, isMillStaff, Role } from '@/lib/rbac';

/**
 * GET /api/qc/[id]
 * Get detailed information about a specific QC test
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check permission and get session
    const session = await requirePermissions(Permission.QC_TEST_VIEW, 'QC tests');

    const qcTest = await db.qCTest.findUnique({
      where: { id: params.id },
      include: {
        batch: {
          select: {
            id: true,
            batchId: true,
            productType: true,
            productionLine: true,
            cropType: true,
            targetFortification: true,
            mill: {
              select: {
                id: true,
                name: true,
                code: true,
                address: true,
                region: true,
                country: true,
              },
            },
            operator: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        tester: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        sample: {
          select: {
            id: true,
            sampleId: true,
            collectionPoint: true,
            collectionTime: true,
            sampledBy: true,
            sampleQuantity: true,
            visualInspection: true,
            photoUrls: true,
            notes: true,
          },
        },
      },
    });

    if (!qcTest) {
      return errorResponse('QC test not found', 404);
    }

    // Check mill access for mill staff (FWGA can access any mill)
    if (isMillStaff(session.user.role)) {
      if (session.user.millId !== qcTest.batch.mill.id) {
        return errorResponse('You do not have access to this QC test', 403);
      }
    }

    return successResponse(qcTest);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/qc/[id]
 * Update QC test information
 *
 * Allowed updates:
 * - notes
 * - status (with proper authorization)
 * - labCertificate
 * - labReportUrl
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check permission and get session
    const session = await requirePermissions(Permission.QC_TEST_EDIT, 'QC tests');

    // Get existing QC test
    const existingTest = await db.qCTest.findUnique({
      where: { id: params.id },
      include: {
        batch: {
          select: {
            id: true,
            mill: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!existingTest) {
      return errorResponse('QC test not found', 404);
    }

    // Check mill access for mill staff (FWGA can access any mill)
    if (isMillStaff(session.user.role)) {
      if (session.user.millId !== existingTest.batch.mill.id) {
        return errorResponse('You do not have access to this QC test', 403);
      }
    }

    const body = await request.json();
    const updateData: any = {};

    // Allow updating certain fields
    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    if (body.labCertificate !== undefined) {
      updateData.labCertificate = body.labCertificate;
    }

    if (body.labReportUrl !== undefined) {
      updateData.labReportUrl = body.labReportUrl;
    }

    // Status updates require manager approval (override QC personnel)
    if (body.status !== undefined) {
      if (session.user.role !== 'MILL_MANAGER' && session.user.role !== 'SYSTEM_ADMIN') {
        return errorResponse('Only mill managers can override QC test status', 403);
      }
      updateData.status = body.status;

      // If status is being changed, update the batch status accordingly
      const allTestsForBatch = await db.qCTest.findMany({
        where: { batchId: existingTest.batchId },
      });

      // Count how many tests will have each status after this update
      const testStatuses = allTestsForBatch.map(test =>
        test.id === params.id ? body.status : test.status
      );

      const allPassed = testStatuses.every(s => s === 'PASS');
      const anyFailed = testStatuses.some(s => s === 'FAIL');

      let batchStatus: string;
      if (anyFailed) {
        batchStatus = 'QC_FAILED';
      } else if (allPassed) {
        batchStatus = 'QC_APPROVED';
      } else {
        batchStatus = 'QC_MARGINAL';
      }

      await db.batchLog.update({
        where: { id: existingTest.batchId },
        data: { status: batchStatus },
      });
    }

    // Update QC test
    const updatedTest = await db.qCTest.update({
      where: { id: params.id },
      data: updateData,
      include: {
        batch: {
          select: {
            id: true,
            batchId: true,
            productType: true,
            mill: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        tester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        sample: {
          select: {
            id: true,
            sampleId: true,
            collectionPoint: true,
          },
        },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'QC_TEST_UPDATE',
        resourceType: 'QC_TEST',
        resourceId: params.id,
        oldValues: existingTest,
        newValues: updatedTest,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return successResponse(updatedTest);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/qc/[id]
 * Delete a QC test
 *
 * Only system admins can delete QC tests
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check permission and get session (only system admins have delete permission)
    const session = await requirePermissions(Permission.QC_TEST_EDIT, 'QC tests');

    // Only system admins can delete QC tests
    if (session.user.role !== Role.SYSTEM_ADMIN) {
      return errorResponse('Only system administrators can delete QC tests', 403);
    }

    const qcTest = await db.qCTest.findUnique({
      where: { id: params.id },
      include: {
        batch: true,
      },
    });

    if (!qcTest) {
      return errorResponse('QC test not found', 404);
    }

    // Delete the QC test
    await db.qCTest.delete({
      where: { id: params.id },
    });

    // Recalculate batch status based on remaining tests
    const remainingTests = await db.qCTest.findMany({
      where: { batchId: qcTest.batchId },
    });

    let batchStatus: string;
    if (remainingTests.length === 0) {
      batchStatus = 'QC_PENDING';
    } else {
      const allPassed = remainingTests.every(test => test.status === 'PASS');
      const anyFailed = remainingTests.some(test => test.status === 'FAIL');

      if (anyFailed) {
        batchStatus = 'QC_FAILED';
      } else if (allPassed) {
        batchStatus = 'QC_APPROVED';
      } else {
        batchStatus = 'QC_MARGINAL';
      }
    }

    await db.batchLog.update({
      where: { id: qcTest.batchId },
      data: { status: batchStatus },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'QC_TEST_DELETE',
        resourceType: 'QC_TEST',
        resourceId: params.id,
        oldValues: qcTest,
        newValues: { batchStatus },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return successResponse({ message: 'QC test deleted successfully', batchStatus });
  } catch (error) {
    return handleApiError(error);
  }
}
