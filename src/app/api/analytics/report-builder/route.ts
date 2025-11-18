import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

/**
 * Custom Report Builder API
 * Supports drag-and-drop report creation with custom data sources and layouts
 */

const reportSectionSchema = z.object({
  id: z.string(),
  type: z.enum([
    'header',
    'kpi-card',
    'table',
    'chart',
    'text',
    'image',
    'spacer',
    'divider',
  ]),
  title: z.string().optional(),
  dataSource: z.string().optional(),
  config: z.any().optional(),
  layout: z
    .object({
      width: z.enum(['full', 'half', 'third', 'quarter']).default('full'),
      order: z.number(),
    })
    .optional(),
})

const customReportSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  category: z.enum([
    'PRODUCTION',
    'QUALITY',
    'COMPLIANCE',
    'MAINTENANCE',
    'PROCUREMENT',
    'ANALYTICS',
    'CUSTOM',
  ]),
  sections: z.array(reportSectionSchema),
  filters: z.array(z.string()).optional(),
  schedule: z
    .object({
      enabled: z.boolean(),
      frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY']),
      time: z.string(),
      day: z.union([z.string(), z.number()]).optional(),
      recipients: z.array(z.string()),
    })
    .optional(),
  styling: z
    .object({
      theme: z.enum(['default', 'modern', 'classic', 'minimal']).default('default'),
      primaryColor: z.string().optional(),
      logoUrl: z.string().optional(),
    })
    .optional(),
})

// GET - List available data sources and templates
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')

    switch (action) {
      case 'data-sources':
        return NextResponse.json(getAvailableDataSources())

      case 'templates':
        const templates = await prisma.reportTemplate.findMany({
          where: {
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            sections: true,
            styling: true,
            isCustom: true,
          },
          orderBy: { createdAt: 'desc' },
        })
        return NextResponse.json(templates)

      case 'my-reports':
        const userId = searchParams.get('userId')
        if (!userId) {
          return NextResponse.json({ error: 'userId required' }, { status: 400 })
        }

        const userReports = await prisma.reportTemplate.findMany({
          where: {
            createdBy: userId,
          },
          orderBy: { createdAt: 'desc' },
        })
        return NextResponse.json(userReports)

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: data-sources, templates, my-reports' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error in report builder GET:', error)
    return NextResponse.json(
      { error: 'Failed to fetch report builder data' },
      { status: 500 }
    )
  }
}

// POST - Create custom report
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, ...reportData } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Validate report structure
    const validated = customReportSchema.parse(reportData)

    // Create report template
    const reportTemplate = await prisma.reportTemplate.create({
      data: {
        name: validated.name,
        description: validated.description,
        category: validated.category,
        sections: validated.sections as any,
        filters: validated.filters || [],
        styling: validated.styling || {},
        isCustom: true,
        isActive: true,
        createdBy: userId,
      },
    })

    // If schedule is enabled, create scheduled report
    if (validated.schedule?.enabled) {
      await prisma.scheduledReport.create({
        data: {
          templateId: reportTemplate.id,
          userId,
          frequency: validated.schedule.frequency,
          time: validated.schedule.time,
          day: validated.schedule.day?.toString(),
          recipients: validated.schedule.recipients,
          isActive: true,
          nextRun: calculateNextRun(validated.schedule as any),
        },
      })
    }

    return NextResponse.json({
      success: true,
      reportTemplate,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid report structure', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating custom report:', error)
    return NextResponse.json(
      { error: 'Failed to create custom report' },
      { status: 500 }
    )
  }
}

