import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const sampleSchema = z.object({
  sampleId: z.string().optional(),
  collectionPoint: z.string(),
  collectionTime: z.string().optional(),
  sampledBy: z.string(),
  sampleQuantity: z.number(),
  visualInspection: z.string().optional(), // JSON
  photoUrls: z.string().optional(), // JSON
  notes: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const data = sampleSchema.parse(body)

    // Verify batch exists
    const batch = await prisma.batchLog.findUnique({
      where: { id: params.id },
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    // Generate sample ID if not provided
    const sampleId =
      data.sampleId ||
      `${batch.batchId}-S${(await prisma.qcSample.count({ where: { batchId: params.id } })) + 1}`

    const sample = await prisma.qcSample.create({
      data: {
        batchId: params.id,
        sampleId,
        collectionPoint: data.collectionPoint,
        collectionTime: data.collectionTime ? new Date(data.collectionTime) : new Date(),
        sampledBy: data.sampledBy,
        sampleQuantity: data.sampleQuantity,
        visualInspection: data.visualInspection,
        photoUrls: data.photoUrls,
        notes: data.notes,
      },
    })

    return NextResponse.json(sample)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating sample:', error)
    return NextResponse.json(
      { error: 'Failed to create sample' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const samples = await prisma.qcSample.findMany({
      where: { batchId: params.id },
      include: {
        tests: {
          include: {
            tester: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { collectionTime: 'asc' },
    })

    return NextResponse.json(samples)
  } catch (error) {
    console.error('Error fetching samples:', error)
    return NextResponse.json(
      { error: 'Failed to fetch samples' },
      { status: 500 }
    )
  }
}
