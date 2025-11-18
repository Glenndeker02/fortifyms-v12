import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { validateQCTest, determineBatchQCStatus } from '@/lib/batch-utils'

const testSchema = z.object({
  sampleId: z.string().optional(),
  testerId: z.string(),
  testType: z.string(),
  testMethod: z.string().optional(),
  testLocation: z.string().optional(),
  testDate: z.string().optional(),
  result: z.number(),
  unit: z.string(),
  target: z.number(),
  tolerance: z.number().default(10),
  labCertificate: z.string().optional(),
  labReportUrl: z.string().optional(),
  notes: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const data = testSchema.parse(body)

    // Verify batch exists
    const batch = await prisma.batchLog.findUnique({
      where: { id: params.id },
      include: {
        mill: true,
      },
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    // Validate test result
    const validation = validateQCTest(data.result, data.target, data.tolerance)

    // Calculate deviation
    const deviation = data.result - data.target

    // Create test record
    const test = await prisma.qcTest.create({
      data: {
        batchId: params.id,
        sampleId: data.sampleId,
        testerId: data.testerId,
        testType: data.testType,
        testMethod: data.testMethod,
        testLocation: data.testLocation,
        testDate: data.testDate ? new Date(data.testDate) : new Date(),
        result: data.result,
        unit: data.unit,
        target: data.target,
        tolerance: data.tolerance,
        deviation,
        status: validation.status,
        labCertificate: data.labCertificate,
        labReportUrl: data.labReportUrl,
        notes: data.notes,
      },
      include: {
        tester: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    // Get all tests for this batch to determine overall status
    const allTests = await prisma.qcTest.findMany({
      where: { batchId: params.id },
      select: {
        testType: true,
        status: true,
        result: true,
        target: true,
      },
    })

    const batchStatus = determineBatchQCStatus(allTests)

    // Update batch QC status
    await prisma.batchLog.update({
      where: { id: params.id },
      data: {
        qcStatus: batchStatus.status,
        status:
          batchStatus.status === 'FAIL'
            ? 'QUARANTINED'
            : batchStatus.status === 'PASS'
            ? 'PASSED'
            : 'QC_PENDING',
      },
    })

    // Create alert for failed or critical tests
    if (validation.status === 'FAIL' || batchStatus.status === 'FAIL') {
      await prisma.alert.create({
        data: {
          type: 'QC_FAILURE',
          category: 'QUALITY_SAFETY',
          severity: 'CRITICAL',
          title: `QC Test Failed: ${data.testType}`,
          message: `Batch ${batch.batchId} FAILED ${data.testType} test. Result: ${data.result} ${data.unit} (Target: ${data.target} ${data.unit}). Batch automatically quarantined.`,
          sourceType: 'QC_TEST',
          sourceId: test.id,
          targetId: batch.id,
          millId: batch.millId,
          deadline: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
          metadata: JSON.stringify({
            batchId: batch.batchId,
            testType: data.testType,
            result: data.result,
            target: data.target,
            deviation: validation.deviationPercent,
            criticalFailures: batchStatus.criticalFailures,
          }),
        },
      })

      // Create notifications for critical personnel
      const notificationUsers = await prisma.user.findMany({
        where: {
          millId: batch.millId,
          role: { in: ['MILL_MANAGER', 'FWGA_INSPECTOR'] },
        },
        select: { id: true },
      })

      const alert = await prisma.alert.findFirst({
        where: { sourceId: test.id },
        orderBy: { createdAt: 'desc' },
      })

      if (alert) {
        for (const user of notificationUsers) {
          await prisma.alertNotification.create({
            data: {
              alertId: alert.id,
              userId: user.id,
              channel: 'EMAIL',
              status: 'PENDING',
            },
          })
        }
      }
    }

    return NextResponse.json({
      test,
      validation,
      batchStatus,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating test:', error)
    return NextResponse.json(
      { error: 'Failed to create test' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tests = await prisma.qcTest.findMany({
      where: { batchId: params.id },
      include: {
        tester: {
          select: {
            name: true,
            email: true,
          },
        },
        sample: {
          select: {
            sampleId: true,
            collectionPoint: true,
            collectionTime: true,
          },
        },
      },
      orderBy: { testDate: 'desc' },
    })

    // Calculate summary
    const summary = determineBatchQCStatus(
      tests.map((t) => ({
        testType: t.testType,
        status: t.status,
        result: t.result || 0,
        target: t.target || 0,
      }))
    )

    return NextResponse.json({
      tests,
      summary,
    })
  } catch (error) {
    console.error('Error fetching tests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tests' },
      { status: 500 }
    )
  }
}
