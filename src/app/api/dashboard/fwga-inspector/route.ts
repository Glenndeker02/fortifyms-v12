import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const period = searchParams.get('period') || '30' // days

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const periodDays = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - periodDays)

    // Get assigned mills for this inspector
    const assignedMills = await prisma.mill.findMany({
      where: {
        users: {
          some: {
            id: userId,
            role: 'FWGA_INSPECTOR',
          },
        },
      },
      include: {
        batches: {
          where: {
            batchDateTime: { gte: startDate },
          },
          include: {
            qcTests: true,
            correctiveActions: true,
          },
        },
        complianceChecklists: {
          where: {
            createdAt: { gte: startDate },
          },
        },
        alerts: {
          where: {
            status: { in: ['PENDING', 'IN_PROGRESS'] },
          },
        },
      },
    })

    // Pending reviews and inspections
    const pendingComplianceChecklists = await prisma.complianceChecklist.findMany({
      where: {
        mill: {
          users: {
            some: {
              id: userId,
            },
          },
        },
        status: 'PENDING',
      },
      include: {
        mill: {
          select: {
            name: true,
            code: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const pendingInspections = await prisma.inspection.findMany({
      where: {
        inspectorId: userId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      },
      include: {
        mill: {
          select: {
            name: true,
            code: true,
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    })

    // Critical alerts requiring inspector attention
    const criticalAlerts = await prisma.alert.findMany({
      where: {
        mill: {
          users: {
            some: {
              id: userId,
            },
          },
        },
        severity: { in: ['CRITICAL', 'HIGH'] },
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        category: { in: ['QUALITY_SAFETY', 'COMPLIANCE'] },
      },
      include: {
        mill: {
          select: {
            name: true,
            code: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // Failed batches requiring review
    const failedBatches = await prisma.batchLog.findMany({
      where: {
        mill: {
          users: {
            some: {
              id: userId,
            },
          },
        },
        qcStatus: 'FAIL',
        batchDateTime: { gte: startDate },
      },
      include: {
        mill: {
          select: {
            name: true,
            code: true,
          },
        },
        qcTests: {
          where: {
            status: 'FAIL',
          },
        },
        correctiveActions: true,
      },
      orderBy: { batchDateTime: 'desc' },
    })

    // Pending corrective actions
    const pendingCorrectiveActions = await prisma.correctiveAction.findMany({
      where: {
        batch: {
          mill: {
            users: {
              some: {
                id: userId,
              },
            },
          },
        },
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      include: {
        batch: {
          select: {
            batchId: true,
            mill: {
              select: {
                name: true,
                code: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Mill performance summary for assigned mills
    const millPerformance = assignedMills.map((mill) => {
      const batches = mill.batches
      const passedBatches = batches.filter(
        (b) => b.qcStatus === 'PASS' || b.qcStatus === 'EXCELLENT'
      ).length
      const qcPassRate = batches.length > 0 ? (passedBatches / batches.length) * 100 : 0

      const criticalIssues = mill.alerts.filter((a) => a.severity === 'CRITICAL').length
      const complianceStatus = mill.complianceChecklists.length > 0
        ? mill.complianceChecklists[0].status
        : 'PENDING'

      const totalTests = batches.flatMap((b) => b.qcTests).length
      const failedTests = batches.flatMap((b) => b.qcTests).filter((t) => t.status === 'FAIL').length

      const pendingActions = batches.flatMap((b) => b.correctiveActions).filter(
        (a) => a.status === 'PENDING'
      ).length

      return {
        millId: mill.id,
        millName: mill.name,
        millCode: mill.code,
        country: mill.country,
        region: mill.region,
        certificationStatus: mill.certificationStatus,
        batches: batches.length,
        qcPassRate: Math.round(qcPassRate * 100) / 100,
        failedTests,
        criticalIssues,
        pendingActions,
        complianceStatus,
        lastInspection: mill.lastInspectionDate,
        riskLevel: calculateRiskLevel(qcPassRate, criticalIssues, failedTests),
      }
    })

    // Geographic distribution for heat map
    const geographicData = assignedMills.map((mill) => ({
      millId: mill.id,
      millName: mill.name,
      country: mill.country,
      region: mill.region,
      latitude: mill.latitude,
      longitude: mill.longitude,
      riskLevel: millPerformance.find((m) => m.millId === mill.id)?.riskLevel || 'LOW',
      criticalAlerts: mill.alerts.filter((a) => a.severity === 'CRITICAL').length,
    }))

    // Inspection schedule
    const upcomingInspections = await prisma.inspection.findMany({
      where: {
        inspectorId: userId,
        scheduledDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // next 30 days
        },
      },
      include: {
        mill: {
          select: {
            name: true,
            code: true,
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    })

    // Recent activity and history
    const recentActivity = await prisma.traceabilityRecord.findMany({
      where: {
        batch: {
          mill: {
            users: {
              some: {
                id: userId,
              },
            },
          },
        },
        eventTime: { gte: startDate },
      },
      include: {
        batch: {
          select: {
            batchId: true,
            mill: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { eventTime: 'desc' },
      take: 20,
    })

    // Summary statistics
    const summary = {
      assignedMills: assignedMills.length,
      pendingReviews: pendingComplianceChecklists.length + failedBatches.length,
      pendingInspections: pendingInspections.length,
      upcomingInspections: upcomingInspections.length,
      criticalAlerts: criticalAlerts.length,
      pendingCorrectiveActions: pendingCorrectiveActions.length,
      highRiskMills: millPerformance.filter((m) => m.riskLevel === 'HIGH' || m.riskLevel === 'CRITICAL').length,
    }

    return NextResponse.json({
      summary,
      assignedMills: millPerformance,
      pendingReviews: {
        complianceChecklists: pendingComplianceChecklists,
        failedBatches: failedBatches.slice(0, 10),
        correctiveActions: pendingCorrectiveActions.slice(0, 10),
      },
      inspections: {
        pending: pendingInspections,
        upcoming: upcomingInspections,
      },
      alerts: criticalAlerts,
      geographicData,
      recentActivity,
    })
  } catch (error) {
    console.error('Error fetching FWGA inspector dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}

function calculateRiskLevel(
  qcPassRate: number,
  criticalIssues: number,
  failedTests: number
): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (criticalIssues >= 3 || qcPassRate < 70 || failedTests >= 5) {
    return 'CRITICAL'
  }
  if (criticalIssues >= 2 || qcPassRate < 80 || failedTests >= 3) {
    return 'HIGH'
  }
  if (criticalIssues >= 1 || qcPassRate < 90 || failedTests >= 1) {
    return 'MEDIUM'
  }
  return 'LOW'
}
