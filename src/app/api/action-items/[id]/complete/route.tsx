import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const CompleteActionItemSchema = z.object({
  completionNotes: z.string().optional(),
  completionEvidence: z.array(z.string()).optional(),
  actualHours: z.number().optional()
});

// POST /api/action-items/[id]/complete - Complete action item
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validatedData = CompleteActionItemSchema.parse(body);

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

    if (actionItem.status === 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: 'Action item is already completed' },
        { status: 400 }
      );
    }

    // Update action item with completion details
    const updatedActionItem = await db.actionItem.update({
      where: { id: params.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        completionNotes: validatedData.completionNotes,
        completionEvidence: validatedData.completionEvidence ? 
          JSON.stringify(validatedData.completionEvidence) : null,
        actualHours: validatedData.actualHours,
        updatedAt: new Date()
      },
      include: {
        alert: {
          select: {
            id: true,
            type: true,
            severity: true,
            title: true
          }
        }
      }
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        action: 'COMPLETE_ACTION_ITEM',
        resourceType: 'ACTION_ITEM',
        resourceId: params.id,
        newValues: JSON.stringify({
          status: 'COMPLETED',
          completedAt: new Date(),
          completionNotes: validatedData.completionNotes
        })
      }
    });

    // Notify manager for review if needed
    if (actionItem.priority === 'CRITICAL' || actionItem.priority === 'HIGH') {
      // Find manager in the same mill
      const manager = await db.user.findFirst({
        where: {
          millId: actionItem.millId,
          role: 'MILL_MANAGER',
          isActive: true
        }
      });

      if (manager) {
        await db.notificationPreference.create({
          data: {
            userId: manager.id,
            alertId: actionItem.alertId,
            type: 'ACTION_ITEM_REVIEW_REQUIRED',
            isEnabled: true,
            channels: JSON.stringify(['in_app', 'email'])
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      actionItem: updatedActionItem,
      message: 'Action item marked as completed and submitted for review'
    });

  } catch (error) {
    console.error('Error completing action item:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to complete action item' },
      { status: 500 }
    );
  }
}