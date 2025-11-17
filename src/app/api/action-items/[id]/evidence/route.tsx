import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const UploadEvidenceSchema = z.object({
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
  fileUrl: z.string(),
  thumbnailUrl: z.string().optional(),
  description: z.string().optional(),
  uploadedBy: z.string(),
  uploadedByName: z.string()
});

// GET /api/action-items/[id]/evidence - Get evidence for action item
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const evidence = await db.actionItemEvidence.findMany({
      where: { actionItemId: params.id },
      orderBy: { uploadedAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      evidence
    });

  } catch (error) {
    console.error('Error fetching evidence:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch evidence' },
      { status: 500 }
    );
  }
}

// POST /api/action-items/[id]/evidence - Upload evidence for action item
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validatedData = UploadEvidenceSchema.parse(body);

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

    const evidence = await db.actionItemEvidence.create({
      data: {
        actionItemId: params.id,
        fileName: validatedData.fileName,
        fileType: validatedData.fileType,
        fileSize: validatedData.fileSize,
        fileUrl: validatedData.fileUrl,
        thumbnailUrl: validatedData.thumbnailUrl,
        description: validatedData.description,
        uploadedBy: validatedData.uploadedBy,
        uploadedByName: validatedData.uploadedByName
      }
    });

    // Update action item timestamp
    await db.actionItem.update({
      where: { id: params.id },
      data: { updatedAt: new Date() }
    });

    return NextResponse.json({
      success: true,
      evidence,
      message: 'Evidence uploaded successfully'
    });

  } catch (error) {
    console.error('Error uploading evidence:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to upload evidence' },
      { status: 500 }
    );
  }
}