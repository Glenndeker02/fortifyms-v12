import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Cross-filtering and drill-down API
 * Supports hierarchical data exploration and multi-dimensional filtering
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      filters = {},
      drillPath = [],
      level,
      metric = 'production',
      period = '30',
    } = body

    const periodDays = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - periodDays)

    // Build dynamic filter from cross-filter selections
    const batchFilter: any = {
      batchDateTime: { gte: startDate },
    }

    // Apply filters
    if (filters.country) batchFilter.mill = { ...batchFilter.mill, country: filters.country }
    if (filters.region) batchFilter.mill = { ...batchFilter.mill, region: filters.region }
    if (filters.millId) batchFilter.millId = filters.millId
    if (filters.productType) batchFilter.productType = filters.productType
    if (filters.cropType) batchFilter.cropType = filters.cropType
    if (filters.shift) batchFilter.shift = filters.shift
    if (filters.qcStatus) batchFilter.qcStatus = filters.qcStatus
    if (filters.dateRange) {
      batchFilter.batchDateTime = {
        gte: new Date(filters.dateRange.start),
        lte: new Date(filters.dateRange.end),
      }
    }

    // Determine drill-down level and grouping
    let currentLevel = level || drillPath.length
    let groupByField = ''

    // Hierarchical drill-down structure
    const hierarchy = [
      'country', // Level 0
      'region', // Level 1
      'mill', // Level 2
      'productType', // Level 3
      'batch', // Level 4 (detail level)
    ]

    groupByField = hierarchy[currentLevel] || 'country'

    // Fetch data based on current level
    let data: any[] = []
    let breadcrumbs = drillPath

    switch (groupByField) {
      case 'country':
        data = await getCountryLevel(batchFilter, metric)
        break
      case 'region':
        data = await getRegionLevel(batchFilter, metric, filters.country)
        breadcrumbs = [{ level: 'country', value: filters.country }]
        break
      case 'mill':
        data = await getMillLevel(batchFilter, metric)
        breadcrumbs = [
          { level: 'country', value: filters.country },
          { level: 'region', value: filters.region },
        ]
        break
      case 'productType':
        data = await getProductTypeLevel(batchFilter, metric)
        breadcrumbs = [
          ...breadcrumbs,
          { level: 'mill', value: filters.millId },
        ]
        break
      case 'batch':
        data = await getBatchLevel(batchFilter)
        break
      default:
        data = await getCountryLevel(batchFilter, metric)
    }

    // Get available filter options for cross-filtering
    const filterOptions = await getFilterOptions(batchFilter)

    return NextResponse.json({
      currentLevel: groupByField,
      data,
      breadcrumbs: breadcrumbs.filter((b) => b && b.level && b.value),
      filterOptions,
      appliedFilters: filters,
      canDrillDown: groupByField !== 'batch',
      canDrillUp: currentLevel > 0,
    })
  } catch (error) {
    console.error('Error in drill-down API:', error)
    return NextResponse.json(
      { error: 'Failed to process drill-down request' },
      { status: 500 }
    )
  }
}

async function getCountryLevel(filter: any, metric: string) {
  const batches = await prisma.batchLog.findMany({
    where: filter,
    include: {
      mill: {
        select: {
          country: true,
        },
      },
      qcTests: true,
    },
  })

  const grouped = batches.reduce((acc, batch) => {
    const country = batch.mill.country
    if (!acc[country]) {
      acc[country] = {
        country,
        batches: 0,
        production: 0,
        passed: 0,
        failed: 0,
        tests: 0,
        passedTests: 0,
        totalYield: 0,
      }
    }

    acc[country].batches++
    acc[country].production += batch.outputWeight || 0
    acc[country].totalYield += batch.yieldPercentage || 0

    if (batch.qcStatus === 'PASS' || batch.qcStatus === 'EXCELLENT') acc[country].passed++
    if (batch.qcStatus === 'FAIL') acc[country].failed++

    const tests = batch.qcTests || []
    acc[country].tests += tests.length
    acc[country].passedTests += tests.filter((t) => t.status === 'PASS').length

    return acc
  }, {} as Record<string, any>)

  return Object.values(grouped).map((g: any) => ({
    id: g.country,
    name: g.country,
    batches: g.batches,
    production: Math.round(g.production),
    avgYield: g.batches > 0 ? Math.round((g.totalYield / g.batches) * 100) / 100 : 0,
    qcPassRate: g.batches > 0 ? Math.round((g.passed / g.batches) * 100 * 100) / 100 : 0,
    testPassRate: g.tests > 0 ? Math.round((g.passedTests / g.tests) * 100 * 100) / 100 : 0,
  }))
}

async function getRegionLevel(filter: any, metric: string, country: string) {
  const batches = await prisma.batchLog.findMany({
    where: filter,
    include: {
      mill: {
        select: {
          region: true,
          country: true,
        },
      },
      qcTests: true,
    },
  })

  const grouped = batches.reduce((acc, batch) => {
    const region = batch.mill.region
    if (!acc[region]) {
      acc[region] = {
        region,
        batches: 0,
        production: 0,
        passed: 0,
        failed: 0,
        tests: 0,
        passedTests: 0,
        totalYield: 0,
      }
    }

    acc[region].batches++
    acc[region].production += batch.outputWeight || 0
    acc[region].totalYield += batch.yieldPercentage || 0

    if (batch.qcStatus === 'PASS' || batch.qcStatus === 'EXCELLENT') acc[region].passed++
    if (batch.qcStatus === 'FAIL') acc[region].failed++

    const tests = batch.qcTests || []
    acc[region].tests += tests.length
    acc[region].passedTests += tests.filter((t) => t.status === 'PASS').length

    return acc
  }, {} as Record<string, any>)

  return Object.values(grouped).map((g: any) => ({
    id: g.region,
    name: g.region,
    batches: g.batches,
    production: Math.round(g.production),
    avgYield: g.batches > 0 ? Math.round((g.totalYield / g.batches) * 100) / 100 : 0,
    qcPassRate: g.batches > 0 ? Math.round((g.passed / g.batches) * 100 * 100) / 100 : 0,
    testPassRate: g.tests > 0 ? Math.round((g.passedTests / g.tests) * 100 * 100) / 100 : 0,
  }))
}

