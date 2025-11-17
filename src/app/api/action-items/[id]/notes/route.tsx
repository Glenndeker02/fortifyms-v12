import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const CreateNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required'),
  userId: z.string(),
  userName: z.string(),
  isInternal: z.boolean().default(false)
});

// GET /api/action-items/[id]/notes - Get notes for action item
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const notes = await db.actionItemNote.findMany({
      where: { actionItemId: params.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      notes
    });

  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

// POST /api/action-items/[id]/notes - Add note to action item
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validatedData = CreateNoteSchema.parse(body);

    // Verify action item exists
    const actionItem = await db.actionItem.findUnique({
      where: { id: params.id }
    });

    if (!actionItem) {
      return NextResponse.json(
        { success: false, error: 'Action item not found' },
        { status: 404 }
      );
    }

    const note = await db.actionItemNote.create({
      data: {
        actionItemId: params.id,
        userId: validatedData.userId,
        userName: validatedData.userName,
        content: validatedData.content,
        isInternal: validatedData.isInternal
      }
    });

    // Update action item timestamp
    await db.actionItem.update({
      where: { id: params.id },
      data: { updatedAt: new Date() }
    });

    return NextResponse.json({
      success: true,
      note,
      message: 'Note added successfully'
    });

  } catch (error) {
    console.error('Error adding note:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to add note' },
      { status: 500 }
    );
  }
}