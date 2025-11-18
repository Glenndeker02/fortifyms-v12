/**
 * Example API Route with RBAC
 *
 * This file demonstrates how to use the RBAC system in API routes.
 * Use this as a reference when implementing permission checks in your routes.
 *
 * Reference: src/lib/rbac.ts, src/lib/permissions-middleware.ts
 */

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
  getPaginationParams,
} from '@/lib/api-helpers';
import {
  requirePermissions,
  requireResourceAccess,
  requireMillAccess,
  buildPermissionWhere,
  getAccessibleMills,
} from '@/lib/permissions-middleware';
import {
  Permission,
  ResourceType,
  hasPermission,
  isMillStaff,
} from '@/lib/rbac';

/**
 * Example 1: Simple permission check
 *
 * GET /api/example-rbac-usage
 * Requires BATCH_VIEW permission
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user has BATCH_VIEW permission
    const session = await requirePermissions(Permission.BATCH_VIEW, 'batches');

    const { skip, take } = getPaginationParams(request);

    // Build WHERE clause with permission-based filtering
    // This automatically filters by tenant and mill for mill staff
    const where = buildPermissionWhere(session, {
      status: { not: 'DELETED' },
    });

    const [batches, total] = await Promise.all([
      db.batch.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          mill: { select: { id: true, name: true } },
          operator: { select: { id: true, name: true } },
        },
      }),
      db.batch.count({ where }),
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
 * Example 2: Multiple permission check
 *
 * POST /api/example-rbac-usage
 * Requires both BATCH_CREATE and BATCH_EDIT permissions
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user has multiple permissions
    const session = await requirePermissions(
      [Permission.BATCH_CREATE, Permission.BATCH_EDIT],
      'batch creation'
    );

    const body = await request.json();
    const { millId, batchNumber, quantityProduced } = body;

    // Validate required fields
    if (!millId || !batchNumber || !quantityProduced) {
      return errorResponse('Missing required fields', 400);
    }

    // Verify user has access to the specified mill
    await requireMillAccess(session, millId);

    // Create batch
    const batch = await db.batch.create({
      data: {
        millId,
        batchNumber,
        quantityProduced,
        status: 'PENDING',
        operatorId: session.user.id,
        tenantId: session.user.tenantId,
        createdAt: new Date(),
      },
      include: {
        mill: { select: { id: true, name: true } },
        operator: { select: { id: true, name: true } },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'BATCH_CREATE',
        resourceType: 'BATCH',
        resourceId: batch.id,
        newValues: batch,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return successResponse(batch, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Example 3: Resource-specific access check
 *
 * GET /api/example-rbac-usage/[id]
 * Requires BATCH_VIEW permission and access to specific batch
 */
