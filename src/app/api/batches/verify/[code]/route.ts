import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import crypto from 'crypto'

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const verificationCode = params.code

    // Find batch by verification code (stored in qrCodeUrl)
    const batches = await prisma.batchLog.findMany({
      where: {
        qrCodeUrl: {
          contains: verificationCode,
        },
        qrCodeGenerated: true,
      },
      include: {
        mill: {
          select: {
            name: true,
            code: true,
            country: true,
            region: true,
            certificationStatus: true,
            certificationDate: true,
          },
        },
        qcTests: {
          select: {
            testType: true,
            status: true,
            result: true,
            unit: true,
            target: true,
          },
        },
        traceabilityRecords: {
          orderBy: { eventTime: 'desc' },
          take: 10,
        },
      },
    })

    if (batches.length === 0) {
      return NextResponse.json(
        {
          verified: false,
          status: 'NOT_FOUND',
          message: 'Batch not found or verification code invalid',
        },
        { status: 404 }
      )
    }

    const batch = batches[0]

    // Verify cryptographic signature
    const dataToSign = `${batch.batchId}:${batch.millId}:${batch.batchDateTime.toISOString()}`
    const expectedSignature = crypto
      .createHash('sha256')
      .update(dataToSign)
      .digest('hex')
      .substring(0, 16)

    if (!batch.qrCodeUrl?.includes(expectedSignature)) {
      return NextResponse.json(
        {
          verified: false,
          status: 'SUSPICIOUS',
          message: 'Verification failed - possible counterfeit',
        },
        { status: 403 }
      )
    }

    // Record verification scan
    await prisma.traceabilityRecord.create({
      data: {
        batchId: batch.id,
        eventType: 'SCAN',
        eventTime: new Date(),
        description: 'Batch verified via QR code scan',
        verificationStatus: 'VERIFIED',
        deviceInfo: request.headers.get('user-agent') || undefined,
      },
    })

    // Get scan count
    const scanCount = await prisma.traceabilityRecord.count({
      where: {
        batchId: batch.id,
        eventType: 'SCAN',
      },
    })

    // Prepare QC summary
    const qcSummary = batch.qcTests.reduce((acc: any, test) => {
      acc[test.testType] = {
        result: test.result,
        unit: test.unit,
        target: test.target,
        status: test.status,
      }
      return acc
    }, {})

    return NextResponse.json({
      verified: true,
      status: 'VERIFIED',
      batch: {
        batchId: batch.batchId,
        productionDate: batch.batchDateTime.toISOString().split('T')[0],
        cropType: batch.cropType,
        productType: batch.productType,
        grade: batch.grade,
        qcStatus: batch.qcStatus,
      },
      mill: {
        name: batch.mill.name,
        location: `${batch.mill.region}, ${batch.mill.country}`,
        certificationStatus: batch.mill.certificationStatus,
        certificationDate: batch.mill.certificationDate,
      },
      fortification: {
        premixType: batch.premixType,
        premixManufacturer: batch.premixManufacturer,
        targetLevels: batch.targetFortification
          ? JSON.parse(batch.targetFortification as string)
          : null,
      },
      qc: {
        status: batch.qcStatus,
        summary: qcSummary,
      },
      traceability: {
        scanCount,
        lastScanned: batch.traceabilityRecords[0]?.eventTime,
        distributionHistory: batch.traceabilityRecords
          .filter((r) => r.eventType !== 'SCAN')
          .map((r) => ({
            event: r.eventType,
            time: r.eventTime,
            description: r.description,
            location: r.eventLocation,
          })),
      },
      verificationTime: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error verifying batch:', error)
    return NextResponse.json(
      { error: 'Failed to verify batch' },
      { status: 500 }
    )
  }
}
