import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { qcTestSchema } from '@/lib/validations';
import {
  successResponse,
  errorResponse,
  handleApiError,
  getPaginationParams,
  getSortingParams,
} from '@/lib/api-helpers';
import { requirePermissions, buildPermissionWhere } from '@/lib/permissions-middleware';
import { Permission, isMillStaff } from '@/lib/rbac';

/**
 * GET /api/qc
 * List QC tests with pagination, filtering, and sorting
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - sortBy: Field to sort by (default: createdAt)
 * - sortOrder: Sort direction (asc/desc, default: desc)
 * - batchId: Filter by batch ID
 * - status: Filter by test status (PASS, MARGINAL, FAIL)
 * - millId: Filter by mill ID
 * - startDate: Filter by date range (start)
 * - endDate: Filter by date range (end)
 *
 * Reference: TODO.md Phase 2 - QC Testing Module
 */
export async function GET(request: NextRequest) {
  try {
    // Check permission and get session
    const session = await requirePermissions(Permission.QC_TEST_VIEW, 'QC tests');

    // Get pagination and sorting params
    const { skip, take } = getPaginationParams(request);
    const { orderBy } = getSortingParams(request);

    // Get filter params
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const status = searchParams.get('status');
    const millId = searchParams.get('millId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build base where clause
    const baseWhere: any = {};

    // Batch filter
    if (batchId) {
      baseWhere.batchId = batchId;
    }

    // Mill filter through batch relationship
    if (millId && !isMillStaff(session.user.role)) {
      // Only allow FWGA staff to filter by mill (mill staff auto-filtered)
      baseWhere.batch = { millId };
    }

    // Status filter
    if (status) {
      baseWhere.status = status;
    }

    // Date range filter
    if (startDate || endDate) {
      baseWhere.testDate = {};
      if (startDate) {
        baseWhere.testDate.gte = new Date(startDate);
      }
      if (endDate) {
        baseWhere.testDate.lte = new Date(endDate);
      }
    }

    // For mill staff, filter through batch relationship
    let where = baseWhere;
    if (isMillStaff(session.user.role) && session.user.millId) {
      where = {
        ...baseWhere,
        batch: {
          ...baseWhere.batch,
          millId: session.user.millId,
        },
      };
    }

    // Get QC tests with related data
    const [qcTests, total] = await Promise.all([
      db.qCTest.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          batch: {
            select: {
              id: true,
              batchId: true,
              productType: true,
              productionLine: true,
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
              collectionTime: true,
            },
          },
        },
      }),
      db.qCTest.count({ where }),
    ]);

    return successResponse({
      qcTests,
      pagination: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/qc
 * Create a new QC test entry
 *
 * Body: QCTestInput (validated with Zod)
 *
 * Reference: newprd.md Module 3.4.2 (QC Testing Interface)
 */
export async function POST(request: NextRequest) {
  try {
    // Check permission and get session
    const session = await requirePermissions(Permission.QC_TEST_CREATE, 'QC tests');

    const body = await request.json();

    // Validate input
    const validatedData = qcTestSchema.parse(body);

    // Get the batch to check access and mill info
    const batch = await db.batchLog.findUnique({
      where: { id: validatedData.batchId },
      include: {
        mill: {
          select: {
            id: true,
            code: true,
          },
        },
      },
    });

    if (!batch) {
      return errorResponse('Batch not found', 404);
    }

    // Check mill access for mill staff (FWGA can access any mill)
    if (isMillStaff(session.user.role)) {
      if (session.user.millId !== batch.mill.id) {
        return errorResponse('You do not have access to this batch', 403);
      }
    }

    // Create QC sample first (if not linked to existing sample)
    let sampleId = validatedData.sampleId;

    if (!sampleId) {
      // Generate sample ID
      // Format: {MILL_CODE}-S-{YYYYMMDD}-{SEQUENCE}
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todaySampleCount = await db.qCSample.count({
        where: {
          batchId: validatedData.batchId,
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      const sequence = (todaySampleCount + 1).toString().padStart(4, '0');
      const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
      const generatedSampleId = `${batch.mill.code}-S-${dateStr}-${sequence}`;

      // Create the sample
      const sample = await db.qCSample.create({
        data: {
          batchId: validatedData.batchId,
          sampleId: generatedSampleId,
          collectionPoint: validatedData.sampleCollectionPoint,
          collectionTime: validatedData.sampleCollectionTime,
          sampledBy: validatedData.sampledBy,
          sampleQuantity: validatedData.sampleQuantity,
          visualInspection: JSON.stringify({
            colorUniformity: validatedData.colorUniformity,
            odor: validatedData.odor,
            texture: validatedData.texture,
            foreignMatterPresent: validatedData.foreignMatterPresent,
            foreignMatterDescription: validatedData.foreignMatterDescription,
          }),
          photoUrls: validatedData.samplePhotos ? JSON.stringify(validatedData.samplePhotos) : null,
          notes: validatedData.notes,
        },
      });

      sampleId = sample.id;
    }

    // Create QC tests for each test result
    const createdTests = [];

    for (const testResult of validatedData.testResults) {
      // Calculate deviation
      const deviation = testResult.resultValue - testResult.targetValue;
      const deviationPercent = (deviation / testResult.targetValue) * 100;
      const toleranceValue = (testResult.targetValue * testResult.tolerancePercent) / 100;

      // Determine status based on deviation and tolerance
      let status: string;
      if (Math.abs(deviation) <= toleranceValue) {
        status = 'PASS';
      } else if (Math.abs(deviation) <= toleranceValue * 1.5) {
        status = 'MARGINAL';
      } else {
        status = 'FAIL';
      }

      const qcTest = await db.qCTest.create({
        data: {
          batchId: validatedData.batchId,
          sampleId,
          testerId: session.user.id,
          testType: testResult.testType,
          testMethod: testResult.testLocation.includes('Lab') ? 'Laboratory Analysis' : 'On-site Testing',
          testLocation: testResult.testLocation,
          testDate: testResult.testDate,
          result: testResult.resultValue,
          unit: testResult.unit,
          target: testResult.targetValue,
          tolerance: testResult.tolerancePercent,
          deviation: deviationPercent,
          status,
          labCertificate: testResult.labCertificateNumber,
          labReportUrl: testResult.labReportFile,
        },
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

      createdTests.push(qcTest);
    }

    // Update batch status based on QC results
    const allPassed = createdTests.every(test => test.status === 'PASS');
    const anyFailed = createdTests.some(test => test.status === 'FAIL');

    let batchStatus: string;
    if (anyFailed) {
      batchStatus = 'QC_FAILED';
    } else if (allPassed) {
      batchStatus = 'QC_APPROVED';
    } else {
      batchStatus = 'QC_MARGINAL';
    }

    await db.batchLog.update({
      where: { id: validatedData.batchId },
      data: { status: batchStatus },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'QC_TEST_CREATE',
        resourceType: 'QC_TEST',
        resourceId: createdTests[0].id,
        newValues: { tests: createdTests, batchStatus },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    // TODO: Create notification for batch operator
    // await createNotification({
    //   userId: batch.operatorId,
    //   type: allPassed ? 'QC_APPROVED' : 'QC_FAILED',
    //   title: allPassed ? 'Batch QC Approved' : 'Batch QC Failed',
    //   message: `QC testing completed for batch ${batch.batchId}`,
    //   priority: anyFailed ? 'HIGH' : 'NORMAL',
    //   link: `/batches/${batch.id}`,
    // });

    return successResponse(
      {
        tests: createdTests,
        batchStatus,
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
