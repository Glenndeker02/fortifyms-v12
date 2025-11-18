import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const equipment = await prisma.equipment.findUnique({
      where: { id: params.id },
      include: {
        mill: true,
        maintenanceSchedules: {
          include: {
            tasks: {
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
        maintenanceTasks: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            assignee: {
              select: { name: true, email: true },
            },
          },
        },
        maintenanceAlerts: {
          where: {
            status: { in: ['ACTIVE', 'ACKNOWLEDGED'] },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    }

    return NextResponse.json(equipment)
  } catch (error) {
    console.error('Error fetching equipment:', error)
    return NextResponse.json(
      { error: 'Failed to fetch equipment' },
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

    const equipment = await prisma.equipment.update({
      where: { id: params.id },
      data: {
        ...body,
        installationDate: body.installationDate ? new Date(body.installationDate) : undefined,
      },
      include: {
        mill: true,
      },
    })

    return NextResponse.json(equipment)
  } catch (error) {
    console.error('Error updating equipment:', error)
    return NextResponse.json(
      { error: 'Failed to update equipment' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.equipment.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting equipment:', error)
    return NextResponse.json(
      { error: 'Failed to delete equipment' },
      { status: 500 }
    )
  }
}
