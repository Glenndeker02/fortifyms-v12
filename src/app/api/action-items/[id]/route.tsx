import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { UpdateActionItemRequestSchema } from '@/lib/action-items';

// GET /api/action-items/[id] - Get single action item
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actionItem = await db.actionItem.findUnique({
      where: { id: params.id },
      include: {
        alert: {
          select: {
            id: true,
            type: true,
            severity: true,
            title: true,
            message: true
          }
        },
        notes: {
          orderBy: { createdAt: 'desc' }
        },
        evidence: {
          orderBy: { uploadedAt: 'desc' }
        }
      }
    });

    if (!actionItem) {
      return NextResponse.json(
        { success: false, error: 'Action item not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const daysUntilDue = Math.ceil((actionItem.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = actionItem.dueDate < now && actionItem.status !== 'COMPLETED' && actionItem.status !== 'CANCELLED';
    const isDueSoon = daysUntilDue <= 1 && daysUntilDue >= 0 && actionItem.status !== 'COMPLETED' && actionItem.status !== 'CANCELLED';

    return NextResponse.json({
      success: true,
      actionItem: {
        ...actionItem,
        daysUntilDue,
        isOverdue,
        isDueSoon,
        tags: actionItem.tags ? JSON.parse(actionItem.tags) : []
      }
    });

  } catch (error) {
    console.error('Error fetching action item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch action item' },
      { status: 500 }
    );
  }
}

// PUT /api/action-items/[id] - Update action item
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validatedData = UpdateActionItemRequestSchema.parse(body);

    const actionItem = await db.actionItem.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        tags: validatedData.tags ? JSON.stringify(validatedData.tags) : undefined,
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

    return NextResponse.json({
      success: true,
      actionItem
    });

  } catch (error) {
    console.error('Error updating action item:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update action item' },
      { status: 500 }
    );
  }
}

// DELETE /api/action-items/[id] - Delete action item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.actionItem.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Action item deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting action item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete action item' },
      { status: 500 }
    );
  }
}