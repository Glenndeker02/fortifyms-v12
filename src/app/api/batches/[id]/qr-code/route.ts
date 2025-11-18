import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateQRCodeData } from '@/lib/batch-utils'
import crypto from 'crypto'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const batch = await prisma.batchLog.findUnique({
      where: { id: params.id },
      include: {
        mill: {
          select: {
            name: true,
            code: true,
            certificationStatus: true,
          },
        },
        qcTests: {
          select: {
            testType: true,
            status: true,
            result: true,
            unit: true,
          },
        },
      },
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    // Only generate QR code for passed batches
    if (batch.qcStatus !== 'PASS' && batch.qcStatus !== 'EXCELLENT') {
      return NextResponse.json(
        { error: 'QR code can only be generated for batches that passed QC' },
        { status: 400 }
      )
    }

    // Generate cryptographic signature
    const dataToSign = `${batch.batchId}:${batch.millId}:${batch.batchDateTime.toISOString()}`
    const signature = crypto
      .createHash('sha256')
      .update(dataToSign)
      .digest('hex')
      .substring(0, 16)

    // Generate QR code data
    const qrData = {
      batchId: batch.batchId,
      millName: batch.mill.name,
      millCode: batch.mill.code,
      cropType: batch.cropType,
      productType: batch.productType,
      productionDate: batch.batchDateTime.toISOString().split('T')[0],
      qcStatus: batch.qcStatus,
      certificationStatus: batch.mill.certificationStatus,
      verificationCode: signature,
      verificationUrl: `/api/batches/verify/${signature}`,
    }

    // Update batch with QR code info
    await prisma.batchLog.update({
      where: { id: params.id },
      data: {
        qrCodeUrl: `/qr/${signature}`,
        qrCodeGenerated: true,
      },
    })

    // Create traceability record
    await prisma.traceabilityRecord.create({
      data: {
        batchId: params.id,
        eventType: 'QC_RELEASE',
        eventTime: new Date(),
        description: 'QR code generated and batch released for distribution',
        qrCodeData: JSON.stringify(qrData),
        verificationStatus: 'VERIFIED',
      },
    })

    return NextResponse.json({
      success: true,
      qrData,
      qrCodeUrl: `/qr/${signature}`,
      verificationCode: signature,
    })
  } catch (error) {
    console.error('Error generating QR code:', error)
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const batch = await prisma.batchLog.findUnique({
      where: { id: params.id },
      select: {
        qrCodeUrl: true,
        qrCodeGenerated: true,
        batchId: true,
      },
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    if (!batch.qrCodeGenerated) {
      return NextResponse.json(
        { error: 'QR code not generated for this batch' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      qrCodeUrl: batch.qrCodeUrl,
      batchId: batch.batchId,
    })
  } catch (error) {
    console.error('Error fetching QR code:', error)
    return NextResponse.json(
      { error: 'Failed to fetch QR code' },
      { status: 500 }
    )
  }
}
