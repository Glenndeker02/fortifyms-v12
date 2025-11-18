import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const millId = searchParams.get('millId')
    const equipmentId = searchParams.get('equipmentId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const period = searchParams.get('period') || '30' // days

    // Calculate date range
    const end = endDate ? new Date(endDate) : new Date()
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000)

    // Build filters
    const taskWhere: any = {
      scheduledDate: {
        gte: start,
        lte: end,
      },
    }
    if (millId) taskWhere.millId = millId
    if (equipmentId) taskWhere.equipmentId = equipmentId

    const equipmentWhere: any = {}
    if (millId) equipmentWhere.millId = millId
    if (equipmentId) equipmentWhere.id = equipmentId

    // Fetch tasks for the period
    const tasks = await prisma.maintenanceTask.findMany({
      where: taskWhere,
      include: {
        equipment: {
          select: {
            name: true,
            type: true,
          },
        },
      },
    })

    // Calculate metrics
    const totalTasks = tasks.length
    const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length
    const pendingTasks = tasks.filter((t) => t.status === 'PENDING').length
    const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length
    const cancelledTasks = tasks.filter((t) => t.status === 'CANCELLED').length

    // On-time completion
    const completedOnTime = tasks.filter(
      (t) =>
        t.status === 'COMPLETED' &&
        t.completedDate &&
        t.completedDate <= t.scheduledDate
    ).length
    const onTimeRate = completedTasks > 0 ? (completedOnTime / completedTasks) * 100 : 0

    // Overdue tasks
    const now = new Date()
    const overdueTasks = tasks.filter(
      (t) =>
        (t.status === 'PENDING' || t.status === 'IN_PROGRESS') &&
        t.scheduledDate < now
    ).length

    // Task breakdown by type
    const tasksByType = tasks.reduce((acc: any, task) => {
      acc[task.type] = (acc[task.type] || 0) + 1
      return acc
    }, {})

    // Task breakdown by priority
    const tasksByPriority = tasks.reduce((acc: any, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1
      return acc
    }, {})

    // Equipment with most maintenance
    const equipmentMaintenance = tasks.reduce((acc: any, task) => {
      const key = task.equipmentId
      if (!acc[key]) {
        acc[key] = {
          equipmentId: task.equipmentId,
          equipmentName: task.equipment.name,
          equipmentType: task.equipment.type,
          count: 0,
          completed: 0,
          issues: 0,
        }
      }
      acc[key].count++
      if (task.status === 'COMPLETED') acc[key].completed++
      if (task.issuesFound && task.issuesFound.length > 0) acc[key].issues++
      return acc
    }, {})

    const topEquipment = Object.values(equipmentMaintenance)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10)

    // Monthly trend (last 6 months)
    const monthlyTrend: any[] = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date()
      monthStart.setMonth(monthStart.getMonth() - i)
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const monthEnd = new Date(monthStart)
      monthEnd.setMonth(monthEnd.getMonth() + 1)

      const monthTasks = tasks.filter(
        (t) => t.scheduledDate >= monthStart && t.scheduledDate < monthEnd
      )

      monthlyTrend.push({
        month: monthStart.toISOString().slice(0, 7),
        total: monthTasks.length,
        completed: monthTasks.filter((t) => t.status === 'COMPLETED').length,
        onTime: monthTasks.filter(
          (t) =>
            t.status === 'COMPLETED' &&
            t.completedDate &&
            t.completedDate <= t.scheduledDate
        ).length,
        withIssues: monthTasks.filter((t) => t.issuesFound && t.issuesFound.length > 0).length,
      })
    }

    // Compliance metrics
    const totalEquipment = await prisma.equipment.count({
      where: equipmentWhere,
    })

    const equipmentWithOverdue = await prisma.equipment.count({
      where: {
        ...equipmentWhere,
        maintenanceTasks: {
          some: {
            status: { in: ['PENDING', 'IN_PROGRESS'] },
            scheduledDate: { lt: now },
          },
        },
      },
    })

    const complianceRate =
      totalEquipment > 0 ? ((totalEquipment - equipmentWithOverdue) / totalEquipment) * 100 : 100

    // Average completion time
    const completedWithDates = tasks.filter(
      (t) => t.status === 'COMPLETED' && t.completedDate
    )
    let avgCompletionTime = 0
    if (completedWithDates.length > 0) {
      const totalTime = completedWithDates.reduce((sum, task) => {
        const scheduled = task.scheduledDate.getTime()
        const completed = task.completedDate!.getTime()
        return sum + Math.abs(completed - scheduled)
      }, 0)
      avgCompletionTime = totalTime / completedWithDates.length / (1000 * 60 * 60 * 24) // days
    }

    // Issues analysis
    const tasksWithIssues = tasks.filter((t) => t.issuesFound && t.issuesFound.length > 0)
    const issueRate = totalTasks > 0 ? (tasksWithIssues.length / totalTasks) * 100 : 0

    // Parts replacement analysis
    const tasksWithParts = tasks.filter((t) => t.partsReplaced && t.partsReplaced.length > 0)
    const partsReplacementRate = completedTasks > 0 ? (tasksWithParts.length / completedTasks) * 100 : 0

    // Calibration success rate
    const calibrationTasks = tasks.filter((t) => t.type === 'CALIBRATION' && t.status === 'COMPLETED')
    const successfulCalibrations = calibrationTasks.filter((t) => {
      if (!t.calibrationData) return false
      try {
        const calibData = JSON.parse(t.calibrationData as string)
        return calibData.isValid === true
      } catch {
        return false
      }
    })
    const calibrationSuccessRate =
      calibrationTasks.length > 0 ? (successfulCalibrations.length / calibrationTasks.length) * 100 : 0

    // Get active schedules
    const activeSchedules = await prisma.maintenanceSchedule.count({
      where: {
        ...equipmentWhere,
        isActive: true,
      },
    })

    // Get active alerts
    const activeAlerts = await prisma.alert.count({
      where: {
        type: 'MAINTENANCE',
        status: { in: ['ACTIVE', 'ACKNOWLEDGED'] },
        millId,
      },
    })

    return NextResponse.json({
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        days: Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
      },
      summary: {
        totalTasks,
        completedTasks,
        pendingTasks,
        inProgressTasks,
        cancelledTasks,
        overdueTasks,
        completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
        onTimeRate,
        avgCompletionTime: avgCompletionTime.toFixed(1),
        complianceRate: complianceRate.toFixed(1),
        issueRate: issueRate.toFixed(1),
        partsReplacementRate: partsReplacementRate.toFixed(1),
        calibrationSuccessRate: calibrationSuccessRate.toFixed(1),
      },
      taskDistribution: {
        byType: tasksByType,
        byPriority: tasksByPriority,
      },
      equipment: {
        total: totalEquipment,
        withOverdueMaintenace: equipmentWithOverdue,
        topMaintenance: topEquipment,
      },
      schedules: {
        active: activeSchedules,
      },
      alerts: {
        active: activeAlerts,
      },
      trends: {
        monthly: monthlyTrend,
      },
    })
  } catch (error) {
    console.error('Error fetching maintenance analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

// Export analytics report
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { millId, startDate, endDate, format = 'json' } = body

    // For now, return JSON format
    // In the future, this could generate PDF/Excel reports

    const analyticsData = await fetch(
      `${request.nextUrl.origin}/api/maintenance/analytics?millId=${millId}&startDate=${startDate}&endDate=${endDate}`
    ).then((res) => res.json())

    if (format === 'csv') {
      // TODO: Convert to CSV format
      return NextResponse.json(
        { error: 'CSV format not yet implemented' },
        { status: 501 }
      )
    }

    return NextResponse.json({
      success: true,
      format,
      data: analyticsData,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error exporting analytics:', error)
    return NextResponse.json(
      { error: 'Failed to export analytics' },
      { status: 500 }
    )
  }
}
