import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const mapType = searchParams.get('mapType') || 'pin' // pin, heat, choropleth
    const metric = searchParams.get('metric') || 'production' // production, quality, compliance, alerts
    const period = searchParams.get('period') || '30' // days
    const country = searchParams.get('country')
    const region = searchParams.get('region')

    const periodDays = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - periodDays)

    // Build filter
    const millFilter: any = {}
    if (country) millFilter.country = country
    if (region) millFilter.region = region

    // Get mills with comprehensive data
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
      },
    })

    // Calculate metrics for each mill
    const millData = mills.map((mill) => {
      const batches = mill.batches
      const totalProduction = batches.reduce((sum, b) => sum + (b.outputWeight || 0), 0)

      const passedBatches = batches.filter(
        (b) => b.qcStatus === 'PASS' || b.qcStatus === 'EXCELLENT'
      ).length
      const qcPassRate = batches.length > 0 ? (passedBatches / batches.length) * 100 : 0

      const tests = batches.flatMap((b) => b.qcTests)
      const passedTests = tests.filter((t) => t.status === 'PASS').length
      const testPassRate = tests.length > 0 ? (passedTests / tests.length) * 100 : 0

      const complianceScore = mill.complianceChecklists.length > 0
        ? (mill.complianceChecklists.filter((c) => c.status === 'APPROVED').length /
            mill.complianceChecklists.length) *
          100
        : 0

      const criticalAlerts = mill.alerts.filter((a) => a.severity === 'CRITICAL').length
      const totalAlerts = mill.alerts.length

      // Calculate metric value based on selected metric
      let metricValue = 0
      let metricLabel = ''
      let intensity = 0 // 0-100 for heat maps

      switch (metric) {
        case 'production':
          metricValue = totalProduction
          metricLabel = `${Math.round(totalProduction)}kg`
          intensity = Math.min(100, (totalProduction / 10000) * 100) // Scale: 10,000kg = 100%
          break
        case 'quality':
          metricValue = qcPassRate
          metricLabel = `${Math.round(qcPassRate)}%`
          intensity = qcPassRate
          break
        case 'compliance':
          metricValue = complianceScore
          metricLabel = `${Math.round(complianceScore)}%`
          intensity = complianceScore
          break
        case 'alerts':
          metricValue = criticalAlerts
          metricLabel = `${criticalAlerts} critical`
          intensity = Math.min(100, criticalAlerts * 20) // Scale: 5 alerts = 100%
          break
        default:
          metricValue = totalProduction
          metricLabel = `${Math.round(totalProduction)}kg`
          intensity = Math.min(100, (totalProduction / 10000) * 100)
      }

      // Determine color/risk level
      let color = '#10b981' // green
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW'

      if (metric === 'quality' || metric === 'compliance') {
        if (metricValue < 70) {
          color = '#ef4444' // red
          riskLevel = 'CRITICAL'
        } else if (metricValue < 80) {
          color = '#f59e0b' // orange
          riskLevel = 'HIGH'
        } else if (metricValue < 90) {
          color = '#eab308' // yellow
          riskLevel = 'MEDIUM'
        }
      } else if (metric === 'alerts') {
        if (metricValue >= 5) {
          color = '#ef4444'
          riskLevel = 'CRITICAL'
        } else if (metricValue >= 3) {
          color = '#f59e0b'
          riskLevel = 'HIGH'
        } else if (metricValue >= 1) {
          color = '#eab308'
          riskLevel = 'MEDIUM'
        }
      }

      return {
        millId: mill.id,
        millName: mill.name,
        millCode: mill.code,
        country: mill.country,
        region: mill.region,
        latitude: mill.latitude,
        longitude: mill.longitude,
        certificationStatus: mill.certificationStatus,
        metricValue,
        metricLabel,
        intensity,
        color,
        riskLevel,
        details: {
          totalBatches: batches.length,
          totalProduction,
          qcPassRate: Math.round(qcPassRate * 100) / 100,
          testPassRate: Math.round(testPassRate * 100) / 100,
          complianceScore: Math.round(complianceScore * 100) / 100,
          criticalAlerts,
          totalAlerts,
        },
      }
    })

    // Geographic aggregation for choropleth maps
    const countryAggregation = mills.reduce((acc, mill) => {
      if (!acc[mill.country]) {
        acc[mill.country] = {
          country: mill.country,
          mills: 0,
          totalProduction: 0,
          totalBatches: 0,
          passedBatches: 0,
          criticalAlerts: 0,
          regions: {},
        }
      }

      const batches = mill.batches
      const passed = batches.filter((b) => b.qcStatus === 'PASS' || b.qcStatus === 'EXCELLENT').length
      const production = batches.reduce((sum, b) => sum + (b.outputWeight || 0), 0)
      const critical = mill.alerts.filter((a) => a.severity === 'CRITICAL').length

      acc[mill.country].mills++
      acc[mill.country].totalBatches += batches.length
      acc[mill.country].totalProduction += production
      acc[mill.country].passedBatches += passed
      acc[mill.country].criticalAlerts += critical

      // Region aggregation
      if (!acc[mill.country].regions[mill.region]) {
        acc[mill.country].regions[mill.region] = {
          region: mill.region,
          mills: 0,
          totalProduction: 0,
          totalBatches: 0,
          passedBatches: 0,
          criticalAlerts: 0,
        }
      }

      acc[mill.country].regions[mill.region].mills++
      acc[mill.country].regions[mill.region].totalBatches += batches.length
      acc[mill.country].regions[mill.region].totalProduction += production
      acc[mill.country].regions[mill.region].passedBatches += passed
      acc[mill.country].regions[mill.region].criticalAlerts += critical

      return acc
    }, {} as Record<string, any>)

    // Calculate rates for choropleth
    const choroplethData = Object.values(countryAggregation).map((country: any) => {
      const qcPassRate = country.totalBatches > 0
        ? (country.passedBatches / country.totalBatches) * 100
        : 0

      let value = 0
      switch (metric) {
        case 'production':
          value = country.totalProduction
          break
        case 'quality':
          value = qcPassRate
          break
        case 'alerts':
          value = country.criticalAlerts
          break
        default:
          value = country.totalProduction
      }

      return {
        country: country.country,
        value,
        mills: country.mills,
        details: {
          totalBatches: country.totalBatches,
          totalProduction: country.totalProduction,
          qcPassRate: Math.round(qcPassRate * 100) / 100,
          criticalAlerts: country.criticalAlerts,
        },
        regions: Object.values(country.regions),
      }
    })

    // Heat map zones (grid-based aggregation)
    const heatMapZones = millData.map((mill) => ({
      lat: mill.latitude,
      lng: mill.longitude,
      weight: mill.intensity,
      radius: 50000, // 50km radius
      mill: {
        name: mill.millName,
        code: mill.millCode,
        metricLabel: mill.metricLabel,
      },
    }))

    // Response based on map type
    let responseData: any = {
      mapType,
      metric,
      period: periodDays,
      totalMills: mills.length,
    }

    switch (mapType) {
      case 'pin':
        responseData.markers = millData
        break
      case 'heat':
        responseData.heatMapZones = heatMapZones
        responseData.markers = millData // Include markers for reference
        break
      case 'choropleth':
        responseData.choroplethData = choroplethData
        break
      default:
        responseData.markers = millData
    }

    // Add summary statistics
    responseData.summary = {
      totalMills: mills.length,
      totalProduction: millData.reduce((sum, m) => sum + m.details.totalProduction, 0),
      avgQCPassRate:
        millData.reduce((sum, m) => sum + m.details.qcPassRate, 0) / (millData.length || 1),
      criticalAlerts: millData.reduce((sum, m) => sum + m.details.criticalAlerts, 0),
      countries: Object.keys(countryAggregation).length,
      highRiskMills: millData.filter(
        (m) => m.riskLevel === 'HIGH' || m.riskLevel === 'CRITICAL'
      ).length,
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Error fetching geographic data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch geographic data' },
      { status: 500 }
    )
  }
}
