import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const ApproveActionItemSchema = z.object({
  approved: z.boolean(),
  rejectionReason: z.string().optional(),
  reviewedBy: z.string()
});

// POST /api/action-items/[id]/approve - Approve or reject completed action item
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validatedData = ApproveActionItemSchema.parse(body);

    // Get the action item first
    const actionItem = await db.actionItem.findUnique({
      where: { id: params.id }
    });

    if (!actionItem) {
      return NextResponse.json(
        { success: false, error: 'Action item not found' },
        { status: 404 }
      );
    }

    if (actionItem.status !== 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: 'Action item must be completed before approval' },
        { status: 400 }
      );
    }

    if (validatedData.approved) {
      // Approve the action item
      const updatedActionItem = await db.actionItem.update({
        where: { id: params.id },
        data: {
          approvedBy: validatedData.reviewedBy,
          approvedAt: new Date(),
          reviewedBy: validatedData.reviewedBy,
          reviewedAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Update the related alert status if exists
      if (actionItem.alertId) {
        await db.alert.update({
          where: { id: actionItem.alertId },
          data: {
            status: 'RESOLVED',
            resolvedAt: new Date(),
            resolvedById: validatedData.reviewedBy
          }
        });
      }

      // Create audit log
      await db.auditLog.create({
        data: {
          userId: validatedData.reviewedBy,
          action: 'APPROVE_ACTION_ITEM',
          resourceType: 'ACTION_ITEM',
          resourceId: params.id,
          newValues: JSON.stringify({
            approved: true,
            approvedAt: new Date()
          })
        }
      });

      return NextResponse.json({
        success: true,
        actionItem: updatedActionItem,
        message: 'Action item approved successfully'
      });

    } else {
      // Reject the completion - send back to in progress
      if (!validatedData.rejectionReason) {
        return NextResponse.json(
          { success: false, error: 'Rejection reason is required' },
          { status: 400 }
        );
      }

      const updatedActionItem = await db.actionItem.update({
        where: { id: params.id },
        data: {
          status: 'IN_PROGRESS',
          reviewedBy: validatedData.reviewedBy,
          reviewedAt: new Date(),
          rejectionReason: validatedData.rejectionReason,
          completedAt: null, // Reset completion
          updatedAt: new Date()
        }
      });

      // Create audit log
      await db.auditLog.create({
        data: {
          userId: validatedData.reviewedBy,
          action: 'REJECT_ACTION_ITEM_COMPLETION',
          resourceType: 'ACTION_ITEM',
          resourceId: params.id,
          newValues: JSON.stringify({
            status: 'IN_PROGRESS',
            rejectionReason: validatedData.rejectionReason
          })
        }
      });

      return NextResponse.json({
        success: true,
        actionItem: updatedActionItem,
        message: 'Action item completion rejected. Returned to in-progress status.'
      });
    }

  } catch (error) {
    console.error('Error approving action item:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to approve action item' },
      { status: 500 }
    );
  }
}