import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const evidenceSchema = z.object({
  taskId: z.string().optional(),
  equipmentId: z.string(),
  millId: z.string(),
  type: z.enum(['CERTIFICATE', 'PHOTO', 'REPORT', 'OTHER']),
  fileUrl: z.string(), // In production, this would be uploaded to cloud storage first
  fileName: z.string(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  description: z.string().optional(),
  uploadedBy: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = evidenceSchema.parse(body)

    // In production, file upload would happen here:
    // 1. Validate file type and size
    // 2. Upload to cloud storage (S3, Azure Blob, etc.)
    // 3. Get secure URL
    // For now, we'll just store the reference

    // Create evidence record
    const evidence = await prisma.maintenanceEvidence.create({
      data: {
        equipmentId: data.equipmentId,
        taskId: data.taskId,
        millId: data.millId,
        type: data.type,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        description: data.description,
        uploadedBy: data.uploadedBy,
        uploadedAt: new Date(),
      },
    })

    // If this is for a task, update the task's evidence URLs
    if (data.taskId) {
      const task = await prisma.maintenanceTask.findUnique({
        where: { id: data.taskId },
      })

      if (task) {
        let evidenceUrls: string[] = []
        if (task.evidenceUrls) {
          try {
            evidenceUrls = JSON.parse(task.evidenceUrls as string)
          } catch {
            evidenceUrls = []
          }
        }

        evidenceUrls.push(data.fileUrl)

        await prisma.maintenanceTask.update({
          where: { id: data.taskId },
          data: {
            evidenceUrls: JSON.stringify(evidenceUrls),
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      evidence,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error uploading evidence:', error)
    return NextResponse.json(
      { error: 'Failed to upload evidence' },
      { status: 500 }
    )
  }
}

// Get evidence for equipment or task
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const equipmentId = searchParams.get('equipmentId')
    const taskId = searchParams.get('taskId')
    const type = searchParams.get('type')

    const where: any = {}
    if (equipmentId) where.equipmentId = equipmentId
    if (taskId) where.taskId = taskId
    if (type) where.type = type

    const evidence = await prisma.maintenanceEvidence.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
      include: {
        equipment: {
          select: {
            name: true,
            type: true,
          },
        },
        task: {
          select: {
            type: true,
            completedDate: true,
          },
        },
      },
    })

    return NextResponse.json(evidence)
  } catch (error) {
    console.error('Error fetching evidence:', error)
    return NextResponse.json(
      { error: 'Failed to fetch evidence' },
      { status: 500 }
    )
  }
}

// Delete evidence
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Evidence ID required' }, { status: 400 })
    }

    const evidence = await prisma.maintenanceEvidence.findUnique({
      where: { id },
    })

    if (!evidence) {
      return NextResponse.json({ error: 'Evidence not found' }, { status: 404 })
    }

    // In production, delete file from cloud storage here

    // Remove from task's evidence URLs if applicable
    if (evidence.taskId) {
      const task = await prisma.maintenanceTask.findUnique({
        where: { id: evidence.taskId },
      })

      if (task && task.evidenceUrls) {
        try {
          let evidenceUrls: string[] = JSON.parse(task.evidenceUrls as string)
          evidenceUrls = evidenceUrls.filter((url) => url !== evidence.fileUrl)

          await prisma.maintenanceTask.update({
            where: { id: evidence.taskId },
            data: {
              evidenceUrls: JSON.stringify(evidenceUrls),
            },
          })
        } catch {
          // Skip if parsing fails
        }
      }
    }

    await prisma.maintenanceEvidence.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Evidence deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting evidence:', error)
    return NextResponse.json(
      { error: 'Failed to delete evidence' },
      { status: 500 }
    )
  }
}
