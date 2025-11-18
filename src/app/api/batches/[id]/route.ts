import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateYield, calculatePremixVariance } from '@/lib/batch-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const batch = await prisma.batchLog.findUnique({
      where: { id: params.id },
      include: {
        operator: {
          select: {
            name: true,
            email: true,
          },
        },
        mill: {
          select: {
            name: true,
            code: true,
            country: true,
            region: true,
          },
        },
        qcSamples: {
          include: {
            tests: true,
          },
          orderBy: { collectionTime: 'asc' },
        },
        qcTests: {
          include: {
            tester: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: { testDate: 'desc' },
        },
        correctiveActions: {
          orderBy: { createdAt: 'desc' },
        },
        traceabilityRecords: {
          orderBy: { eventTime: 'desc' },
        },
      },
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    return NextResponse.json(batch)
  } catch (error) {
    console.error('Error fetching batch:', error)
    return NextResponse.json(
      { error: 'Failed to fetch batch' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { outputWeight, status, qcStatus, ...otherFields } = body

    const updateData: any = { ...otherFields }

    // Recalculate yield if output weight changed
    if (outputWeight !== undefined) {
      const batch = await prisma.batchLog.findUnique({
        where: { id: params.id },
        select: { inputWeight: true },
      })

      if (batch) {
        updateData.outputWeight = outputWeight
        updateData.yieldPercentage = calculateYield(batch.inputWeight, outputWeight)
      }
    }

    if (status) updateData.status = status
    if (qcStatus) updateData.qcStatus = qcStatus

    const updated = await prisma.batchLog.update({
      where: { id: params.id },
      data: updateData,
      include: {
        operator: {
          select: {
            name: true,
            email: true,
          },
        },
        mill: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating batch:', error)
    return NextResponse.json(
      { error: 'Failed to update batch' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.batchLog.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting batch:', error)
    return NextResponse.json(
      { error: 'Failed to delete batch' },
      { status: 500 }
    )
  }
}
