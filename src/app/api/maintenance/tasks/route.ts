import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateNextDueDate } from '@/lib/maintenance-utils'
import { z } from 'zod'

const taskSchema = z.object({
  equipmentId: z.string(),
  millId: z.string(),
  scheduleId: z.string().optional(),
  assignedTo: z.string(),
  type: z.string(),
  scheduledDate: z.string(),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const equipmentId = searchParams.get('equipmentId')
    const assignedTo = searchParams.get('assignedTo')
    const status = searchParams.get('status')
    const millId = searchParams.get('millId')

    const where: any = {}
    if (equipmentId) where.equipmentId = equipmentId
    if (assignedTo) where.assignedTo = assignedTo
    if (status) where.status = status
    if (millId) where.millId = millId

    const tasks = await prisma.maintenanceTask.findMany({
      where,
      include: {
        equipment: {
          select: {
            name: true,
            type: true,
            location: true,
          },
        },
        assignee: {
          select: {
            name: true,
            email: true,
          },
        },
        schedule: {
          select: {
            type: true,
            frequency: true,
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Error fetching maintenance tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = taskSchema.parse(body)

    const task = await prisma.maintenanceTask.create({
      data: {
        ...data,
        scheduledDate: new Date(data.scheduledDate),
        status: 'PENDING',
        priority: data.priority || 'MEDIUM',
      },
      include: {
        equipment: true,
        assignee: true,
      },
    })

    return NextResponse.json(task)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating maintenance task:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}
