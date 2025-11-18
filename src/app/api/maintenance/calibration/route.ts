import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateCalibration, CalibrationMeasurement } from '@/lib/maintenance-utils'
import { z } from 'zod'

const measurementSchema = z.object({
  testPoint: z.number(),
  expectedValue: z.number(),
  actualValue: z.number(),
  unit: z.string(),
  tolerance: z.number(),
})

const calibrationSchema = z.object({
  taskId: z.string(),
  equipmentId: z.string(),
  performedBy: z.string(),
  measurements: z.array(measurementSchema),
  notes: z.string().optional(),
  evidenceUrls: z.array(z.string()).optional(),
  environmentalConditions: z
    .object({
      temperature: z.number().optional(),
      humidity: z.number().optional(),
      pressure: z.number().optional(),
    })
    .optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = calibrationSchema.parse(body)

    // Validate calibration measurements
    const validation = validateCalibration(data.measurements)

    // Get task and equipment details
    const task = await prisma.maintenanceTask.findUnique({
      where: { id: data.taskId },
      include: {
        equipment: true,
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Create calibration record
    const calibrationData = {
      measurements: data.measurements,
      validation: {
        isValid: validation.isValid,
        overallOffset: validation.overallOffset,
        failedPoints: validation.failedPoints,
        maxDeviation: validation.maxDeviation,
      },
      performedBy: data.performedBy,
      performedDate: new Date(),
      notes: data.notes,
      evidenceUrls: data.evidenceUrls,
      environmentalConditions: data.environmentalConditions,
    }

    // Update the task with calibration data
    const updatedTask = await prisma.maintenanceTask.update({
      where: { id: data.taskId },
      data: {
        calibrationData: JSON.stringify(calibrationData),
        status: 'COMPLETED',
        completedDate: new Date(),
        evidenceUrls: data.evidenceUrls ? JSON.stringify(data.evidenceUrls) : null,
        notes: data.notes,
      },
    })

    // Update equipment calibration date and status
    await prisma.equipment.update({
      where: { id: data.equipmentId },
      data: {
        lastCalibrationDate: new Date(),
        status: validation.isValid ? 'ACTIVE' : 'NEEDS_CALIBRATION',
      },
    })

    // If calibration failed, create an alert
    if (!validation.isValid) {
      await prisma.alert.create({
        data: {
          type: 'MAINTENANCE',
          severity: validation.maxDeviation > 10 ? 'CRITICAL' : 'HIGH',
          title: `Calibration Failed: ${task.equipment.name}`,
          message: `Calibration validation failed. Overall offset: ${validation.overallOffset.toFixed(2)}%, ${validation.failedPoints.length} test point(s) out of tolerance.`,
          targetId: data.equipmentId,
          millId: task.equipment.millId,
          metadata: JSON.stringify({
            equipmentId: data.equipmentId,
            equipmentName: task.equipment.name,
            taskId: data.taskId,
            validationResults: validation,
            failedPoints: validation.failedPoints,
            maxDeviation: validation.maxDeviation,
          }),
        },
      })
    }

    // Update schedule if task has one
    if (task.scheduleId) {
      const schedule = await prisma.maintenanceSchedule.findUnique({
        where: { id: task.scheduleId },
      })

      if (schedule) {
        const { calculateNextDueDate } = await import('@/lib/maintenance-utils')
        const nextDueDate = calculateNextDueDate(
          new Date(),
          schedule.frequency,
          schedule.frequencyValue
        )

        await prisma.maintenanceSchedule.update({
          where: { id: task.scheduleId },
          data: {
            lastPerformedDate: new Date(),
            nextDueDate,
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      calibration: calibrationData,
      validation,
      task: updatedTask,
      message: validation.isValid
        ? 'Calibration completed successfully'
        : 'Calibration completed but failed validation',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error processing calibration:', error)
    return NextResponse.json(
      { error: 'Failed to process calibration' },
      { status: 500 }
    )
  }
}

// Get calibration history for equipment
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const equipmentId = searchParams.get('equipmentId')
    const limit = searchParams.get('limit') || '10'

    if (!equipmentId) {
      return NextResponse.json(
        { error: 'equipmentId required' },
        { status: 400 }
      )
    }

    const tasks = await prisma.maintenanceTask.findMany({
      where: {
        equipmentId,
        type: 'CALIBRATION',
        status: 'COMPLETED',
        calibrationData: { not: null },
      },
      orderBy: { completedDate: 'desc' },
      take: parseInt(limit),
      include: {
        assignee: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    const history = tasks.map((task) => {
      let calibData = null
      if (task.calibrationData) {
        try {
          calibData = JSON.parse(task.calibrationData as string)
        } catch {
          // Skip invalid data
        }
      }

      return {
        id: task.id,
        date: task.completedDate,
        performedBy: calibData?.performedBy || task.assignee?.name,
        isValid: calibData?.validation?.isValid,
        overallOffset: calibData?.validation?.overallOffset,
        maxDeviation: calibData?.validation?.maxDeviation,
        failedPoints: calibData?.validation?.failedPoints?.length || 0,
        measurements: calibData?.measurements,
        notes: task.notes,
        evidenceUrls: task.evidenceUrls
          ? JSON.parse(task.evidenceUrls as string)
          : [],
      }
    })

    // Calculate calibration trends
    const offsets = history
      .filter((h) => h.overallOffset !== undefined)
      .map((h) => ({
        date: h.date,
        offset: h.overallOffset,
      }))

    let trend: 'STABLE' | 'IMPROVING' | 'DEGRADING' = 'STABLE'
    if (offsets.length >= 3) {
      const recent = offsets.slice(0, 3)
      const older = offsets.slice(3, 6)

      if (older.length > 0) {
        const recentAvg =
          recent.reduce((sum, o) => sum + Math.abs(o.offset), 0) / recent.length
        const olderAvg =
          older.reduce((sum, o) => sum + Math.abs(o.offset), 0) / older.length

        if (recentAvg < olderAvg * 0.8) trend = 'IMPROVING'
        else if (recentAvg > olderAvg * 1.2) trend = 'DEGRADING'
      }
    }

    return NextResponse.json({
      equipmentId,
      totalCalibrations: history.length,
      successRate:
        history.length > 0
          ? (history.filter((h) => h.isValid).length / history.length) * 100
          : 0,
      trend,
      history,
      offsets,
    })
  } catch (error) {
    console.error('Error fetching calibration history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calibration history' },
      { status: 500 }
    )
  }
}
