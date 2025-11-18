import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { detectDrift, calculateEquipmentHealth } from '@/lib/maintenance-utils'

export async function POST(request: NextRequest) {
  try {
    const alertsGenerated: any[] = []
    const errors: any[] = []

    // Get all active equipment
    const equipment = await prisma.equipment.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        maintenanceTasks: {
          where: {
            status: 'COMPLETED',
            calibrationData: { not: null },
          },
          orderBy: { completedDate: 'desc' },
          take: 10, // Last 10 calibrations
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

    for (const eq of equipment) {
      try {
        const issues: string[] = []
        let highestSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW'

        // 1. Drift Detection - Analyze calibration history
        if (eq.maintenanceTasks.length >= 3) {
          const calibrationHistory: Array<{ date: Date; value: number }> = []

          for (const task of eq.maintenanceTasks) {
            if (task.calibrationData) {
              try {
                const calibData = JSON.parse(task.calibrationData as string)
                if (calibData.overallOffset !== undefined) {
                  calibrationHistory.push({
                    date: task.completedDate!,
                    value: calibData.overallOffset,
                  })
                }
              } catch {
                // Skip invalid calibration data
              }
            }
          }

          if (calibrationHistory.length >= 3) {
            // Get most recent value
            const currentValue = calibrationHistory[0].value
            const historicalData = calibrationHistory.slice(1)

            const driftAnalysis = detectDrift(historicalData, currentValue, 5)

            if (driftAnalysis.isDrifting) {
              issues.push(
                `Calibration drift detected: ${driftAnalysis.driftAmount.toFixed(2)}% ${driftAnalysis.trend.toLowerCase()}`
              )
              highestSeverity = determineSeverity(
                highestSeverity,
                Math.abs(driftAnalysis.driftAmount) > 10 ? 'CRITICAL' : 'HIGH'
              )

              // Create drift alert
              await prisma.alert.create({
                data: {
                  type: 'MAINTENANCE',
                  severity: Math.abs(driftAnalysis.driftAmount) > 10 ? 'CRITICAL' : 'HIGH',
                  title: `Predictive Alert: Calibration Drift - ${eq.name}`,
                  message: driftAnalysis.recommendation,
                  targetId: eq.id,
                  millId: eq.millId,
                  metadata: JSON.stringify({
                    equipmentId: eq.id,
                    equipmentName: eq.name,
                    alertType: 'DRIFT_DETECTION',
                    driftAmount: driftAnalysis.driftAmount,
                    trend: driftAnalysis.trend,
                    recommendation: driftAnalysis.recommendation,
                  }),
                },
              })

              alertsGenerated.push({
                equipmentId: eq.id,
                equipmentName: eq.name,
                type: 'DRIFT_DETECTION',
                severity: Math.abs(driftAnalysis.driftAmount) > 10 ? 'CRITICAL' : 'HIGH',
                details: driftAnalysis,
              })
            }
          }
        }

        // 2. Equipment Health Analysis
        const ageInYears = eq.installationDate
          ? (Date.now() - new Date(eq.installationDate).getTime()) / (1000 * 60 * 60 * 24 * 365)
          : 0

        const activeAlertsCount = eq.alerts.length

        // Count overdue tasks
        const now = new Date()
        const overdueTasksCount = await prisma.maintenanceTask.count({
          where: {
            equipmentId: eq.id,
            status: { in: ['PENDING', 'IN_PROGRESS'] },
            scheduledDate: { lt: now },
          },
        })

        // Calculate average calibration offset
        let avgCalibrationOffset = 0
        if (eq.maintenanceTasks.length > 0) {
          let total = 0
          let count = 0
          for (const task of eq.maintenanceTasks) {
            if (task.calibrationData) {
              try {
                const calibData = JSON.parse(task.calibrationData as string)
                if (calibData.overallOffset !== undefined) {
                  total += Math.abs(calibData.overallOffset)
                  count++
                }
              } catch {
                // Skip
              }
            }
          }
          avgCalibrationOffset = count > 0 ? total / count : 0
        }

        const healthAnalysis = calculateEquipmentHealth({
          lastCalibrationDate: eq.lastCalibrationDate || undefined,
          alertsCount: activeAlertsCount,
          tasksOverdueCount: overdueTasksCount,
          ageInYears,
          avgCalibrationOffset,
        })

        // Generate health alert if equipment is in poor condition
        if (healthAnalysis.riskLevel === 'CRITICAL' || healthAnalysis.riskLevel === 'HIGH') {
          issues.push(...healthAnalysis.recommendations)
          highestSeverity = determineSeverity(
            highestSeverity,
            healthAnalysis.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH'
          )

          await prisma.alert.create({
            data: {
              type: 'MAINTENANCE',
              severity: healthAnalysis.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
              title: `Equipment Health Alert: ${eq.name}`,
              message: `Equipment health score: ${healthAnalysis.healthScore}/100 (${healthAnalysis.status}). ${healthAnalysis.recommendations[0] || 'Requires attention'}`,
              targetId: eq.id,
              millId: eq.millId,
              metadata: JSON.stringify({
                equipmentId: eq.id,
                equipmentName: eq.name,
                alertType: 'HEALTH_WARNING',
                healthScore: healthAnalysis.healthScore,
                status: healthAnalysis.status,
                riskLevel: healthAnalysis.riskLevel,
                recommendations: healthAnalysis.recommendations,
              }),
            },
          })

          alertsGenerated.push({
            equipmentId: eq.id,
            equipmentName: eq.name,
            type: 'HEALTH_WARNING',
            severity: healthAnalysis.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
            details: healthAnalysis,
          })
        }

        // 3. Overdue Maintenance Detection
        if (overdueTasksCount > 0) {
          issues.push(`${overdueTasksCount} overdue maintenance task(s)`)
          highestSeverity = determineSeverity(
            highestSeverity,
            overdueTasksCount > 3 ? 'CRITICAL' : 'HIGH'
          )
        }

        // 4. Pattern Analysis - Check for recurring issues
        const recentIssues = eq.maintenanceTasks
          .filter((task) => task.issuesFound && task.issuesFound.length > 0)
          .slice(0, 5)

        if (recentIssues.length >= 3) {
          issues.push('Recurring issues detected in recent maintenance')
          highestSeverity = determineSeverity(highestSeverity, 'MEDIUM')

          await prisma.alert.create({
            data: {
              type: 'MAINTENANCE',
              severity: 'MEDIUM',
              title: `Recurring Issues Pattern: ${eq.name}`,
              message: `${recentIssues.length} of last 5 maintenance tasks reported issues. Equipment may need detailed inspection.`,
              targetId: eq.id,
              millId: eq.millId,
              metadata: JSON.stringify({
                equipmentId: eq.id,
                equipmentName: eq.name,
                alertType: 'RECURRING_ISSUES',
                issueCount: recentIssues.length,
                totalInspected: 5,
              }),
            },
          })

          alertsGenerated.push({
            equipmentId: eq.id,
            equipmentName: eq.name,
            type: 'RECURRING_ISSUES',
            severity: 'MEDIUM',
            details: {
              issueCount: recentIssues.length,
              totalInspected: 5,
            },
          })
        }
      } catch (error) {
        console.error(`Error analyzing equipment ${eq.id}:`, error)
        errors.push({
          equipmentId: eq.id,
          equipmentName: eq.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        equipmentAnalyzed: equipment.length,
        alertsGenerated: alertsGenerated.length,
        errors: errors.length,
      },
      alerts: alertsGenerated,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Error generating predictive alerts:', error)
    return NextResponse.json(
      { error: 'Failed to generate predictive alerts' },
      { status: 500 }
    )
  }
}

// Get predictive insights for specific equipment
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const equipmentId = searchParams.get('equipmentId')
    const millId = searchParams.get('millId')

    if (!equipmentId && !millId) {
      return NextResponse.json(
        { error: 'equipmentId or millId required' },
        { status: 400 }
      )
    }

    const where: any = {}
    if (equipmentId) where.id = equipmentId
    if (millId) where.millId = millId

    const equipment = await prisma.equipment.findMany({
      where: {
        ...where,
        status: 'ACTIVE',
      },
      include: {
        maintenanceTasks: {
          where: {
            status: 'COMPLETED',
            calibrationData: { not: null },
          },
          orderBy: { completedDate: 'desc' },
          take: 10,
        },
        alerts: {
          where: {
            type: 'MAINTENANCE',
            status: { in: ['ACTIVE', 'ACKNOWLEDGED'] },
          },
        },
      },
    })

    const insights = []

    for (const eq of equipment) {
      // Drift analysis
      let driftAnalysis = null
      if (eq.maintenanceTasks.length >= 3) {
        const calibrationHistory: Array<{ date: Date; value: number }> = []

        for (const task of eq.maintenanceTasks) {
          if (task.calibrationData) {
            try {
              const calibData = JSON.parse(task.calibrationData as string)
              if (calibData.overallOffset !== undefined) {
                calibrationHistory.push({
                  date: task.completedDate!,
                  value: calibData.overallOffset,
                })
              }
            } catch {
              // Skip
            }
          }
        }

        if (calibrationHistory.length >= 3) {
          const currentValue = calibrationHistory[0].value
          const historicalData = calibrationHistory.slice(1)
          driftAnalysis = detectDrift(historicalData, currentValue, 5)
        }
      }

      // Health analysis
      const ageInYears = eq.installationDate
        ? (Date.now() - new Date(eq.installationDate).getTime()) / (1000 * 60 * 60 * 24 * 365)
        : 0

      const overdueTasksCount = await prisma.maintenanceTask.count({
        where: {
          equipmentId: eq.id,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          scheduledDate: { lt: new Date() },
        },
      })

      let avgCalibrationOffset = 0
      if (eq.maintenanceTasks.length > 0) {
        let total = 0
        let count = 0
        for (const task of eq.maintenanceTasks) {
          if (task.calibrationData) {
            try {
              const calibData = JSON.parse(task.calibrationData as string)
              if (calibData.overallOffset !== undefined) {
                total += Math.abs(calibData.overallOffset)
                count++
              }
            } catch {
              // Skip
            }
          }
        }
        avgCalibrationOffset = count > 0 ? total / count : 0
      }

      const healthAnalysis = calculateEquipmentHealth({
        lastCalibrationDate: eq.lastCalibrationDate || undefined,
        alertsCount: eq.alerts.length,
        tasksOverdueCount: overdueTasksCount,
        ageInYears,
        avgCalibrationOffset,
      })

      insights.push({
        equipmentId: eq.id,
        equipmentName: eq.name,
        equipmentType: eq.type,
        driftAnalysis,
        healthAnalysis,
        activeAlerts: eq.alerts.length,
        overdueTasks: overdueTasksCount,
      })
    }

    return NextResponse.json(insights)
  } catch (error) {
    console.error('Error fetching predictive insights:', error)
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    )
  }
}

function determineSeverity(
  current: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  newSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const severityOrder = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }
  return severityOrder[newSeverity] > severityOrder[current] ? newSeverity : current
}
