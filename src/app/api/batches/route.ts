import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { batchLogSchema } from '@/lib/validations';
import {
  successResponse,
  errorResponse,
  handleApiError,
  getPaginationParams,
  getSortingParams,
} from '@/lib/api-helpers';
import { requirePermissions, buildPermissionWhere } from '@/lib/permissions-middleware';
import { Permission } from '@/lib/rbac';

/**
 * GET /api/batches
 * List batches with pagination, filtering, and sorting
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - sortBy: Field to sort by (default: createdAt)
 * - sortOrder: Sort direction (asc/desc, default: desc)
 * - millId: Filter by mill ID
 * - status: Filter by batch status
 * - startDate: Filter by date range (start)
 * - endDate: Filter by date range (end)
 *
 * Reference: TODO.md Phase 2 - Batch Management Module
 */
export async function GET(request: NextRequest) {
  try {
    // Check permission and get session
    const session = await requirePermissions(Permission.BATCH_VIEW, 'batches');

    // Get pagination and sorting params
    const { skip, take } = getPaginationParams(request);
    const { orderBy } = getSortingParams(request);

    // Get filter params
    const { searchParams } = new URL(request.url);
    const millId = searchParams.get('millId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause with automatic tenant/mill filtering
    const baseWhere: any = {};

    // Optional mill filter (for FWGA staff viewing specific mills)
    if (millId) {
      baseWhere.millId = millId;
    }

    // Status filter
    if (status) {
      baseWhere.status = status;
    }

    // Date range filter
    if (startDate || endDate) {
      baseWhere.createdAt = {};
      if (startDate) {
        baseWhere.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        baseWhere.createdAt.lte = new Date(endDate);
      }
    }

    // Apply permission-based filtering (tenant/mill isolation)
    const where = buildPermissionWhere(session, baseWhere);

    // Get batches with related data
    const [batches, total] = await Promise.all([
      db.batchLog.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          mill: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          operator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          qcTests: {
            select: {
              id: true,
              testType: true,
              status: true,
              result: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 5,
          },
        },
      }),
      db.batchLog.count({ where }),
    ]);

    return successResponse({
      batches,
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
 * POST /api/batches
 * Create a new batch log entry
 *
 * Body: BatchLogInput (validated with Zod)
 *
 * Reference: newprd.md Module 3.3.1 (Batch Logging Interface)
 */
export async function POST(request: NextRequest) {
  try {
    // Check permission and get session
    const session = await requirePermissions(Permission.BATCH_CREATE, 'batches');

    // Mill staff must have a mill assigned
    if (!session.user.millId) {
      return errorResponse('User is not assigned to a mill', 403);
    }

    const body = await request.json();

    // Validate input
    const validatedData = batchLogSchema.parse(body);

    // Ensure mill ID matches user's mill (enforces tenant isolation)
    if (validatedData.millId !== session.user.millId) {
      return errorResponse('You can only create batches for your assigned mill', 403);
    }

    // Generate batch ID
    // Format: {MILL_CODE}-L{LINE}-{YYYYMMDD}-{SEQUENCE}
    const mill = await db.mill.findUnique({
      where: { id: validatedData.millId },
      select: { code: true },
    });

    if (!mill) {
      return errorResponse('Mill not found', 404);
    }

    // Get today's batch count for this mill/line to generate sequence number
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayBatchCount = await db.batchLog.count({
      where: {
        millId: validatedData.millId,
        productionLine: validatedData.productionLine,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    const sequence = (todayBatchCount + 1).toString().padStart(4, '0');
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const lineNum = validatedData.productionLine.replace(/\D/g, ''); // Extract number from "Line 1"
    const batchId = `${mill.code}-L${lineNum}-${dateStr}-${sequence}`;

    // Calculate premix variance
    const variance = validatedData.actualPremixUsed - validatedData.expectedPremix;
    const variancePercentage = (variance / validatedData.expectedPremix) * 100;

    // Create batch log
    const batch = await db.batchLog.create({
      data: {
        batchId,
        millId: validatedData.millId,
        operatorId: session.user.id,
        productionLine: validatedData.productionLine,
        cropType: validatedData.cropType,
        productType: validatedData.productType,
        inputWeight: validatedData.inputWeight,
        outputWeight: validatedData.outputWeight,
        premixType: validatedData.premixType,
        premixBatchNumber: validatedData.premixBatchNumber,
        targetFortification: validatedData.targetFortification || {},
        actualPremixUsed: validatedData.actualPremixUsed,
        expectedPremix: validatedData.expectedPremix,
        variance: variancePercentage,
        status: 'QC_PENDING',
        notes: validatedData.notes,
      },
      include: {
        mill: {
          select: {
            id: true,
            name: true,
            code: true,
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
    });

    // TODO: Create notification for QC team
    // await createNotification({
    //   userId: qcTeamId,
    //   type: 'QC_PENDING',
    //   title: 'New Batch Requires QC Testing',
    //   message: `Batch ${batchId} is pending QC testing`,
    //   priority: 'HIGH',
    //   link: `/batches/${batch.id}`,
    // });

    return successResponse(batch, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
