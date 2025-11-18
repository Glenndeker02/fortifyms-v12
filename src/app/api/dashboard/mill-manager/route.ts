import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const millId = searchParams.get('millId')
    const period = searchParams.get('period') || '30' // days

    if (!millId) {
      return NextResponse.json({ error: 'millId is required' }, { status: 400 })
    }

    const periodDays = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - periodDays)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Production KPIs
    const batches = await prisma.batchLog.findMany({
      where: {
        millId,
        batchDateTime: { gte: startDate },
      },
      include: {
        qcTests: {
          select: {
            status: true,
          },
        },
      },
    })

    const totalProduction = batches.reduce((sum, b) => sum + (b.outputWeight || 0), 0)
    const avgYield = batches.length > 0
      ? batches.reduce((sum, b) => sum + (b.yieldPercentage || 0), 0) / batches.length
      : 0

    const passedBatches = batches.filter(
      (b) => b.qcStatus === 'PASS' || b.qcStatus === 'EXCELLENT'
    ).length
    const qcPassRate = batches.length > 0 ? (passedBatches / batches.length) * 100 : 0

    const varianceIssues = batches.filter((b) => {
      const variance = b.premixVariancePercent || 0
      return Math.abs(variance) > 10
    }).length

    // Quality & Compliance Metrics
    const qcTests = await prisma.qcTest.findMany({
      where: {
        batch: { millId },
        testDate: { gte: startDate },
      },
    })

    const passedTests = qcTests.filter((t) => t.status === 'PASS').length
    const testPassRate = qcTests.length > 0 ? (passedTests / qcTests.length) * 100 : 0

    const criticalFailures = qcTests.filter((t) => t.status === 'FAIL').length

    const correctiveActions = await prisma.correctiveAction.findMany({
      where: {
        batch: { millId },
        createdAt: { gte: startDate },
      },
    })

    const pendingActions = correctiveActions.filter((a) => a.status === 'PENDING').length
    const completedActions = correctiveActions.filter((a) => a.status === 'COMPLETED').length
    const actionCompletionRate = correctiveActions.length > 0
      ? (completedActions / correctiveActions.length) * 100
      : 0

    // Equipment & Maintenance
    const equipment = await prisma.equipment.findMany({
      where: { millId },
      include: {
        maintenanceTasks: {
          where: {
            scheduledDate: { gte: startDate },
          },
        },
      },
    })

    const equipmentOperational = equipment.filter((e) => e.status === 'OPERATIONAL').length
    const equipmentUtilization = equipment.length > 0
      ? (equipmentOperational / equipment.length) * 100
      : 0

    const maintenanceTasks = equipment.flatMap((e) => e.maintenanceTasks)
    const completedMaintenance = maintenanceTasks.filter((t) => t.status === 'COMPLETED').length
    const maintenanceCompletionRate = maintenanceTasks.length > 0
      ? (completedMaintenance / maintenanceTasks.length) * 100
      : 0

    const overdueMaintenance = maintenanceTasks.filter(
      (t) => t.status !== 'COMPLETED' && t.scheduledDate < today
    ).length

    // Procurement & Inventory
    const procurements = await prisma.procurement.findMany({
      where: {
        millId,
        orderDate: { gte: startDate },
      },
    })

    const totalProcurementValue = procurements.reduce((sum, p) => sum + (p.totalCost || 0), 0)
    const deliveredOnTime = procurements.filter(
      (p) => p.status === 'DELIVERED' && p.deliveryDate && p.expectedDeliveryDate &&
      p.deliveryDate <= p.expectedDeliveryDate
    ).length
    const onTimeDeliveryRate = procurements.length > 0
      ? (deliveredOnTime / procurements.length) * 100
      : 0

    // Alerts & Issues
    const alerts = await prisma.alert.findMany({
      where: {
        millId,
        createdAt: { gte: startDate },
      },
    })

    const criticalAlerts = alerts.filter((a) => a.severity === 'CRITICAL').length
    const resolvedAlerts = alerts.filter((a) => a.status === 'RESOLVED').length
    const alertResolutionRate = alerts.length > 0 ? (resolvedAlerts / alerts.length) * 100 : 0

    // Team Performance
    const operators = await prisma.user.findMany({
      where: {
        millId,
        role: 'MILL_OPERATOR',
      },
    })

    const operatorBatches = await Promise.all(
      operators.map(async (op) => {
        const opBatches = await prisma.batchLog.findMany({
          where: {
            operatorId: op.id,
            batchDateTime: { gte: startDate },
          },
        })
        return {
          operatorId: op.id,
          operatorName: op.name,
          batchCount: opBatches.length,
          totalOutput: opBatches.reduce((sum, b) => sum + (b.outputWeight || 0), 0),
          avgYield: opBatches.length > 0
            ? opBatches.reduce((sum, b) => sum + (b.yieldPercentage || 0), 0) / opBatches.length
            : 0,
        }
      })
    )

    // Production Trends (daily aggregation)
    const dailyProduction = await prisma.$queryRaw<Array<{
      date: string
      batches: number
      output: number
      passed: number
    }>>`
      SELECT
        DATE(batchDateTime) as date,
        COUNT(*) as batches,
        COALESCE(SUM(outputWeight), 0) as output,
        SUM(CASE WHEN qcStatus IN ('PASS', 'EXCELLENT') THEN 1 ELSE 0 END) as passed
      FROM BatchLog
      WHERE millId = ${millId}
        AND batchDateTime >= ${startDate.toISOString()}
      GROUP BY DATE(batchDateTime)
      ORDER BY date ASC
    `

    // Product Type Distribution
    const productDistribution = await prisma.batchLog.groupBy({
      by: ['productType'],
      where: {
        millId,
        batchDateTime: { gte: startDate },
      },
      _count: { id: true },
      _sum: { outputWeight: true },
    })

    // Top Issues/Failures
    const topFailureReasons = await prisma.correctiveAction.groupBy({
      by: ['suspectedCause'],
      where: {
        batch: { millId },
        createdAt: { gte: startDate },
      },
      _count: { id: true },
      orderBy: {
        _count: { id: 'desc' },
      },
      take: 5,
    })

    return NextResponse.json({
      kpis: {
        production: {
          totalBatches: batches.length,
          totalOutput: totalProduction,
          avgYield: Math.round(avgYield * 100) / 100,
          qcPassRate: Math.round(qcPassRate * 100) / 100,
          varianceIssues,
        },
        quality: {
          totalTests: qcTests.length,
          testPassRate: Math.round(testPassRate * 100) / 100,
          criticalFailures,
          correctiveActions: correctiveActions.length,
          pendingActions,
          actionCompletionRate: Math.round(actionCompletionRate * 100) / 100,
        },
        equipment: {
          totalEquipment: equipment.length,
          operational: equipmentOperational,
          utilizationRate: Math.round(equipmentUtilization * 100) / 100,
          maintenanceTasks: maintenanceTasks.length,
          maintenanceCompletionRate: Math.round(maintenanceCompletionRate * 100) / 100,
          overdueMaintenance,
        },
        procurement: {
          totalOrders: procurements.length,
          totalValue: totalProcurementValue,
          onTimeDeliveryRate: Math.round(onTimeDeliveryRate * 100) / 100,
        },
        alerts: {
          total: alerts.length,
          critical: criticalAlerts,
          resolutionRate: Math.round(alertResolutionRate * 100) / 100,
        },
      },
      trends: {
        dailyProduction,
        productDistribution: productDistribution.map((p) => ({
          productType: p.productType,
          count: p._count.id,
          totalOutput: p._sum.outputWeight || 0,
        })),
      },
      performance: {
        operators: operatorBatches,
        topFailureReasons: topFailureReasons.map((r) => ({
          reason: r.suspectedCause || 'Unknown',
          count: r._count.id,
        })),
      },
      recentBatches: batches.slice(0, 10).map((b) => ({
        id: b.id,
        batchId: b.batchId,
        productType: b.productType,
        outputWeight: b.outputWeight,
        qcStatus: b.qcStatus,
        status: b.status,
        batchDateTime: b.batchDateTime,
      })),
    })
  } catch (error) {
    console.error('Error fetching mill manager dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
