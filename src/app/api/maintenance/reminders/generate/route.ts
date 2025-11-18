import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { shouldSendReminder, getDaysUntilDue } from '@/lib/maintenance-utils'

export async function POST(request: NextRequest) {
  try {
    const remindersGenerated: any[] = []
    const errors: any[] = []

    // Find all active schedules with upcoming due dates
    const schedules = await prisma.maintenanceSchedule.findMany({
      where: {
        isActive: true,
        nextDueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000), // Next 31 days
        },
      },
      include: {
        equipment: {
          select: {
            name: true,
            type: true,
            location: true,
            millId: true,
          },
        },
      },
    })

    // Find all pending/in-progress tasks with upcoming due dates
    const tasks = await prisma.maintenanceTask.findMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        scheduledDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        equipment: {
          select: {
            name: true,
            type: true,
            location: true,
            millId: true,
          },
        },
        assignee: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    // Process schedules
    for (const schedule of schedules) {
      try {
        // Parse reminder history
        let remindersSent: number[] = []
        if (schedule.remindersSent) {
          try {
            remindersSent = JSON.parse(schedule.remindersSent as string)
          } catch {
            remindersSent = []
          }
        }

        const reminderCheck = shouldSendReminder(schedule.nextDueDate, remindersSent)

        if (reminderCheck.shouldSend) {
          const daysRemaining = getDaysUntilDue(schedule.nextDueDate)

          // Create alert
          const alert = await prisma.alert.create({
            data: {
              type: 'MAINTENANCE',
              severity: daysRemaining <= 7 ? 'HIGH' : daysRemaining <= 14 ? 'MEDIUM' : 'LOW',
              title: `Maintenance Due: ${schedule.type}`,
              message: `${schedule.equipment.name} maintenance is due in ${daysRemaining} days`,
              targetId: schedule.id,
              millId: schedule.equipment.millId,
              metadata: JSON.stringify({
                scheduleId: schedule.id,
                equipmentName: schedule.equipment.name,
                equipmentType: schedule.equipment.type,
                location: schedule.equipment.location,
                maintenanceType: schedule.type,
                dueDate: schedule.nextDueDate,
                daysRemaining,
                reminderDay: reminderCheck.reminderDay,
              }),
            },
          })

          // Update reminder history
          const updatedReminders = [...remindersSent, reminderCheck.reminderDay]
          await prisma.maintenanceSchedule.update({
            where: { id: schedule.id },
            data: {
              remindersSent: JSON.stringify(updatedReminders),
            },
          })

          remindersGenerated.push({
            type: 'schedule',
            scheduleId: schedule.id,
            equipmentName: schedule.equipment.name,
            maintenanceType: schedule.type,
            daysRemaining,
            reminderDay: reminderCheck.reminderDay,
            alertId: alert.id,
          })
        }
      } catch (error) {
        console.error(`Error processing schedule ${schedule.id}:`, error)
        errors.push({
          type: 'schedule',
          id: schedule.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Process tasks
    for (const task of tasks) {
      try {
        // Parse reminder history
        let remindersSent: number[] = []
        if (task.remindersSent) {
          try {
            remindersSent = JSON.parse(task.remindersSent as string)
          } catch {
            remindersSent = []
          }
        }

        const reminderCheck = shouldSendReminder(task.scheduledDate, remindersSent)

        if (reminderCheck.shouldSend) {
          const daysRemaining = getDaysUntilDue(task.scheduledDate)

          // Determine severity based on priority and days remaining
          let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM'
          if (task.priority === 'CRITICAL' || daysRemaining <= 0) {
            severity = 'CRITICAL'
          } else if (task.priority === 'HIGH' || daysRemaining <= 7) {
            severity = 'HIGH'
          } else if (daysRemaining <= 14) {
            severity = 'MEDIUM'
          } else {
            severity = 'LOW'
          }

          // Create alert
          const alert = await prisma.alert.create({
            data: {
              type: 'MAINTENANCE',
              severity,
              title: `Maintenance Task Due: ${task.type}`,
              message: `${task.equipment.name} - ${task.description || task.type} is due in ${daysRemaining} days`,
              targetId: task.id,
              assignedTo: task.assignedTo,
              millId: task.equipment.millId,
              metadata: JSON.stringify({
                taskId: task.id,
                equipmentName: task.equipment.name,
                equipmentType: task.equipment.type,
                location: task.equipment.location,
                maintenanceType: task.type,
                priority: task.priority,
                scheduledDate: task.scheduledDate,
                daysRemaining,
                reminderDay: reminderCheck.reminderDay,
                assigneeName: task.assignee?.name,
                assigneeEmail: task.assignee?.email,
              }),
            },
          })

          // Update reminder history
          const updatedReminders = [...remindersSent, reminderCheck.reminderDay]
          await prisma.maintenanceTask.update({
            where: { id: task.id },
            data: {
              remindersSent: JSON.stringify(updatedReminders),
            },
          })

          remindersGenerated.push({
            type: 'task',
            taskId: task.id,
            equipmentName: task.equipment.name,
            maintenanceType: task.type,
            priority: task.priority,
            daysRemaining,
            reminderDay: reminderCheck.reminderDay,
            assignee: task.assignee?.name,
            alertId: alert.id,
          })
        }
      } catch (error) {
        console.error(`Error processing task ${task.id}:`, error)
        errors.push({
          type: 'task',
          id: task.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        schedulesProcessed: schedules.length,
        tasksProcessed: tasks.length,
        remindersGenerated: remindersGenerated.length,
        errors: errors.length,
      },
      reminders: remindersGenerated,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Error generating maintenance reminders:', error)
    return NextResponse.json(
      { error: 'Failed to generate reminders' },
      { status: 500 }
    )
  }
}

// Manual trigger for specific schedule or task
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { scheduleId, taskId, reminderDay } = body

    if (scheduleId) {
      const schedule = await prisma.maintenanceSchedule.findUnique({
        where: { id: scheduleId },
        include: {
          equipment: {
            select: {
              name: true,
              millId: true,
            },
          },
        },
      })

      if (!schedule) {
        return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
      }

      const daysRemaining = getDaysUntilDue(schedule.nextDueDate)

      const alert = await prisma.alert.create({
        data: {
          type: 'MAINTENANCE',
          severity: daysRemaining <= 7 ? 'HIGH' : 'MEDIUM',
          title: `Maintenance Reminder: ${schedule.type}`,
          message: `${schedule.equipment.name} maintenance is due in ${daysRemaining} days`,
          targetId: schedule.id,
          millId: schedule.equipment.millId,
          metadata: JSON.stringify({
            scheduleId: schedule.id,
            equipmentName: schedule.equipment.name,
            maintenanceType: schedule.type,
            dueDate: schedule.nextDueDate,
            daysRemaining,
            manualTrigger: true,
          }),
        },
      })

      return NextResponse.json({ success: true, alert })
    }

    if (taskId) {
      const task = await prisma.maintenanceTask.findUnique({
        where: { id: taskId },
        include: {
          equipment: {
            select: {
              name: true,
              millId: true,
            },
          },
          assignee: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      })

      if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }

      const daysRemaining = getDaysUntilDue(task.scheduledDate)

      const alert = await prisma.alert.create({
        data: {
          type: 'MAINTENANCE',
          severity: task.priority === 'CRITICAL' ? 'CRITICAL' : daysRemaining <= 7 ? 'HIGH' : 'MEDIUM',
          title: `Maintenance Task Reminder: ${task.type}`,
          message: `${task.equipment.name} - ${task.description || task.type} is due in ${daysRemaining} days`,
          targetId: task.id,
          assignedTo: task.assignedTo,
          millId: task.equipment.millId,
          metadata: JSON.stringify({
            taskId: task.id,
            equipmentName: task.equipment.name,
            maintenanceType: task.type,
            priority: task.priority,
            scheduledDate: task.scheduledDate,
            daysRemaining,
            assigneeName: task.assignee?.name,
            manualTrigger: true,
          }),
        },
      })

      return NextResponse.json({ success: true, alert })
    }

    return NextResponse.json({ error: 'scheduleId or taskId required' }, { status: 400 })
  } catch (error) {
    console.error('Error creating manual reminder:', error)
    return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 })
  }
}