async function getMillLevel(filter: any, metric: string) {
  const batches = await prisma.batchLog.findMany({
    where: filter,
    include: {
      mill: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      qcTests: true,
    },
  })

  const grouped = batches.reduce((acc, batch) => {
    const millId = batch.millId
    if (!acc[millId]) {
      acc[millId] = {
        millId,
        millName: batch.mill.name,
        millCode: batch.mill.code,
        batches: 0,
        production: 0,
        passed: 0,
        failed: 0,
        tests: 0,
        passedTests: 0,
        totalYield: 0,
      }
    }

    acc[millId].batches++
    acc[millId].production += batch.outputWeight || 0
    acc[millId].totalYield += batch.yieldPercentage || 0

    if (batch.qcStatus === 'PASS' || batch.qcStatus === 'EXCELLENT') acc[millId].passed++
    if (batch.qcStatus === 'FAIL') acc[millId].failed++

    const tests = batch.qcTests || []
    acc[millId].tests += tests.length
    acc[millId].passedTests += tests.filter((t) => t.status === 'PASS').length

    return acc
  }, {} as Record<string, any>)

  return Object.values(grouped).map((g: any) => ({
    id: g.millId,
    name: g.millName,
    code: g.millCode,
    batches: g.batches,
    production: Math.round(g.production),
    avgYield: g.batches > 0 ? Math.round((g.totalYield / g.batches) * 100) / 100 : 0,
    qcPassRate: g.batches > 0 ? Math.round((g.passed / g.batches) * 100 * 100) / 100 : 0,
    testPassRate: g.tests > 0 ? Math.round((g.passedTests / g.tests) * 100 * 100) / 100 : 0,
  }))
}

async function getProductTypeLevel(filter: any, metric: string) {
  const batches = await prisma.batchLog.findMany({
    where: filter,
    include: {
      qcTests: true,
    },
  })

  const grouped = batches.reduce((acc, batch) => {
    const productType = batch.productType
    if (!acc[productType]) {
      acc[productType] = {
        productType,
        batches: 0,
        production: 0,
        passed: 0,
        failed: 0,
        tests: 0,
        passedTests: 0,
        totalYield: 0,
      }
    }

    acc[productType].batches++
    acc[productType].production += batch.outputWeight || 0
    acc[productType].totalYield += batch.yieldPercentage || 0

    if (batch.qcStatus === 'PASS' || batch.qcStatus === 'EXCELLENT') acc[productType].passed++
    if (batch.qcStatus === 'FAIL') acc[productType].failed++

    const tests = batch.qcTests || []
    acc[productType].tests += tests.length
    acc[productType].passedTests += tests.filter((t) => t.status === 'PASS').length

    return acc
  }, {} as Record<string, any>)

  return Object.values(grouped).map((g: any) => ({
    id: g.productType,
    name: g.productType,
    batches: g.batches,
    production: Math.round(g.production),
    avgYield: g.batches > 0 ? Math.round((g.totalYield / g.batches) * 100) / 100 : 0,
    qcPassRate: g.batches > 0 ? Math.round((g.passed / g.batches) * 100 * 100) / 100 : 0,
    testPassRate: g.tests > 0 ? Math.round((g.passedTests / g.tests) * 100 * 100) / 100 : 0,
  }))
}

async function getBatchLevel(filter: any) {
  const batches = await prisma.batchLog.findMany({
    where: filter,
    include: {
      mill: {
        select: {
          name: true,
          code: true,
        },
      },
      qcTests: {
        select: {
          testType: true,
          status: true,
          result: true,
        },
      },
    },
    orderBy: { batchDateTime: 'desc' },
    take: 100,
  })

  return batches.map((batch) => ({
    id: batch.id,
    batchId: batch.batchId,
    millName: batch.mill.name,
    productType: batch.productType,
    cropType: batch.cropType,
    batchDateTime: batch.batchDateTime,
    outputWeight: batch.outputWeight,
    yieldPercentage: batch.yieldPercentage,
    qcStatus: batch.qcStatus,
    status: batch.status,
    premixVariancePercent: batch.premixVariancePercent,
    tests: batch.qcTests.length,
    passedTests: batch.qcTests.filter((t) => t.status === 'PASS').length,
  }))
}

async function getFilterOptions(baseFilter: any) {
  // Get unique values for each filterable dimension
  const batches = await prisma.batchLog.findMany({
    where: baseFilter,
    include: {
      mill: {
        select: {
          id: true,
          name: true,
          country: true,
          region: true,
        },
      },
    },
  })

  const countries = [...new Set(batches.map((b) => b.mill.country))]
  const regions = [...new Set(batches.map((b) => b.mill.region))]
  const mills = [...new Set(batches.map((b) => ({ id: b.millId, name: b.mill.name })))]
  const productTypes = [...new Set(batches.map((b) => b.productType))]
  const cropTypes = [...new Set(batches.map((b) => b.cropType))]
  const shifts = [...new Set(batches.map((b) => b.shift))]
  const qcStatuses = [...new Set(batches.map((b) => b.qcStatus).filter(Boolean))]

  return {
    countries,
    regions,
    mills,
    productTypes,
    cropTypes,
    shifts,
    qcStatuses,
  }
}
