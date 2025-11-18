import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const chartType = searchParams.get('chartType') || 'timeSeries'
    const metric = searchParams.get('metric') || 'production'
    const period = searchParams.get('period') || '30'
    const granularity = searchParams.get('granularity') || 'daily' // daily, weekly, monthly
    const groupBy = searchParams.get('groupBy') // mill, product, country, etc.
    const millId = searchParams.get('millId')
    const country = searchParams.get('country')

    const periodDays = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - periodDays)

    // Build filters
    const batchFilter: any = { batchDateTime: { gte: startDate } }
    if (millId) batchFilter.millId = millId
    if (country) {
      batchFilter.mill = { country }
    }

    let chartData: any = {}

    switch (chartType) {
      case 'timeSeries':
        chartData = await getTimeSeriesData(batchFilter, metric, granularity)
        break
      case 'comparison':
        chartData = await getComparisonData(batchFilter, metric, groupBy || 'productType')
        break
      case 'distribution':
        chartData = await getDistributionData(batchFilter, metric)
        break
      case 'composition':
        chartData = await getCompositionData(batchFilter, groupBy || 'productType')
        break
      case 'scatter':
        chartData = await getScatterData(batchFilter)
        break
      default:
        chartData = await getTimeSeriesData(batchFilter, metric, granularity)
    }

    return NextResponse.json({
      chartType,
      metric,
      period: periodDays,
      granularity,
      data: chartData,
    })
  } catch (error) {
    console.error('Error fetching chart data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chart data' },
      { status: 500 }
    )
  }
}

