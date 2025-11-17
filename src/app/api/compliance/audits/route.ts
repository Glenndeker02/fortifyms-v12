import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
  requireAuth,
  getPaginationParams,
  getSortingParams,
} from '@/lib/api-helpers';
import { canAccessMillData, isMillStaff, isFWGAStaff } from '@/lib/auth';

/**
 * GET /api/compliance/audits
 * List compliance audits with pagination, filtering, and sorting
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - sortBy: Field to sort by (default: auditDate)
 * - sortOrder: Sort direction (asc/desc, default: desc)
 * - millId: Filter by mill ID
 * - status: Filter by audit status (IN_PROGRESS, PENDING_REVIEW, APPROVED, REJECTED)
 * - auditType: Filter by audit type
 * - startDate: Filter by date range (start)
 * - endDate: Filter by date range (end)
 *
 * Reference: TODO.md Phase 2 - Compliance Module
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    // Get pagination and sorting params
    const { skip, take } = getPaginationParams(request);
    const { orderBy } = getSortingParams(request, 'auditDate');

    // Get filter params
    const { searchParams } = new URL(request.url);
    const millId = searchParams.get('millId');
    const status = searchParams.get('status');
    const auditType = searchParams.get('auditType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause
    const where: any = {};

    // Role-based filtering
    if (isMillStaff(session.user.role)) {
      // Mill staff can only see audits from their mill
      if (!session.user.millId) {
        return errorResponse('User is not assigned to a mill', 403);
      }
      where.millId = session.user.millId;
    } else if (millId) {
      // FWGA staff and admins can filter by mill
      where.millId = millId;
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Audit type filter
    if (auditType) {
      where.auditType = auditType;
    }

    // Date range filter
    if (startDate || endDate) {
      where.auditDate = {};
      if (startDate) {
        where.auditDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.auditDate.lte = new Date(endDate);
      }
    }

    // Get audits with related data
    const [audits, total] = await Promise.all([
      db.complianceAudit.findMany({
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
              country: true,
              region: true,
            },
          },
          template: {
            select: {
              id: true,
              name: true,
              version: true,
              commodity: true,
              certificationType: true,
            },
          },
          auditor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          submitter: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              annotations: true,
            },
          },
        },
      }),
      db.complianceAudit.count({ where }),
    ]);

    return successResponse({
      audits,
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
 * POST /api/compliance/audits
 * Create a new compliance audit
 *
 * Body: ComplianceAuditInput (validated)
 *
 * Reference: newprd.md Module 3.2 (Digital Compliance)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    // Only mill staff and FWGA inspectors can create audits
    if (
      !isMillStaff(session.user.role) &&
      !isFWGAStaff(session.user.role) &&
      session.user.role !== 'SYSTEM_ADMIN'
    ) {
      return errorResponse('You do not have permission to create audits', 403);
    }

    const body = await request.json();

    const { templateId, auditType, auditDate, batchPeriod, notes, millId } = body;

    // Determine which mill to audit
    let targetMillId = millId;

    if (isMillStaff(session.user.role)) {
      // Mill staff can only create audits for their own mill
      if (!session.user.millId) {
        return errorResponse('User is not assigned to a mill', 403);
      }
      targetMillId = session.user.millId;
    } else {
      // FWGA staff must specify a mill
      if (!millId) {
        return errorResponse('Mill ID is required', 400);
      }
      targetMillId = millId;
    }

    // Verify template exists
    const template = await db.complianceTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return errorResponse('Template not found', 404);
    }

    // Create new audit
    const audit = await db.complianceAudit.create({
      data: {
        millId: targetMillId,
        templateId,
        auditorId: session.user.id,
        submittedBy: session.user.id,
        auditType,
        auditDate: auditDate ? new Date(auditDate) : new Date(),
        batchPeriod,
        notes,
        responses: {},
        status: 'IN_PROGRESS',
      },
      include: {
        mill: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
            version: true,
          },
        },
        auditor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'COMPLIANCE_AUDIT_CREATE',
        resourceType: 'COMPLIANCE_AUDIT',
        resourceId: audit.id,
        newValues: audit,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    // TODO: Create notification for mill manager
    // await createNotification({
    //   userId: millManagerId,
    //   type: 'AUDIT_STARTED',
    //   title: 'New Compliance Audit Started',
    //   message: `Audit ${audit.id} has been started for ${template.name}`,
    //   priority: 'NORMAL',
    //   link: `/compliance/audits/${audit.id}`,
    // });

    return successResponse(audit, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