export async function getBatchById(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check basic permission first
    const session = await requirePermissions(Permission.BATCH_VIEW, 'batch');

    // Check access to specific resource
    // This verifies:
    // - Resource exists
    // - User's tenant matches resource tenant
    // - User's mill matches resource mill (for mill staff)
    // - User is the assignee (for user-specific resources)
    const batch = await requireResourceAccess(
      session,
      ResourceType.BATCH,
      params.id
    );

    return successResponse(batch);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Example 4: Conditional permission check
 *
 * PATCH /api/example-rbac-usage/[id]
 * Different permissions required based on the action
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermissions(Permission.BATCH_EDIT, 'batch');
    const body = await request.json();

    // Get the batch
    const batch = await requireResourceAccess(
      session,
      ResourceType.BATCH,
      params.id
    );

    // Check specific permissions for sensitive operations
    if (body.status === 'APPROVED') {
      // Only certain roles can approve batches
      if (!hasPermission(session.user.role, Permission.BATCH_APPROVE)) {
        return errorResponse('You do not have permission to approve batches', 403);
      }
    }

    // Update batch
    const updatedBatch = await db.batch.update({
      where: { id: params.id },
      data: {
        ...body,
        updatedAt: new Date(),
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'BATCH_UPDATE',
        resourceType: 'BATCH',
        resourceId: params.id,
        oldValues: batch,
        newValues: updatedBatch,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return successResponse(updatedBatch);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Example 5: Getting accessible resources based on role
 *
 * GET /api/example-rbac-usage/accessible-mills
 * Returns mills the user can access
 */
export async function getAccessibleMillsExample(request: NextRequest) {
  try {
    const session = await requirePermissions(Permission.MILL_VIEW, 'mills');

    // Get all mills user can access
    const millIds = await getAccessibleMills(session);

    const mills = await db.mill.findMany({
      where: {
        id: { in: millIds },
        active: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        region: true,
      },
      orderBy: { name: 'asc' },
    });

    return successResponse({ mills });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Example 6: Manual permission check for complex logic
 *
 * POST /api/example-rbac-usage/complex
 * Custom logic with manual permission checks
 */
export async function complexPermissionExample(request: NextRequest) {
  try {
    // First, just authenticate the user
    const session = await requirePermissions([], 'this operation');

    const body = await request.json();
    const { action, resourceId } = body;

    // Different permissions for different actions
    let requiredPermission: Permission;

    switch (action) {
      case 'approve':
        requiredPermission = Permission.BATCH_APPROVE;
        break;
      case 'reject':
        requiredPermission = Permission.QC_TEST_REJECT;
        break;
      case 'escalate':
        requiredPermission = Permission.ALERT_CREATE;
        break;
      default:
        return errorResponse('Invalid action', 400);
    }

    // Check if user has the required permission
    if (!hasPermission(session.user.role, requiredPermission)) {
      return errorResponse(
        `You do not have permission to ${action} this resource`,
        403
      );
    }

    // Verify access to the resource
    const resource = await requireResourceAccess(
      session,
      ResourceType.BATCH,
      resourceId
    );

    // Perform the action
    // ... implementation ...

    return successResponse({ message: `Action ${action} completed` });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Example 7: Mill staff-specific checks
 *
 * GET /api/example-rbac-usage/mill-data
 * Only accessible by mill staff
 */
export async function getMillDataExample(request: NextRequest) {
  try {
    const session = await requirePermissions(
      Permission.ANALYTICS_MILL,
      'mill analytics'
    );

    // Ensure user is mill staff
    if (!isMillStaff(session.user.role)) {
      return errorResponse('This endpoint is only accessible by mill staff', 403);
    }

    // Ensure user has a mill assigned
    if (!session.user.millId) {
      return errorResponse('User is not assigned to a mill', 400);
    }

    // Get mill-specific data
    const millData = await db.mill.findUnique({
      where: { id: session.user.millId },
      include: {
        batches: {
          where: { status: 'COMPLETED' },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        equipment: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    return successResponse(millData);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * BEST PRACTICES SUMMARY:
 *
 * 1. Always use requirePermissions() at the start of your route handler
 * 2. Use requireResourceAccess() when accessing specific resources by ID
 * 3. Use requireMillAccess() when accessing mill-specific data
 * 4. Use buildPermissionWhere() for list queries to automatically filter by tenant/mill
 * 5. Use hasPermission() for conditional logic within your handler
 * 6. Always create audit logs for sensitive operations
 * 7. Return appropriate error messages with proper status codes
 * 8. Validate data isolation with tenant checks
 *
 * COMMON PATTERNS:
 *
 * // GET list of resources
 * const session = await requirePermissions(Permission.RESOURCE_VIEW);
 * const where = buildPermissionWhere(session, { status: 'ACTIVE' });
 * const resources = await db.resource.findMany({ where });
 *
 * // GET single resource
 * const session = await requirePermissions(Permission.RESOURCE_VIEW);
 * const resource = await requireResourceAccess(session, ResourceType.RESOURCE, id);
 *
 * // POST create resource
 * const session = await requirePermissions(Permission.RESOURCE_CREATE);
 * await requireMillAccess(session, millId);
 * const resource = await db.resource.create({ data: { ...body, tenantId: session.user.tenantId } });
 *
 * // PATCH update resource
 * const session = await requirePermissions(Permission.RESOURCE_EDIT);
 * const resource = await requireResourceAccess(session, ResourceType.RESOURCE, id);
 * const updated = await db.resource.update({ where: { id }, data: body });
 *
 * // DELETE delete resource
 * const session = await requirePermissions(Permission.RESOURCE_DELETE);
 * const resource = await requireResourceAccess(session, ResourceType.RESOURCE, id);
 * await db.resource.delete({ where: { id } });
 */
