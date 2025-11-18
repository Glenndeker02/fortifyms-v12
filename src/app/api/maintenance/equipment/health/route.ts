import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateEquipmentHealth, getDaysUntilDue } from '@/lib/maintenance-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const equipmentId = searchParams.get('equipmentId')
    const millId = searchParams.get('millId')
    const riskLevel = searchParams.get('riskLevel') // Filter by risk level
    const status = searchParams.get('status') // Filter by health status

    const where: any = {}
    if (equipmentId) where.id = equipmentId
    if (millId) where.millId = millId

    const equipment = await prisma.equipment.findMany({
      where,
      include: {
        maintenanceTasks: {
          where: {
            status: 'COMPLETED',
          },
          orderBy: { completedDate: 'desc' },
          take: 10,
        },
        maintenanceSchedules: {
          where: { isActive: true },
        },
        alerts: {
          where: {
            type: 'MAINTENANCE',
            status: { in: ['ACTIVE', 'ACKNOWLEDGED'] },
          },
        },
      },
    })

    const healthReports = await Promise.all(
      equipment.map(async (eq) => {
        // Calculate equipment age
        const ageInYears = eq.installationDate
          ? (Date.now() - new Date(eq.installationDate).getTime()) / (1000 * 60 * 60 * 24 * 365)
          : 0

        // Count overdue tasks
        const now = new Date()
        const overdueTasksCount = await prisma.maintenanceTask.count({
          where: {
            equipmentId: eq.id,
            status: { in: ['PENDING', 'IN_PROGRESS'] },
            scheduledDate: { lt: now },
          },
        })

        // Calculate average calibration offset from recent tasks
        let avgCalibrationOffset = 0
        const calibrationTasks = eq.maintenanceTasks.filter(
          (t) => t.calibrationData !== null
        )

        if (calibrationTasks.length > 0) {
          let total = 0
          let count = 0

          for (const task of calibrationTasks) {
            if (task.calibrationData) {
              try {
                const calibData = JSON.parse(task.calibrationData as string)
                if (calibData.validation?.overallOffset !== undefined) {
                  total += Math.abs(calibData.validation.overallOffset)
                  count++
                }
              } catch {
                // Skip invalid data
              }
            }
          }

          avgCalibrationOffset = count > 0 ? total / count : 0
        }

        // Calculate health score
        const health = calculateEquipmentHealth({
          lastCalibrationDate: eq.lastCalibrationDate || undefined,
          alertsCount: eq.alerts.length,
          tasksOverdueCount: overdueTasksCount,
          ageInYears,
          avgCalibrationOffset,
        })

        // Calculate next maintenance due
        let nextMaintenanceDue: Date | null = null
        let daysUntilMaintenance: number | null = null

        if (eq.maintenanceSchedules.length > 0) {
          const upcomingSchedules = eq.maintenanceSchedules
            .filter((s) => s.nextDueDate)
            .sort((a, b) => a.nextDueDate.getTime() - b.nextDueDate.getTime())

          if (upcomingSchedules.length > 0) {
            nextMaintenanceDue = upcomingSchedules[0].nextDueDate
            daysUntilMaintenance = getDaysUntilDue(nextMaintenanceDue)
          }
        }

        // Calculate uptime
        const completedTasks = eq.maintenanceTasks.filter(
          (t) => t.status === 'COMPLETED'
        )
        const tasksWithIssues = completedTasks.filter(
          (t) => t.issuesFound && t.issuesFound.length > 0
        )
        const reliabilityScore =
          completedTasks.length > 0
            ? ((completedTasks.length - tasksWithIssues.length) / completedTasks.length) * 100
            : 100

        // Last maintenance info
        const lastMaintenance =
          eq.maintenanceTasks.length > 0 ? eq.maintenanceTasks[0] : null
        const daysSinceLastMaintenance = lastMaintenance
          ? Math.ceil(
              (Date.now() - new Date(lastMaintenance.completedDate!).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null

        return {
          equipmentId: eq.id,
          equipmentName: eq.name,
          equipmentType: eq.type,
          location: eq.location,
          status: eq.status,
          health: {
            score: health.healthScore,
            status: health.status,
            riskLevel: health.riskLevel,
            recommendations: health.recommendations,
          },
          metrics: {
            ageInYears: parseFloat(ageInYears.toFixed(1)),
            avgCalibrationOffset: parseFloat(avgCalibrationOffset.toFixed(2)),
            activeAlerts: eq.alerts.length,
            overdueTasks: overdueTasksCount,
            totalMaintenanceCount: eq.maintenanceTasks.length,
            reliabilityScore: parseFloat(reliabilityScore.toFixed(1)),
            lastMaintenanceDate: lastMaintenance?.completedDate,
            daysSinceLastMaintenance,
            nextMaintenanceDue,
            daysUntilMaintenance,
          },
          activeSchedules: eq.maintenanceSchedules.length,
          lastCalibrationDate: eq.lastCalibrationDate,
        }
      })
    )

    // Apply filters
    let filteredReports = healthReports
    if (riskLevel) {
      filteredReports = filteredReports.filter((r) => r.health.riskLevel === riskLevel)
    }
    if (status) {
      filteredReports = filteredReports.filter((r) => r.health.status === status)
    }

    // Sort by health score (worst first)
    filteredReports.sort((a, b) => a.health.score - b.health.score)

    // Calculate summary statistics
    const summary = {
      totalEquipment: filteredReports.length,
      byRiskLevel: {
        CRITICAL: filteredReports.filter((r) => r.health.riskLevel === 'CRITICAL').length,
        HIGH: filteredReports.filter((r) => r.health.riskLevel === 'HIGH').length,
        MEDIUM: filteredReports.filter((r) => r.health.riskLevel === 'MEDIUM').length,
        LOW: filteredReports.filter((r) => r.health.riskLevel === 'LOW').length,
      },
      byStatus: {
        CRITICAL: filteredReports.filter((r) => r.health.status === 'CRITICAL').length,
        POOR: filteredReports.filter((r) => r.health.status === 'POOR').length,
        FAIR: filteredReports.filter((r) => r.health.status === 'FAIR').length,
        GOOD: filteredReports.filter((r) => r.health.status === 'GOOD').length,
        EXCELLENT: filteredReports.filter((r) => r.health.status === 'EXCELLENT').length,
      },
      avgHealthScore:
        filteredReports.length > 0
          ? filteredReports.reduce((sum, r) => sum + r.health.score, 0) /
            filteredReports.length
          : 0,
      equipmentNeedingAttention: filteredReports.filter(
        (r) => r.health.riskLevel === 'CRITICAL' || r.health.riskLevel === 'HIGH'
      ).length,
    }

    return NextResponse.json({
      summary,
      equipment: filteredReports,
    })
  } catch (error) {
    console.error('Error fetching equipment health:', error)
    return NextResponse.json(
      { error: 'Failed to fetch equipment health' },
      { status: 500 }
    )
  }
}

// Update equipment health manually (for manual inspections)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { equipmentId, notes, inspectionData } = body

    if (!equipmentId) {
      return NextResponse.json(
        { error: 'equipmentId required' },
        { status: 400 }
      )
    }

    // Create a manual inspection record as a maintenance task
    const task = await prisma.maintenanceTask.create({
      data: {
        equipmentId,
        millId: (
          await prisma.equipment.findUnique({ where: { id: equipmentId } })
        )!.millId,
        type: 'INSPECTION',
        status: 'COMPLETED',
        priority: 'MEDIUM',
        scheduledDate: new Date(),
        completedDate: new Date(),
        notes,
        assignedTo: inspectionData?.inspector || 'SYSTEM',
        description: 'Manual health inspection',
      },
    })

    // Recalculate health
    const healthResponse = await fetch(
      `${request.nextUrl.origin}/api/maintenance/equipment/health?equipmentId=${equipmentId}`
    ).then((res) => res.json())

    return NextResponse.json({
      success: true,
      task,
      health: healthResponse.equipment[0],
    })
  } catch (error) {
    console.error('Error updating equipment health:', error)
    return NextResponse.json(
      { error: 'Failed to update equipment health' },
      { status: 500 }
    )
  }
}
