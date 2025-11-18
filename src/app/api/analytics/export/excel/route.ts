import { NextRequest, NextResponse } from 'next/server'

/**
 * Excel Export API
 *
 * NOTE: To enable full Excel export functionality, install the 'xlsx' package:
 * npm install xlsx
 *
 * Then uncomment the import and implementation below.
 */

// import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      reportType,
      reportData,
      title,
      sheets = [],
      includeFormatting = true,
      includeCharts = false,
    } = body

    if (!reportType || !reportData) {
      return NextResponse.json(
        { error: 'reportType and reportData are required' },
        { status: 400 }
      )
    }

    // Structure workbook data
    const workbookData = buildWorkbookData(reportType, reportData, {
      includeFormatting,
      includeCharts,
    })

    /**
     * Full implementation with xlsx package:
     *
     * const workbook = XLSX.utils.book_new()
     *
     * // Add sheets
     * workbookData.sheets.forEach(sheet => {
     *   const worksheet = XLSX.utils.json_to_sheet(sheet.data)
     *
     *   // Apply column widths
     *   if (sheet.columnWidths) {
     *     worksheet['!cols'] = sheet.columnWidths
     *   }
     *
     *   // Apply formatting
     *   if (includeFormatting && sheet.formatting) {
     *     applyFormatting(worksheet, sheet.formatting)
     *   }
     *
     *   XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name)
     * })
     *
     * // Generate Excel file buffer
     * const excelBuffer = XLSX.write(workbook, {
     *   bookType: 'xlsx',
     *   type: 'buffer',
     *   cellStyles: includeFormatting
     * })
     *
     * // Return as downloadable file
     * return new NextResponse(excelBuffer, {
     *   headers: {
     *     'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
     *     'Content-Disposition': `attachment; filename="${title || reportType}-${Date.now()}.xlsx"`
     *   }
     * })
     */

    // For now, return structured data
    return NextResponse.json({
      success: true,
      format: 'excel',
      workbookData,
      downloadUrl: `/api/analytics/export/excel/download?id=${Date.now()}`,
      message: 'Excel structure generated. Install xlsx package for actual file generation.',
      installCommand: 'npm install xlsx',
    })
  } catch (error) {
    console.error('Error generating Excel:', error)
    return NextResponse.json({ error: 'Failed to generate Excel' }, { status: 500 })
  }
}