async function getTimeSeriesData(filter: any, metric: string, granularity: string) {
  const batches = await prisma.batchLog.findMany({
    where: filter,
    include: {
      qcTests: true,
    },
    orderBy: { batchDateTime: 'asc' },
  })

  // Group by time period
  const grouped = batches.reduce((acc, batch) => {
    let key = ''
    const date = new Date(batch.batchDateTime)

    if (granularity === 'daily') {
      key = date.toISOString().split('T')[0] // YYYY-MM-DD
    } else if (granularity === 'weekly') {
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      key = weekStart.toISOString().split('T')[0]
    } else {
      key = date.toISOString().substring(0, 7) // YYYY-MM
    }

    if (!acc[key]) {
      acc[key] = {
        date: key,
        batches: 0,
        totalOutput: 0,
        passedBatches: 0,
        failedBatches: 0,
        totalTests: 0,
        passedTests: 0,
        totalYield: 0,
        varianceIssues: 0,
      }
    }

    acc[key].batches++
    acc[key].totalOutput += batch.outputWeight || 0
    acc[key].totalYield += batch.yieldPercentage || 0

    if (batch.qcStatus === 'PASS' || batch.qcStatus === 'EXCELLENT') {
      acc[key].passedBatches++
    } else if (batch.qcStatus === 'FAIL') {
      acc[key].failedBatches++
    }

    if (Math.abs(batch.premixVariancePercent || 0) > 10) {
      acc[key].varianceIssues++
    }

    const tests = batch.qcTests || []
    acc[key].totalTests += tests.length
    acc[key].passedTests += tests.filter((t) => t.status === 'PASS').length

    return acc
  }, {} as Record<string, any>)

  // Calculate rates and return time series
  return Object.values(grouped)
    .map((period: any) => ({
      date: period.date,
      batches: period.batches,
      production: Math.round(period.totalOutput),
      avgYield: period.batches > 0 ? Math.round((period.totalYield / period.batches) * 100) / 100 : 0,
      qcPassRate: period.batches > 0 ? Math.round((period.passedBatches / period.batches) * 100 * 100) / 100 : 0,
      testPassRate: period.totalTests > 0 ? Math.round((period.passedTests / period.totalTests) * 100 * 100) / 100 : 0,
      failedBatches: period.failedBatches,
      varianceIssues: period.varianceIssues,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

async function getComparisonData(filter: any, metric: string, groupBy: string) {
  const batches = await prisma.batchLog.findMany({
    where: filter,
    include: {
      qcTests: true,
      mill: {
        select: {
          name: true,
          code: true,
          country: true,
        },
      },
    },
  })

  // Group by the specified dimension
  const grouped = batches.reduce((acc, batch) => {
    let key = ''

    switch (groupBy) {
      case 'productType':
        key = batch.productType
        break
      case 'mill':
        key = batch.mill.name
        break
      case 'country':
        key = batch.mill.country
        break
      case 'cropType':
        key = batch.cropType
        break
      case 'shift':
        key = batch.shift
        break
      default:
        key = batch.productType
    }

    if (!acc[key]) {
      acc[key] = {
        category: key,
        batches: 0,
        totalOutput: 0,
        passedBatches: 0,
        failedBatches: 0,
        totalTests: 0,
        passedTests: 0,
        totalYield: 0,
      }
    }

    acc[key].batches++
    acc[key].totalOutput += batch.outputWeight || 0
    acc[key].totalYield += batch.yieldPercentage || 0

    if (batch.qcStatus === 'PASS' || batch.qcStatus === 'EXCELLENT') {
      acc[key].passedBatches++
    } else if (batch.qcStatus === 'FAIL') {
      acc[key].failedBatches++
    }

    const tests = batch.qcTests || []
    acc[key].totalTests += tests.length
    acc[key].passedTests += tests.filter((t) => t.status === 'PASS').length

    return acc
  }, {} as Record<string, any>)

  return Object.values(grouped)
    .map((group: any) => ({
      category: group.category,
      batches: group.batches,
      production: Math.round(group.totalOutput),
      avgYield: group.batches > 0 ? Math.round((group.totalYield / group.batches) * 100) / 100 : 0,
      qcPassRate: group.batches > 0 ? Math.round((group.passedBatches / group.batches) * 100 * 100) / 100 : 0,
      testPassRate: group.totalTests > 0 ? Math.round((group.passedTests / group.totalTests) * 100 * 100) / 100 : 0,
      failedBatches: group.failedBatches,
    }))
    .sort((a, b) => b.production - a.production)
}

async function getDistributionData(filter: any, metric: string) {
  const batches = await prisma.batchLog.findMany({
    where: filter,
    include: {
      qcTests: true,
    },
  })

  let values: number[] = []
  let label = ''

  switch (metric) {
    case 'yield':
      values = batches.map((b) => b.yieldPercentage || 0)
      label = 'Yield %'
      break
    case 'outputWeight':
      values = batches.map((b) => b.outputWeight || 0)
      label = 'Output Weight (kg)'
      break
    case 'premixVariance':
      values = batches.map((b) => b.premixVariancePercent || 0)
      label = 'Premix Variance %'
      break
    default:
      values = batches.map((b) => b.yieldPercentage || 0)
      label = 'Yield %'
  }

  // Create histogram bins
  const min = Math.min(...values)
  const max = Math.max(...values)
  const binCount = 10
  const binSize = (max - min) / binCount

  const histogram = Array.from({ length: binCount }, (_, i) => {
    const binStart = min + i * binSize
    const binEnd = binStart + binSize
    const count = values.filter((v) => v >= binStart && v < binEnd).length

    return {
      bin: `${Math.round(binStart)}-${Math.round(binEnd)}`,
      binStart,
      binEnd,
      count,
      percentage: (count / values.length) * 100,
    }
  })

  // Calculate statistics
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  const sortedValues = [...values].sort((a, b) => a - b)
  const median = sortedValues[Math.floor(sortedValues.length / 2)]
  const q1 = sortedValues[Math.floor(sortedValues.length * 0.25)]
  const q3 = sortedValues[Math.floor(sortedValues.length * 0.75)]
  const stdDev = Math.sqrt(
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
  )

  return {
    histogram,
    statistics: {
      count: values.length,
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      q1: Math.round(q1 * 100) / 100,
      q3: Math.round(q3 * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
    },
    boxPlot: {
      min,
      q1,
      median,
      q3,
      max,
      outliers: values.filter((v) => v < q1 - 1.5 * (q3 - q1) || v > q3 + 1.5 * (q3 - q1)),
    },
    label,
  }
}

async function getCompositionData(filter: any, groupBy: string) {
  const batches = await prisma.batchLog.findMany({
    where: filter,
    include: {
      mill: {
        select: {
          name: true,
          country: true,
        },
      },
    },
  })

  const grouped = batches.reduce((acc, batch) => {
    let key = ''

    switch (groupBy) {
      case 'productType':
        key = batch.productType
        break
      case 'cropType':
        key = batch.cropType
        break
      case 'qcStatus':
        key = batch.qcStatus || 'UNKNOWN'
        break
      case 'shift':
        key = batch.shift
        break
      case 'country':
        key = batch.mill.country
        break
      default:
        key = batch.productType
    }

    if (!acc[key]) {
      acc[key] = { category: key, count: 0, value: 0 }
    }

    acc[key].count++
    acc[key].value += batch.outputWeight || 0

    return acc
  }, {} as Record<string, any>)

  const total = Object.values(grouped).reduce((sum: number, g: any) => sum + g.value, 0)

  return Object.values(grouped)
    .map((group: any) => ({
      category: group.category,
      count: group.count,
      value: Math.round(group.value),
      percentage: total > 0 ? Math.round((group.value / total) * 100 * 100) / 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)
}

async function getScatterData(filter: any) {
  const batches = await prisma.batchLog.findMany({
    where: filter,
    include: {
      qcTests: true,
    },
  })

  return batches.map((batch) => {
    const tests = batch.qcTests || []
    const avgTestResult = tests.length > 0
      ? tests.reduce((sum, t) => sum + (t.result || 0), 0) / tests.length
      : 0

    return {
      x: batch.yieldPercentage || 0,
      y: batch.premixVariancePercent || 0,
      size: batch.outputWeight || 0,
      label: batch.batchId,
      qcStatus: batch.qcStatus,
      productType: batch.productType,
      avgTestResult,
    }
  })
}
