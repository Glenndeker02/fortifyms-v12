/**
 * Permission Middleware
 *
 * Middleware functions for enforcing permissions in API routes
 * Reference: newprd.md Section 3.9.1
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  Role,
  Permission,
  ResourceType,
  hasPermission,
  hasAllPermissions,
  canAccessMill,
  isMillStaff,
  getRoleName,
} from './rbac';
import { errorResponse } from './api-helpers';

/**
 * Session type with user data
 */
export interface AuthSession {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    millId: string | null;
    tenantId: string | null;
  };
}

/**
 * Get authenticated session and verify user has required permission
 */
export async function requirePermissions(
  permissions: Permission | Permission[],
  resourceName?: string
): Promise<AuthSession> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error('Authentication required');
  }

  const userRole = session.user.role as Role;
  const permissionsArray = Array.isArray(permissions) ? permissions : [permissions];

  // Check if user has all required permissions
  if (!hasAllPermissions(userRole, permissionsArray)) {
    const roleName = getRoleName(userRole);
    const resource = resourceName || 'this resource';
    throw new Error(
      `Access denied: ${roleName} does not have permission to access ${resource}`
    );
  }

  return session as AuthSession;
}

/**
 * Verify user has access to a specific mill
 */
export async function requireMillAccess(
  session: AuthSession,
  millId: string
): Promise<void> {
  if (!canAccessMill(session.user.role, session.user.millId, millId)) {
    throw new Error('Access denied: You do not have access to this mill');
  }
}

/**
 * Verify user can access a specific resource
 */
export async function requireResourceAccess(
  session: AuthSession,
  resourceType: ResourceType,
  resourceId: string
): Promise<any> {
  const userRole = session.user.role;

  // System admins can access everything
  if (userRole === Role.SYSTEM_ADMIN) {
    return await getResource(resourceType, resourceId);
  }

  const resource = await getResource(resourceType, resourceId);

  if (!resource) {
    throw new Error('Resource not found');
  }

  // Check mill-based access
  if (resource.millId && !canAccessMill(userRole, session.user.millId, resource.millId)) {
    throw new Error('Access denied: You do not have access to this resource');
  }

  // Check tenant-based access
  if (resource.tenantId && session.user.tenantId !== resource.tenantId) {
    throw new Error('Access denied: Resource belongs to different organization');
  }

  // Check user-specific access
  if (resourceType === ResourceType.ACTION_ITEM) {
    if (resource.assignedToId !== session.user.id && !isMillStaff(userRole)) {
      throw new Error('Access denied: Action item not assigned to you');
    }
  }

  if (resourceType === ResourceType.ALERT) {
    if (
      resource.recipientId !== session.user.id &&
      resource.recipientRole !== userRole &&
      !resource.escalations?.find((e: any) => e.escalatedToId === session.user.id)
    ) {
      throw new Error('Access denied: Alert not addressed to you');
    }
  }

  return resource;
}

/**
 * Get resource from database based on type
 */
async function getResource(resourceType: ResourceType, resourceId: string): Promise<any> {
  switch (resourceType) {
    case ResourceType.BATCH:
      return await db.batch.findUnique({
        where: { id: resourceId },
        select: { id: true, millId: true, tenantId: true },
      });

    case ResourceType.QC_TEST:
      return await db.qcTest.findUnique({
        where: { id: resourceId },
        include: { batch: { select: { millId: true, tenantId: true } } },
      });

    case ResourceType.COMPLIANCE_AUDIT:
      return await db.complianceAudit.findUnique({
        where: { id: resourceId },
        select: { id: true, millId: true, tenantId: true },
      });

    case ResourceType.EQUIPMENT:
      return await db.equipment.findUnique({
        where: { id: resourceId },
        select: { id: true, millId: true, tenantId: true },
      });

    case ResourceType.MAINTENANCE:
      return await db.maintenanceLog.findUnique({
        where: { id: resourceId },
        include: { equipment: { select: { millId: true, tenantId: true } } },
      });

    case ResourceType.TRAINING:
      return await db.training.findUnique({
        where: { id: resourceId },
        select: { id: true, tenantId: true },
      });

    case ResourceType.ALERT:
      return await db.alert.findUnique({
        where: { id: resourceId },
        include: {
          escalations: {
            select: { escalatedToId: true },
          },
        },
      });

    case ResourceType.ACTION_ITEM:
      return await db.actionItem.findUnique({
        where: { id: resourceId },
        select: { id: true, assignedToId: true, tenantId: true },
      });

    case ResourceType.ORDER:
      return await db.order.findUnique({
        where: { id: resourceId },
        select: { id: true, millId: true, tenantId: true, buyerId: true },
      });

    case ResourceType.DELIVERY:
      return await db.delivery.findUnique({
        where: { id: resourceId },
        include: {
          order: { select: { millId: true, tenantId: true, buyerId: true } },
        },
      });

    case ResourceType.MILL:
      return await db.mill.findUnique({
        where: { id: resourceId },
        select: { id: true, tenantId: true },
      });

    case ResourceType.USER:
      return await db.user.findUnique({
        where: { id: resourceId },
        select: { id: true, millId: true, tenantId: true },
      });

    default:
      return null;
  }
}

/**
 * Build WHERE clause for database queries based on user permissions
 */