function buildWorkbookData(reportType: string, data: any, options: any) {
  const sheets: any[] = []

  // Summary sheet
  if (data.summary || data.kpis || data.executiveSummary) {
    sheets.push({
      name: 'Summary',
      data: buildSummarySheet(data),
      columnWidths: [
        { wch: 25 }, // Column A
        { wch: 15 }, // Column B
        { wch: 15 }, // Column C
      ],
      formatting: {
        headerRow: 1,
        headerStyle: {
          bold: true,
          bgColor: '059669',
          fontColor: 'FFFFFF',
        },
      },
    })
  }

  // Production data sheet
  if (data.production || data.batches) {
    const productionData = data.production || data.batches
    sheets.push({
      name: 'Production',
      data: Array.isArray(productionData)
        ? productionData
        : flattenObjectToArray(productionData),
      columnWidths: [
        { wch: 20 },
        { wch: 15 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 15 },
      ],
      formatting: {
        headerRow: 1,
        headerStyle: {
          bold: true,
          bgColor: '1f2937',
          fontColor: 'FFFFFF',
        },
        dataValidation: {
          column: 'Status',
          list: ['PASS', 'FAIL', 'PENDING', 'QUARANTINED'],
        },
      },
    })
  }

  // Quality/QC data sheet
  if (data.quality || data.qcTests) {
    const qualityData = data.quality || data.qcTests
    sheets.push({
      name: 'Quality Control',
      data: Array.isArray(qualityData) ? qualityData : flattenObjectToArray(qualityData),
      columnWidths: [
        { wch: 15 },
        { wch: 20 },
        { wch: 12 },
        { wch: 10 },
        { wch: 12 },
        { wch: 30 },
      ],
      formatting: {
        headerRow: 1,
        conditionalFormatting: [
          {
            column: 'Status',
            rules: [
              { value: 'PASS', bgColor: '10b981', fontColor: 'FFFFFF' },
              { value: 'FAIL', bgColor: 'ef4444', fontColor: 'FFFFFF' },
              { value: 'MARGINAL', bgColor: 'f59e0b', fontColor: 'FFFFFF' },
            ],
          },
        ],
      },
    })
  }

  // Trends/Analytics sheet
  if (data.trends || data.dailyProduction || data.monthlyData) {
    const trendsData = data.trends || data.dailyProduction || data.monthlyData
    sheets.push({
      name: 'Trends',
      data: Array.isArray(trendsData) ? trendsData : flattenObjectToArray(trendsData),
      columnWidths: [
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
      ],
      formatting: {
        headerRow: 1,
        charts: options.includeCharts
          ? [
              {
                type: 'line',
                title: 'Production Trend',
                xAxis: 'date',
                yAxis: 'production',
                position: 'H2',
              },
            ]
          : [],
      },
    })
  }

  // Equipment/Maintenance sheet
  if (data.equipment || data.maintenanceTasks) {
    const equipmentData = data.equipment || data.maintenanceTasks
    sheets.push({
      name: 'Equipment',
      data: Array.isArray(equipmentData)
        ? equipmentData
        : flattenObjectToArray(equipmentData),
      columnWidths: [
        { wch: 20 },
        { wch: 15 },
        { wch: 12 },
        { wch: 15 },
        { wch: 12 },
      ],
    })
  }

  // Alerts/Issues sheet
  if (data.alerts || data.issues) {
    const alertsData = data.alerts || data.issues
    sheets.push({
      name: 'Alerts',
      data: Array.isArray(alertsData) ? alertsData : flattenObjectToArray(alertsData),
      columnWidths: [
        { wch: 15 },
        { wch: 12 },
        { wch: 30 },
        { wch: 12 },
        { wch: 12 },
      ],
      formatting: {
        conditionalFormatting: [
          {
            column: 'Severity',
            rules: [
              { value: 'CRITICAL', bgColor: 'dc2626', fontColor: 'FFFFFF' },
              { value: 'HIGH', bgColor: 'f59e0b', fontColor: 'FFFFFF' },
              { value: 'MEDIUM', bgColor: 'eab308', fontColor: '000000' },
              { value: 'LOW', bgColor: 'd1d5db', fontColor: '000000' },
            ],
          },
        ],
      },
    })
  }

  // Metadata sheet
  sheets.push({
    name: 'Report Info',
    data: [
      { Field: 'Report Type', Value: reportType },
      { Field: 'Generated At', Value: new Date().toISOString() },
      { Field: 'Generated By', Value: 'FortifyMIS v12' },
      { Field: 'Period', Value: data.period || 'N/A' },
      { Field: 'Total Records', Value: calculateTotalRecords(data) },
    ],
    columnWidths: [{ wch: 20 }, { wch: 40 }],
  })

  return {
    title: data.title || `${reportType} Report`,
    sheets,
    properties: {
      Title: data.title || `${reportType} Report`,
      Subject: 'FortifyMIS Report',
      Author: 'FortifyMIS System',
      CreatedDate: new Date(),
    },
  }
}

function buildSummarySheet(data: any) {
  const summaryRows: any[] = []

  // Extract KPIs
  if (data.kpis) {
    summaryRows.push({ Section: 'Key Performance Indicators', Metric: '', Value: '' })

    const flatKPIs = flattenObject(data.kpis)
    Object.entries(flatKPIs).forEach(([key, value]) => {
      summaryRows.push({
        Section: '',
        Metric: formatLabel(key),
        Value: value,
      })
    })
  }

  // Extract summary metrics
  if (data.summary) {
    summaryRows.push({ Section: '', Metric: '', Value: '' })
    summaryRows.push({ Section: 'Summary', Metric: '', Value: '' })

    const flatSummary = flattenObject(data.summary)
    Object.entries(flatSummary).forEach(([key, value]) => {
      summaryRows.push({
        Section: '',
        Metric: formatLabel(key),
        Value: value,
      })
    })
  }

  return summaryRows
}

function flattenObject(obj: any, prefix = ''): Record<string, any> {
  return Object.keys(obj).reduce((acc: Record<string, any>, key: string) => {
    const pre = prefix.length ? `${prefix}.` : ''
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(acc, flattenObject(obj[key], pre + key))
    } else {
      acc[pre + key] = obj[key]
    }
    return acc
  }, {})
}

function flattenObjectToArray(obj: any): any[] {
  if (Array.isArray(obj)) return obj
  return [obj]
}

function formatLabel(key: string): string {
  return key
    .split(/[._-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function calculateTotalRecords(data: any): number {
  let count = 0
  Object.values(data).forEach((value) => {
    if (Array.isArray(value)) {
      count += value.length
    }
  })
  return count
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Excel ID required' }, { status: 400 })
    }

    return NextResponse.json({
      message: 'Excel download endpoint - implement file retrieval from storage',
      id,
    })
  } catch (error) {
    console.error('Error downloading Excel:', error)
    return NextResponse.json({ error: 'Failed to download Excel' }, { status: 500 })
  }
}
