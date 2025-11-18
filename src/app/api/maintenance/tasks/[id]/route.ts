import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateNextDueDate } from '@/lib/maintenance-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const task = await prisma.maintenanceTask.findUnique({
      where: { id: params.id },
      include: {
        equipment: true,
        assignee: true,
        schedule: true,
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { action, ...updateData } = body

    if (action === 'complete') {
      // Complete the task and update schedule
      const task = await prisma.maintenanceTask.update({
        where: { id: params.id },
        data: {
          status: 'COMPLETED',
          completedDate: new Date(),
          notes: updateData.notes,
          calibrationData: updateData.calibrationData
            ? JSON.stringify(updateData.calibrationData)
            : null,
          partsReplaced: updateData.partsReplaced,
          issuesFound: updateData.issuesFound,
          evidenceUrls: updateData.evidenceUrls
            ? JSON.stringify(updateData.evidenceUrls)
            : null,
        },
        include: {
          schedule: true,
        },
      })

      // Update schedule's next due date
      if (task.scheduleId && task.schedule) {
        const nextDueDate = calculateNextDueDate(
          new Date(),
          task.schedule.frequency,
          task.schedule.frequencyValue
        )

        await prisma.maintenanceSchedule.update({
          where: { id: task.scheduleId },
          data: {
            lastPerformedDate: new Date(),
            nextDueDate,
          },
        })
      }

      // Update equipment status
      await prisma.equipment.update({
        where: { id: task.equipmentId },
        data: {
          lastCalibrationDate: new Date(),
          status: 'ACTIVE',
        },
      })

      return NextResponse.json(task)
    }

    // Regular update
    const task = await prisma.maintenanceTask.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}