// PUT - Update custom report
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, userId, ...updates } = body

    if (!id || !userId) {
      return NextResponse.json({ error: 'id and userId required' }, { status: 400 })
    }

    // Verify ownership
    const existing = await prisma.reportTemplate.findUnique({
      where: { id },
    })

    if (!existing || existing.createdBy !== userId) {
      return NextResponse.json(
        { error: 'Report not found or unauthorized' },
        { status: 404 }
      )
    }

    // Update report
    const updated = await prisma.reportTemplate.update({
      where: { id },
      data: {
        name: updates.name,
        description: updates.description,
        category: updates.category,
        sections: updates.sections,
        filters: updates.filters,
        styling: updates.styling,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating custom report:', error)
    return NextResponse.json(
      { error: 'Failed to update custom report' },
      { status: 500 }
    )
  }
}

// DELETE - Delete custom report
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const userId = searchParams.get('userId')

    if (!id || !userId) {
      return NextResponse.json({ error: 'id and userId required' }, { status: 400 })
    }

    // Verify ownership
    const existing = await prisma.reportTemplate.findUnique({
      where: { id },
    })

    if (!existing || existing.createdBy !== userId) {
      return NextResponse.json(
        { error: 'Report not found or unauthorized' },
        { status: 404 }
      )
    }

    // Delete scheduled reports first
    await prisma.scheduledReport.deleteMany({
      where: { templateId: id },
    })

    // Delete template
    await prisma.reportTemplate.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting custom report:', error)
    return NextResponse.json(
      { error: 'Failed to delete custom report' },
      { status: 500 }
    )
  }
}

function getAvailableDataSources() {
  return {
    tables: [
      {
        id: 'batches',
        name: 'Production Batches',
        description: 'All production batch records',
        fields: [
          { name: 'batchId', type: 'string', label: 'Batch ID' },
          { name: 'batchDateTime', type: 'datetime', label: 'Date/Time' },
          { name: 'outputWeight', type: 'number', label: 'Output (kg)' },
          { name: 'yieldPercentage', type: 'number', label: 'Yield %' },
          { name: 'qcStatus', type: 'enum', label: 'QC Status' },
          { name: 'productType', type: 'string', label: 'Product Type' },
          { name: 'shift', type: 'enum', label: 'Shift' },
        ],
        aggregations: ['count', 'sum', 'avg', 'min', 'max'],
      },
      {
        id: 'qc-tests',
        name: 'QC Tests',
        description: 'Quality control test results',
        fields: [
          { name: 'testType', type: 'string', label: 'Test Type' },
          { name: 'result', type: 'number', label: 'Result' },
          { name: 'target', type: 'number', label: 'Target' },
          { name: 'status', type: 'enum', label: 'Status' },
          { name: 'testDate', type: 'datetime', label: 'Test Date' },
        ],
        aggregations: ['count', 'avg', 'min', 'max'],
      },
      {
        id: 'maintenance',
        name: 'Maintenance Tasks',
        description: 'Equipment maintenance records',
        fields: [
          { name: 'equipmentName', type: 'string', label: 'Equipment' },
          { name: 'taskType', type: 'enum', label: 'Task Type' },
          { name: 'status', type: 'enum', label: 'Status' },
          { name: 'scheduledDate', type: 'datetime', label: 'Scheduled Date' },
          { name: 'completedAt', type: 'datetime', label: 'Completed Date' },
        ],
        aggregations: ['count'],
      },
      {
        id: 'alerts',
        name: 'Alerts',
        description: 'System alerts and notifications',
        fields: [
          { name: 'type', type: 'enum', label: 'Alert Type' },
          { name: 'severity', type: 'enum', label: 'Severity' },
          { name: 'title', type: 'string', label: 'Title' },
          { name: 'status', type: 'enum', label: 'Status' },
          { name: 'createdAt', type: 'datetime', label: 'Created At' },
        ],
        aggregations: ['count'],
      },
      {
        id: 'procurement',
        name: 'Procurement Orders',
        description: 'Procurement and inventory data',
        fields: [
          { name: 'orderId', type: 'string', label: 'Order ID' },
          { name: 'itemName', type: 'string', label: 'Item' },
          { name: 'quantity', type: 'number', label: 'Quantity' },
          { name: 'totalCost', type: 'number', label: 'Cost' },
          { name: 'status', type: 'enum', label: 'Status' },
          { name: 'orderDate', type: 'datetime', label: 'Order Date' },
        ],
        aggregations: ['count', 'sum', 'avg'],
      },
    ],
    metrics: [
      {
        id: 'production-total',
        name: 'Total Production',
        formula: 'SUM(batches.outputWeight)',
        unit: 'kg',
      },
      {
        id: 'qc-pass-rate',
        name: 'QC Pass Rate',
        formula: 'COUNT(batches WHERE qcStatus = PASS) / COUNT(batches) * 100',
        unit: '%',
      },
      {
        id: 'avg-yield',
        name: 'Average Yield',
        formula: 'AVG(batches.yieldPercentage)',
        unit: '%',
      },
      {
        id: 'test-pass-rate',
        name: 'Test Pass Rate',
        formula: 'COUNT(qcTests WHERE status = PASS) / COUNT(qcTests) * 100',
        unit: '%',
      },
      {
        id: 'maintenance-completion',
        name: 'Maintenance Completion Rate',
        formula:
          'COUNT(maintenance WHERE status = COMPLETED) / COUNT(maintenance) * 100',
        unit: '%',
      },
    ],
    filters: [
      { id: 'dateRange', name: 'Date Range', type: 'date-range' },
      { id: 'mill', name: 'Mill', type: 'select', dataSource: 'mills' },
      { id: 'productType', name: 'Product Type', type: 'select', dataSource: 'products' },
      { id: 'shift', name: 'Shift', type: 'select', options: ['MORNING', 'AFTERNOON', 'NIGHT'] },
      { id: 'qcStatus', name: 'QC Status', type: 'select', options: ['PASS', 'FAIL', 'PENDING'] },
    ],
    chartTypes: [
      { id: 'line', name: 'Line Chart', icon: 'TrendingUp' },
      { id: 'bar', name: 'Bar Chart', icon: 'BarChart3' },
      { id: 'pie', name: 'Pie Chart', icon: 'PieChart' },
      { id: 'area', name: 'Area Chart', icon: 'AreaChart' },
      { id: 'scatter', name: 'Scatter Plot', icon: 'ScatterChart' },
      { id: 'table', name: 'Data Table', icon: 'Table' },
    ],
  }
}

