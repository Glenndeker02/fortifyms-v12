import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateNextDueDate } from '@/lib/maintenance-utils'
import { z } from 'zod'

const scheduleSchema = z.object({
  equipmentId: z.string(),
  millId: z.string(),
  type: z.enum(['CALIBRATION', 'CLEANING', 'LUBRICATION', 'INSPECTION', 'REPLACEMENT']),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  frequencyValue: z.number().min(1),
  description: z.string().optional(),
  estimatedDuration: z.number().optional(),
  requiredMaterials: z.string().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const equipmentId = searchParams.get('equipmentId')
    const millId = searchParams.get('millId')
    const type = searchParams.get('type')

    const where: any = {}
    if (equipmentId) where.equipmentId = equipmentId
    if (millId) where.millId = millId
    if (type) where.type = type

    const schedules = await prisma.maintenanceSchedule.findMany({
      where,
      include: {
        equipment: {
          select: {
            name: true,
            type: true,
            location: true,
          },
        },
        tasks: {
          where: {
            status: { in: ['PENDING', 'IN_PROGRESS'] },
          },
          orderBy: { scheduledDate: 'asc' },
          take: 5,
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      orderBy: { nextDueDate: 'asc' },
    })

    return NextResponse.json(schedules)
  } catch (error) {
    console.error('Error fetching maintenance schedules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch schedules' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = scheduleSchema.parse(body)

    const lastPerformedDate = new Date() // Or get from request
    const nextDueDate = calculateNextDueDate(
      lastPerformedDate,
      data.frequency,
      data.frequencyValue
    )

    const schedule = await prisma.maintenanceSchedule.create({
      data: {
        ...data,
        lastPerformedDate,
        nextDueDate,
        isActive: data.isActive !== false,
      },
      include: {
        equipment: true,
      },
    })

    return NextResponse.json(schedule)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating maintenance schedule:', error)
    return NextResponse.json(
      { error: 'Failed to create schedule' },
      { status: 500 }
    )
  }
}