export function buildPermissionWhere(session: AuthSession, baseWhere: any = {}): any {
  const userRole = session.user.role;

  // System admins can see everything
  if (userRole === Role.SYSTEM_ADMIN) {
    return baseWhere;
  }

  const where = { ...baseWhere };

  // Always filter by tenant
  if (session.user.tenantId) {
    where.tenantId = session.user.tenantId;
  }

  // Mill staff can only see their mill's data
  if (isMillStaff(userRole)) {
    if (!session.user.millId) {
      throw new Error('User not assigned to a mill');
    }
    where.millId = session.user.millId;
  }

  return where;
}

/**
 * Check if user owns a resource (created by them)
 */
export async function isResourceOwner(
  session: AuthSession,
  resourceType: ResourceType,
  resourceId: string
): Promise<boolean> {
  const resource = await getResource(resourceType, resourceId);

  if (!resource) {
    return false;
  }

  // Check various ownership fields
  return (
    resource.createdBy === session.user.id ||
    resource.userId === session.user.id ||
    resource.assignedToId === session.user.id
  );
}

/**
 * Verify user can modify a resource
 * Resources can typically only be modified by:
 * - The owner
 * - Users with higher hierarchy level
 * - System admins
 */
export async function requireModifyAccess(
  session: AuthSession,
  resourceType: ResourceType,
  resourceId: string,
  permission: Permission
): Promise<any> {
  // First check basic permission
  if (!hasPermission(session.user.role, permission)) {
    throw new Error('Access denied: Insufficient permissions');
  }

  // Get the resource
  const resource = await requireResourceAccess(session, resourceType, resourceId);

  // System admins can modify everything
  if (session.user.role === Role.SYSTEM_ADMIN) {
    return resource;
  }

  // Check if user is the owner
  const isOwner = await isResourceOwner(session, resourceType, resourceId);

  // For certain resources, only owners or supervisors can modify
  if (!isOwner && isMillStaff(session.user.role)) {
    // Mill managers can modify resources from their mill
    if (session.user.role !== Role.MILL_MANAGER) {
      throw new Error('Access denied: You can only modify resources you created');
    }
  }

  return resource;
}

/**
 * Get accessible mills for user
 */
export async function getAccessibleMills(session: AuthSession): Promise<string[]> {
  const userRole = session.user.role;

  // System admins and FWGA staff can access all mills in their tenant
  if (
    userRole === Role.SYSTEM_ADMIN ||
    userRole === Role.FWGA_INSPECTOR ||
    userRole === Role.FWGA_PROGRAM_MANAGER
  ) {
    const mills = await db.mill.findMany({
      where: session.user.tenantId ? { tenantId: session.user.tenantId } : {},
      select: { id: true },
    });
    return mills.map(m => m.id);
  }

  // Mill staff can only access their assigned mill
  if (isMillStaff(userRole) && session.user.millId) {
    return [session.user.millId];
  }

  // Institutional buyers and drivers have no direct mill access
  return [];
}

/**
 * Validate field-level permissions
 * Some fields may be restricted based on role
 */
export function validateFieldAccess(
  session: AuthSession,
  resourceType: ResourceType,
  field: string,
  action: 'read' | 'write'
): boolean {
  const userRole = session.user.role;

  // System admins have full access
  if (userRole === Role.SYSTEM_ADMIN) {
    return true;
  }

  // Define restricted fields
  const restrictedFields: Record<ResourceType, Record<string, Role[]>> = {
    [ResourceType.BATCH]: {
      approvedBy: [Role.MILL_MANAGER, Role.FWGA_PROGRAM_MANAGER],
      approvedAt: [Role.MILL_MANAGER, Role.FWGA_PROGRAM_MANAGER],
    },
    [ResourceType.QC_TEST]: {
      approvedBy: [Role.MILL_TECHNICIAN, Role.MILL_MANAGER, Role.FWGA_INSPECTOR],
      rejectedBy: [Role.MILL_TECHNICIAN, Role.MILL_MANAGER, Role.FWGA_INSPECTOR],
    },
    [ResourceType.COMPLIANCE_AUDIT]: {
      score: [Role.FWGA_INSPECTOR, Role.FWGA_PROGRAM_MANAGER],
      approvedBy: [Role.FWGA_INSPECTOR, Role.FWGA_PROGRAM_MANAGER],
    },
    [ResourceType.ORDER]: {
      approvedBy: [Role.INSTITUTIONAL_BUYER],
      totalCost: [Role.MILL_MANAGER, Role.INSTITUTIONAL_BUYER],
    },
    [ResourceType.USER]: {
      role: [Role.FWGA_PROGRAM_MANAGER, Role.SYSTEM_ADMIN],
      tenantId: [Role.SYSTEM_ADMIN],
    },
    // Default empty objects for other types
    [ResourceType.EQUIPMENT]: {},
    [ResourceType.MAINTENANCE]: {},
    [ResourceType.TRAINING]: {},
    [ResourceType.ALERT]: {},
    [ResourceType.ACTION_ITEM]: {},
    [ResourceType.DELIVERY]: {},
    [ResourceType.MILL]: {},
  };

  const fieldRestrictions = restrictedFields[resourceType]?.[field];

  // If field is not restricted, allow access
  if (!fieldRestrictions) {
    return true;
  }

  // If action is write, check if user's role is in allowed roles
  if (action === 'write') {
    return fieldRestrictions.includes(userRole);
  }

  // Read access is generally allowed if user can access the resource
  return true;
}
