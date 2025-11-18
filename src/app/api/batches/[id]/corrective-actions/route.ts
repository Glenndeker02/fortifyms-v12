import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const correctiveActionSchema = z.object({
  assignedBy: z.string(),
  assignedTo: z.string(),
  actionType: z.enum(['ROOT_CAUSE_ANALYSIS', 'CORRECTIVE_ACTION', 'PREVENTIVE_ACTION']),
  title: z.string(),
  description: z.string(),
  suspectedCause: z.string().optional(),
  evidence: z.string().optional(),
  verification: z.string().optional(),
  actions: z.string().optional(), // JSON array
  responsiblePerson: z.string().optional(),
  dueDate: z.string().optional(),
  batchDisposition: z
    .enum(['REWORK', 'DOWNGRADE', 'REJECT', 'HOLD_FOR_TESTING'])
    .optional(),
  dispositionReason: z.string().optional(),
  preventiveActions: z.string().optional(), // JSON array
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const data = correctiveActionSchema.parse(body)

    const batch = await prisma.batchLog.findUnique({
      where: { id: params.id },
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    const action = await prisma.correctiveAction.create({
      data: {
        batchId: params.id,
        assignedBy: data.assignedBy,
        assignedTo: data.assignedTo,
        actionType: data.actionType,
        title: data.title,
        description: data.description,
        suspectedCause: data.suspectedCause,
        evidence: data.evidence,
        verification: data.verification,
        actions: data.actions,
        responsiblePerson: data.responsiblePerson,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        batchDisposition: data.batchDisposition,
        dispositionReason: data.dispositionReason,
        preventiveActions: data.preventiveActions,
        status: 'PENDING',
      },
    })

    // Update batch status based on disposition
    if (data.batchDisposition) {
      let newStatus = batch.status
      if (data.batchDisposition === 'REJECT') {
        newStatus = 'QUARANTINED'
      } else if (data.batchDisposition === 'HOLD_FOR_TESTING') {
        newStatus = 'QC_PENDING'
      }

      await prisma.batchLog.update({
        where: { id: params.id },
        data: {
          status: newStatus,
          quarantineReason: data.dispositionReason,
        },
      })
    }

    return NextResponse.json(action)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating corrective action:', error)
    return NextResponse.json(
      { error: 'Failed to create corrective action' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actions = await prisma.correctiveAction.findMany({
      where: { batchId: params.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(actions)
  } catch (error) {
    console.error('Error fetching corrective actions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch corrective actions' },
      { status: 500 }
    )
  }
}

// Update corrective action status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { actionId, status, completedBy, approvedBy, notes } = body

    const updateData: any = {}
    if (status) updateData.status = status
    if (completedBy) {
      updateData.completedBy = completedBy
      updateData.completedAt = new Date()
    }
    if (approvedBy) {
      updateData.approvedBy = approvedBy
      updateData.approvedAt = new Date()
    }

    const action = await prisma.correctiveAction.update({
      where: { id: actionId },
      data: updateData,
    })

    return NextResponse.json(action)
  } catch (error) {
    console.error('Error updating corrective action:', error)
    return NextResponse.json(
      { error: 'Failed to update corrective action' },
      { status: 500 }
    )
  }
}