function calculateNextRun(schedule: {
  frequency: string
  time: string
  day?: string | number
}): Date {
  const now = new Date()
  const [hours, minutes] = schedule.time.split(':').map(Number)

  switch (schedule.frequency) {
    case 'DAILY':
      const nextDaily = new Date(now)
      nextDaily.setHours(hours, minutes, 0, 0)
      if (nextDaily <= now) {
        nextDaily.setDate(nextDaily.getDate() + 1)
      }
      return nextDaily

    case 'WEEKLY':
      const dayMap: Record<string, number> = {
        SUNDAY: 0,
        MONDAY: 1,
        TUESDAY: 2,
        WEDNESDAY: 3,
        THURSDAY: 4,
        FRIDAY: 5,
        SATURDAY: 6,
      }
      const targetDay = typeof schedule.day === 'string' ? dayMap[schedule.day] : 1
      const nextWeekly = new Date(now)
      const currentDay = now.getDay()

      let daysUntilTarget = targetDay - currentDay
      if (daysUntilTarget <= 0) {
        daysUntilTarget += 7
      }

      nextWeekly.setDate(nextWeekly.getDate() + daysUntilTarget)
      nextWeekly.setHours(hours, minutes, 0, 0)
      return nextWeekly

    case 'MONTHLY':
      const day = typeof schedule.day === 'number' ? schedule.day : 1
      const nextMonthly = new Date(now.getFullYear(), now.getMonth(), day, hours, minutes, 0, 0)
      if (nextMonthly <= now) {
        nextMonthly.setMonth(nextMonthly.getMonth() + 1)
      }
      return nextMonthly

    case 'QUARTERLY':
      const qDay = typeof schedule.day === 'number' ? schedule.day : 1
      const currentQuarter = Math.floor(now.getMonth() / 3)
      const nextQuarter = new Date(
        now.getFullYear(),
        (currentQuarter + 1) * 3,
        qDay,
        hours,
        minutes,
        0,
        0
      )
      return nextQuarter

    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000)
  }
}
