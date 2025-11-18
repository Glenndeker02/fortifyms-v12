import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const annotationSchema = z.object({
  auditId: z.string(),
  itemId: z.string(),
  type: z.enum(['HIGHLIGHT', 'TEXT_CALLOUT', 'ARROW', 'CIRCLE']),
  position: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number().optional(),
    height: z.number().optional(),
  }),
  content: z.string().optional(),
  color: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const auditId = searchParams.get('auditId')

    if (!auditId) {
      return NextResponse.json({ error: 'auditId is required' }, { status: 400 })
    }

    const annotations = await prisma.complianceAnnotation.findMany({
      where: { auditId },
      include: {
        annotator: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(annotations)
  } catch (error) {
    console.error('Error fetching annotations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch annotations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { auditId, itemId, type, position, content, color } = annotationSchema.parse(body)

    // Get annotator from session (simplified)
    const annotatorId = body.annotatorId

    const annotation = await prisma.complianceAnnotation.create({
      data: {
        auditId,
        itemId,
        annotatorId,
        type,
        position: JSON.stringify(position),
        content,
        metadata: JSON.stringify({ color }),
      },
      include: {
        annotator: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(annotation)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating annotation:', error)
    return NextResponse.json(
      { error: 'Failed to create annotation' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const annotationId = searchParams.get('id')

    if (!annotationId) {
      return NextResponse.json({ error: 'Annotation ID is required' }, { status: 400 })
    }

    await prisma.complianceAnnotation.delete({
      where: { id: annotationId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting annotation:', error)
    return NextResponse.json(
      { error: 'Failed to delete annotation' },
      { status: 500 }
    )
  }
}
