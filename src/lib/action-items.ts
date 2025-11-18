/**
 * Action Items Utilities
 *
 * Helper functions for managing action items
 */

import { db } from './db';
import { z } from 'zod';

export enum ActionItemPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ActionItemStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/**
 * Validation schemas
 */
export const UpdateActionItemRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  dueDate: z.string().datetime().optional(),
  assignedToId: z.string().uuid().optional(),
});

export interface ActionItemData {
  title: string;
  description: string;
  priority: ActionItemPriority;
  dueDate: Date;
  assignedToId: string;
  alertId?: string;
  relatedBatchId?: string;
  relatedEquipmentId?: string;
  createdBy: string;
  tenantId?: string | null;
}

/**
 * Create a new action item
 */
export async function createActionItem(data: ActionItemData) {
  return await db.actionItem.create({
    data: {
      ...data,
      status: ActionItemStatus.PENDING,
      isOverdue: false,
      createdAt: new Date(),
    },
    include: {
      assignedTo: {
        select: { id: true, name: true, email: true },
      },
      alert: {
        select: { id: true, type: true, severity: true },
      },
    },
  });
}

/**
 * Update action item status
 */
export async function updateActionItemStatus(
  actionItemId: string,
  status: ActionItemStatus,
  userId: string
) {
  const updateData: any = {
    status,
    updatedAt: new Date(),
  };

  if (status === ActionItemStatus.COMPLETED) {
    updateData.completedAt = new Date();
    updateData.completedBy = userId;
  }

  return await db.actionItem.update({
    where: { id: actionItemId },
    data: updateData,
  });
}

/**
 * Check for overdue action items and update flags
 */
export async function updateOverdueFlags() {
  const now = new Date();

  await db.actionItem.updateMany({
    where: {
      status: { in: [ActionItemStatus.PENDING, ActionItemStatus.IN_PROGRESS] },
      dueDate: { lt: now },
      isOverdue: false,
    },
    data: {
      isOverdue: true,
    },
  });
}

/**
 * Get action items for a user
 */
export async function getUserActionItems(
  userId: string,
  filters?: {
    status?: ActionItemStatus;
    priority?: ActionItemPriority;
    includeOverdue?: boolean;
  }
) {
  const where: any = {
    assignedToId: userId,
  };

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.priority) {
    where.priority = filters.priority;
  }

  if (filters?.includeOverdue) {
    where.isOverdue = true;
  }

  return await db.actionItem.findMany({
    where,
    include: {
      assignedTo: {
        select: { id: true, name: true, email: true },
      },
      alert: {
        select: { id: true, type: true, severity: true, title: true },
      },
      createdByUser: {
        select: { id: true, name: true },
      },
    },
    orderBy: [
      { isOverdue: 'desc' },
      { priority: 'desc' },
      { dueDate: 'asc' },
    ],
  });
}

/**
 * Get overdue count for a user
 */
export async function getOverdueCount(userId: string): Promise<number> {
  return await db.actionItem.count({
    where: {
      assignedToId: userId,
      isOverdue: true,
      status: { in: [ActionItemStatus.PENDING, ActionItemStatus.IN_PROGRESS] },
    },
  });
}

/**
 * Assign action item to a different user
 */
export async function reassignActionItem(
  actionItemId: string,
  newAssigneeId: string,
  reassignedBy: string
) {
  return await db.actionItem.update({
    where: { id: actionItemId },
    data: {
      assignedToId: newAssigneeId,
      updatedAt: new Date(),
    },
  });
}

/**
 * Get action items for a mill
 */
export async function getMillActionItems(
  millId: string,
  filters?: {
    status?: ActionItemStatus;
    includeOverdue?: boolean;
  }
) {
  const where: any = {
    assignedTo: {
      millId,
    },
  };

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.includeOverdue) {
    where.isOverdue = true;
  }

  return await db.actionItem.findMany({
    where,
    include: {
      assignedTo: {
        select: { id: true, name: true, email: true, role: true },
      },
      alert: {
        select: { id: true, type: true, severity: true, title: true },
      },
    },
    orderBy: [
      { isOverdue: 'desc' },
      { priority: 'desc' },
      { dueDate: 'asc' },
    ],
  });
}
