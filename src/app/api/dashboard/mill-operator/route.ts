import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const millId = searchParams.get('millId')

    if (!userId || !millId) {
      return NextResponse.json(
        { error: 'userId and millId are required' },
        { status: 400 }
      )
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get today's batches
    const todaysBatches = await prisma.batchLog.findMany({
      where: {
        millId,
        batchDateTime: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        qcTests: {
          select: {
            status: true,
            testType: true,
          },
        },
      },
      orderBy: { batchDateTime: 'desc' },
    })

    // Get pending QC tests for today
    const pendingQCTests = await prisma.qcTest.findMany({
      where: {
        batch: {
          millId,
        },
        testDate: {
          gte: today,
          lt: tomorrow,
        },
        status: 'PENDING',
      },
      include: {
        batch: {
          select: {
            batchId: true,
            productType: true,
          },
        },
      },
      orderBy: { testDate: 'asc' },
    })

    // Get today's maintenance tasks
    const todaysMaintenanceTasks = await prisma.maintenanceTask.findMany({
      where: {
        equipment: {
          millId,
        },
        scheduledDate: {
          gte: today,
          lt: tomorrow,
        },
        status: {
          in: ['PENDING', 'IN_PROGRESS'],
        },
      },
      include: {
        equipment: {
          select: {
            name: true,
            equipmentType: true,
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    })

    // Get overdue maintenance tasks
    const overdueMaintenanceTasks = await prisma.maintenanceTask.findMany({
      where: {
        equipment: {
          millId,
        },
        scheduledDate: {
          lt: today,
        },
        status: {
          in: ['PENDING', 'IN_PROGRESS'],
        },
      },
      include: {
        equipment: {
          select: {
            name: true,
            equipmentType: true,
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
      take: 5,
    })

    // Get active alerts
    const activeAlerts = await prisma.alert.findMany({
      where: {
        millId,
        status: {
          in: ['PENDING', 'IN_PROGRESS'],
        },
        severity: {
          in: ['CRITICAL', 'HIGH'],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    // Get current shift production summary
    const currentShift = getCurrentShift()
    const shiftStart = new Date(today)
    const shiftEnd = new Date()

    if (currentShift === 'MORNING') {
      shiftStart.setHours(6, 0, 0, 0)
      shiftEnd.setHours(14, 0, 0, 0)
    } else if (currentShift === 'AFTERNOON') {
      shiftStart.setHours(14, 0, 0, 0)
      shiftEnd.setHours(22, 0, 0, 0)
    } else {
      shiftStart.setHours(22, 0, 0, 0)
      shiftEnd.setDate(shiftEnd.getDate() + 1)
      shiftEnd.setHours(6, 0, 0, 0)
    }

    const shiftBatches = await prisma.batchLog.findMany({
      where: {
        millId,
        batchDateTime: {
          gte: shiftStart,
          lte: shiftEnd,
        },
      },
      select: {
        outputWeight: true,
        qcStatus: true,
      },
    })

    const shiftProduction = {
      totalBatches: shiftBatches.length,
      totalOutput: shiftBatches.reduce((sum, b) => sum + (b.outputWeight || 0), 0),
      passedBatches: shiftBatches.filter((b) => b.qcStatus === 'PASS' || b.qcStatus === 'EXCELLENT').length,
      failedBatches: shiftBatches.filter((b) => b.qcStatus === 'FAIL').length,
    }

    // Get equipment status summary
    const equipmentStatus = await prisma.equipment.findMany({
      where: { millId },
      select: {
        id: true,
        name: true,
        equipmentType: true,
        status: true,
        lastCalibrationDate: true,
      },
    })

    const equipmentSummary = {
      total: equipmentStatus.length,
      operational: equipmentStatus.filter((e) => e.status === 'OPERATIONAL').length,
      maintenance: equipmentStatus.filter((e) => e.status === 'MAINTENANCE').length,
      calibrationDue: equipmentStatus.filter((e) => e.status === 'CALIBRATION_DUE').length,
      outOfService: equipmentStatus.filter((e) => e.status === 'OUT_OF_SERVICE').length,
    }

    // Get recent activity log
    const recentActivity = await prisma.traceabilityRecord.findMany({
      where: {
        batch: {
          millId,
        },
        eventTime: {
          gte: today,
        },
      },
      include: {
        batch: {
          select: {
            batchId: true,
          },
        },
      },
      orderBy: { eventTime: 'desc' },
      take: 10,
    })

    return NextResponse.json({
      todaysFocus: {
        batches: todaysBatches.length,
        pendingQCTests: pendingQCTests.length,
        maintenanceTasks: todaysMaintenanceTasks.length,
        activeAlerts: activeAlerts.length,
      },
      currentShift: {
        shift: currentShift,
        production: shiftProduction,
      },
      todaysBatches,
      pendingQCTests,
      maintenanceTasks: {
        today: todaysMaintenanceTasks,
        overdue: overdueMaintenanceTasks,
      },
      alerts: activeAlerts,
      equipmentStatus: equipmentSummary,
      recentActivity,
    })
  } catch (error) {
    console.error('Error fetching mill operator dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}

function getCurrentShift(): 'MORNING' | 'AFTERNOON' | 'NIGHT' {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 14) return 'MORNING'
  if (hour >= 14 && hour < 22) return 'AFTERNOON'
  return 'NIGHT'
}
