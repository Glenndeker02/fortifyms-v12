import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || '90' // days
    const country = searchParams.get('country')
    const region = searchParams.get('region')

    const periodDays = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - periodDays)

    // Build filter for mills
    const millFilter: any = {}
    if (country) millFilter.country = country
    if (region) millFilter.region = region

    // Get all mills with comprehensive data
    const mills = await prisma.mill.findMany({
      where: millFilter,
      include: {
        batches: {
          where: {
            batchDateTime: { gte: startDate },
          },
          include: {
            qcTests: true,
          },
        },
        procurements: {
          where: {
            orderDate: { gte: startDate },
          },
        },
        alerts: {
          where: {
            createdAt: { gte: startDate },
          },
        },
        complianceChecklists: {
          where: {
            createdAt: { gte: startDate },
          },
        },
        inspections: {
          where: {
            scheduledDate: { gte: startDate },
          },
        },
      },
    })

    // Program-level KPIs
    const totalMills = mills.length
    const activeMills = mills.filter((m) =>
      m.batches.some((b) => {
        const daysSince = (Date.now() - b.batchDateTime.getTime()) / (1000 * 60 * 60 * 24)
        return daysSince <= 7 // Active if produced in last 7 days
      })
    ).length

    const certifiedMills = mills.filter((m) => m.certificationStatus === 'CERTIFIED').length
    const certificationRate = totalMills > 0 ? (certifiedMills / totalMills) * 100 : 0

    // Production metrics
    const allBatches = mills.flatMap((m) => m.batches)
    const totalProduction = allBatches.reduce((sum, b) => sum + (b.outputWeight || 0), 0)
    const avgYield = allBatches.length > 0
      ? allBatches.reduce((sum, b) => sum + (b.yieldPercentage || 0), 0) / allBatches.length
      : 0

    const passedBatches = allBatches.filter(
      (b) => b.qcStatus === 'PASS' || b.qcStatus === 'EXCELLENT'
    ).length
    const programQCPassRate = allBatches.length > 0 ? (passedBatches / allBatches.length) * 100 : 0

    // Quality metrics
    const allTests = allBatches.flatMap((b) => b.qcTests)
    const passedTests = allTests.filter((t) => t.status === 'PASS').length
    const testPassRate = allTests.length > 0 ? (passedTests / allTests.length) * 100 : 0
    const criticalFailures = allTests.filter((t) => t.status === 'FAIL').length

    // Compliance metrics
    const allChecklists = mills.flatMap((m) => m.complianceChecklists)
    const compliantChecklists = allChecklists.filter((c) => c.status === 'APPROVED').length
    const complianceRate = allChecklists.length > 0
      ? (compliantChecklists / allChecklists.length) * 100
      : 0

    const pendingInspections = mills.flatMap((m) => m.inspections).filter(
      (i) => i.status === 'SCHEDULED' || i.status === 'IN_PROGRESS'
    ).length

    // Alert statistics
    const allAlerts = mills.flatMap((m) => m.alerts)
    const criticalAlerts = allAlerts.filter((a) => a.severity === 'CRITICAL').length
    const resolvedAlerts = allAlerts.filter((a) => a.status === 'RESOLVED').length
    const alertResolutionRate = allAlerts.length > 0 ? (resolvedAlerts / allAlerts.length) * 100 : 0

    // Procurement metrics
    const allProcurements = mills.flatMap((m) => m.procurements)
    const totalProcurementValue = allProcurements.reduce((sum, p) => sum + (p.totalCost || 0), 0)
    const premixProcured = allProcurements
      .filter((p) => p.itemName?.toLowerCase().includes('premix'))
      .reduce((sum, p) => sum + (p.quantity || 0), 0)

    // Geographic distribution
    const geographicDistribution = mills.reduce((acc, mill) => {
      const key = `${mill.country}-${mill.region}`
      if (!acc[key]) {
        acc[key] = {
          country: mill.country,
          region: mill.region,
          mills: 0,
          production: 0,
          batches: 0,
          qcPassRate: 0,
          certifiedMills: 0,
        }
      }
      acc[key].mills++
      acc[key].production += mill.batches.reduce((sum, b) => sum + (b.outputWeight || 0), 0)
      acc[key].batches += mill.batches.length
      if (mill.certificationStatus === 'CERTIFIED') {
        acc[key].certifiedMills++
      }

      const passed = mill.batches.filter((b) => b.qcStatus === 'PASS' || b.qcStatus === 'EXCELLENT').length
      acc[key].qcPassRate = mill.batches.length > 0 ? (passed / mill.batches.length) * 100 : 0

      return acc
    }, {} as Record<string, any>)

    // Mill benchmarking and rankings
    const millPerformance = mills.map((mill) => {
      const batches = mill.batches
      const passed = batches.filter((b) => b.qcStatus === 'PASS' || b.qcStatus === 'EXCELLENT').length
      const qcPassRate = batches.length > 0 ? (passed / batches.length) * 100 : 0

      const totalOutput = batches.reduce((sum, b) => sum + (b.outputWeight || 0), 0)
      const avgYield = batches.length > 0
        ? batches.reduce((sum, b) => sum + (b.yieldPercentage || 0), 0) / batches.length
        : 0

      const criticalIssues = mill.alerts.filter((a) => a.severity === 'CRITICAL').length
      const complianceScore = mill.complianceChecklists.length > 0
        ? (mill.complianceChecklists.filter((c) => c.status === 'APPROVED').length /
            mill.complianceChecklists.length) *
          100
        : 0

      const performanceScore =
        qcPassRate * 0.4 + avgYield * 0.3 + complianceScore * 0.2 + (100 - criticalIssues * 10) * 0.1

      return {
        millId: mill.id,
        millName: mill.name,
        millCode: mill.code,
        country: mill.country,
        region: mill.region,
        certificationStatus: mill.certificationStatus,
        batches: batches.length,
        totalOutput,
        qcPassRate: Math.round(qcPassRate * 100) / 100,
        avgYield: Math.round(avgYield * 100) / 100,
        complianceScore: Math.round(complianceScore * 100) / 100,
        criticalIssues,
        performanceScore: Math.round(performanceScore * 100) / 100,
        latitude: mill.latitude,
        longitude: mill.longitude,
      }
    }).sort((a, b) => b.performanceScore - a.performanceScore)

    // Trend analysis (monthly aggregation)
    const monthlyTrends = await prisma.$queryRaw<Array<{
      month: string
      batches: number
      production: number
      qcPassRate: number
    }>>`
      SELECT
        strftime('%Y-%m', batchDateTime) as month,
        COUNT(*) as batches,
        COALESCE(SUM(outputWeight), 0) as production,
        ROUND(SUM(CASE WHEN qcStatus IN ('PASS', 'EXCELLENT') THEN 1.0 ELSE 0 END) * 100.0 / COUNT(*), 2) as qcPassRate
      FROM BatchLog
      WHERE batchDateTime >= ${startDate.toISOString()}
      GROUP BY strftime('%Y-%m', batchDateTime)
      ORDER BY month ASC
    `

    // Product type distribution across program
    const productDistribution = await prisma.batchLog.groupBy({
      by: ['productType'],
      where: {
        batchDateTime: { gte: startDate },
        mill: millFilter,
      },
      _count: { id: true },
      _sum: { outputWeight: true },
    })

    // Top performing mills
    const topMills = millPerformance.slice(0, 10)

    // Mills needing attention
    const millsNeedingAttention = millPerformance.filter(
      (m) =>
        m.qcPassRate < 80 ||
        m.criticalIssues >= 2 ||
        m.complianceScore < 70 ||
        m.certificationStatus !== 'CERTIFIED'
    )

    // Impact metrics
    const beneficiaries = allBatches.reduce((sum, b) => {
      // Estimate beneficiaries: 1kg serves ~20 people
      return sum + (b.outputWeight || 0) * 20
    }, 0)

    const nutrientsDelivered = {
      ironMg: totalProduction * 0.028, // 28mg per kg
      vitaminAIU: totalProduction * 2500, // 2500 IU per kg
      folicAcidMcg: totalProduction * 1.5, // 1.5mg per kg
    }

    return NextResponse.json({
      programOverview: {
        totalMills,
        activeMills,
        certifiedMills,
        certificationRate: Math.round(certificationRate * 100) / 100,
        totalBatches: allBatches.length,
        totalProduction: Math.round(totalProduction),
        programQCPassRate: Math.round(programQCPassRate * 100) / 100,
        avgYield: Math.round(avgYield * 100) / 100,
      },
      qualityMetrics: {
        totalTests: allTests.length,
        testPassRate: Math.round(testPassRate * 100) / 100,
        criticalFailures,
        qcPassRate: Math.round(programQCPassRate * 100) / 100,
      },
      complianceMetrics: {
        totalChecklists: allChecklists.length,
        complianceRate: Math.round(complianceRate * 100) / 100,
        pendingInspections,
      },
      alerts: {
        total: allAlerts.length,
        critical: criticalAlerts,
        resolutionRate: Math.round(alertResolutionRate * 100) / 100,
      },
      procurement: {
        totalOrders: allProcurements.length,
        totalValue: totalProcurementValue,
        premixProcured,
      },
      impact: {
        estimatedBeneficiaries: Math.round(beneficiaries),
        nutrientsDelivered,
      },
      geographicDistribution: Object.values(geographicDistribution),
      millPerformance: {
        all: millPerformance,
        top: topMills,
        needingAttention: millsNeedingAttention,
      },
      trends: {
        monthly: monthlyTrends,
        productDistribution: productDistribution.map((p) => ({
          productType: p.productType,
          count: p._count.id,
          totalOutput: p._sum.outputWeight || 0,
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching program manager dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
