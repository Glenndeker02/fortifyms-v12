import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const equipmentSchema = z.object({
  name: z.string(),
  type: z.string(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  assetTag: z.string().optional(),
  installationDate: z.string().optional(),
  location: z.string().optional(),
  millId: z.string(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'DECOMMISSIONED']).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const millId = searchParams.get('millId')
    const type = searchParams.get('type')
    const status = searchParams.get('status')

    const where: any = {}
    if (millId) where.millId = millId
    if (type) where.type = type
    if (status) where.status = status

    const equipment = await prisma.equipment.findMany({
      where,
      include: {
        mill: {
          select: {
            name: true,
            code: true,
          },
        },
        maintenanceSchedules: {
          select: {
            id: true,
            type: true,
            frequency: true,
            nextDueDate: true,
          },
        },
        _count: {
          select: {
            maintenanceTasks: true,
            maintenanceAlerts: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(equipment)
  } catch (error) {
    console.error('Error fetching equipment:', error)
    return NextResponse.json(
      { error: 'Failed to fetch equipment' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = equipmentSchema.parse(body)

    const equipment = await prisma.equipment.create({
      data: {
        ...data,
        installationDate: data.installationDate ? new Date(data.installationDate) : null,
        status: data.status || 'ACTIVE',
      },
      include: {
        mill: true,
      },
    })

    return NextResponse.json(equipment)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating equipment:', error)
    return NextResponse.json(
      { error: 'Failed to create equipment' },
      { status: 500 }
    )
  }
}
