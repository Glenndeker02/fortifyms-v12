import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { generateBatchId, calculatePremixVariance, calculateYield } from '@/lib/batch-utils'

const batchSchema = z.object({
  millId: z.string(),
  operatorId: z.string(),
  productionLine: z.string(),
  shift: z.string().optional(),
  batchDateTime: z.string().optional(),

  // Crop & Product
  cropType: z.string(),
  productType: z.string(),
  grade: z.string().optional(),
  rawMaterialLot: z.string().optional(),
  rawMaterialSource: z.string().optional(),

  // Production Volume
  inputWeight: z.number(),
  expectedOutputWeight: z.number().optional(),
  outputWeight: z.number().optional(),

  // Fortification Parameters
  premixType: z.string().optional(),
  premixBatchNumber: z.string().optional(),
  premixManufacturer: z.string().optional(),
  premixExpiryDate: z.string().optional(),
  targetFortification: z.string().optional(), // JSON
  dosingRate: z.number().optional(),
  expectedPremix: z.number().optional(),
  actualPremixUsed: z.number().optional(),
  varianceExplanation: z.string().optional(),

  // Equipment Settings
  doserId: z.string().optional(),
  doserSettings: z.string().optional(), // JSON
  mixerId: z.string().optional(),
  mixingTime: z.number().optional(),
  mixerSpeed: z.number().optional(),

  // Process Parameters
  processParameters: z.string().optional(), // JSON

  // Storage
  storageLocation: z.string().optional(),
  packagingDate: z.string().optional(),
  packagingType: z.string().optional(),
  numberOfUnits: z.number().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = batchSchema.parse(body)

    // Get mill code for batch ID generation
    const mill = await prisma.mill.findUnique({
      where: { id: data.millId },
      select: { code: true },
    })

    if (!mill) {
      return NextResponse.json({ error: 'Mill not found' }, { status: 404 })
    }

    const batchDateTime = data.batchDateTime ? new Date(data.batchDateTime) : new Date()

    // Generate unique batch ID
    const batchId = await generateBatchId(
      mill.code,
      data.productionLine,
      batchDateTime,
      prisma
    )

    // Calculate premix variance if applicable
    let variance = null
    if (data.dosingRate && data.inputWeight && data.actualPremixUsed) {
      const varianceCalc = calculatePremixVariance(
        data.inputWeight,
        data.dosingRate,
        data.actualPremixUsed
      )
      variance = varianceCalc.variancePercent
    }

    // Calculate yield if output weight provided
    let yieldPercentage = null
    if (data.outputWeight) {
      yieldPercentage = calculateYield(data.inputWeight, data.outputWeight)
    }

    // Create batch
    const batch = await prisma.batchLog.create({
      data: {
        millId: data.millId,
        operatorId: data.operatorId,
        batchId,
        productionLine: data.productionLine,
        shift: data.shift,
        batchDateTime,

        cropType: data.cropType,
        productType: data.productType,
        grade: data.grade,
        rawMaterialLot: data.rawMaterialLot,
        rawMaterialSource: data.rawMaterialSource,

        inputWeight: data.inputWeight,
        expectedOutputWeight: data.expectedOutputWeight,
        outputWeight: data.outputWeight,
        yieldPercentage,

        premixType: data.premixType,
        premixBatchNumber: data.premixBatchNumber,
        premixManufacturer: data.premixManufacturer,
        premixExpiryDate: data.premixExpiryDate ? new Date(data.premixExpiryDate) : null,
        targetFortification: data.targetFortification,
        dosingRate: data.dosingRate,
        expectedPremix: data.expectedPremix,
        actualPremixUsed: data.actualPremixUsed,
        variance,
        varianceExplanation: data.varianceExplanation,

        doserId: data.doserId,
        doserSettings: data.doserSettings,
        mixerId: data.mixerId,
        mixingTime: data.mixingTime,
        mixerSpeed: data.mixerSpeed,

        processParameters: data.processParameters,

        storageLocation: data.storageLocation,
        packagingDate: data.packagingDate ? new Date(data.packagingDate) : null,
        packagingType: data.packagingType,
        numberOfUnits: data.numberOfUnits,

        status: 'IN_PROGRESS',
      },
      include: {
        operator: {
          select: {
            name: true,
            email: true,
          },
        },
        mill: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    })

    // Check for critical variances and create alerts
    if (variance && Math.abs(variance) > 10) {
      await prisma.alert.create({
        data: {
          type: 'PREMIX_USAGE_ANOMALY',
          category: 'PRODUCTION',
          severity: Math.abs(variance) > 20 ? 'CRITICAL' : 'HIGH',
          title: 'Premix Usage Variance Alert',
          message: `Batch ${batchId} has ${variance.toFixed(1)}% premix variance. ${variance < 0 ? 'Under-dosing detected' : 'Over-dosing detected'}.`,
          sourceType: 'BATCH_LOG',
          sourceId: batch.id,
          millId: data.millId,
          metadata: JSON.stringify({
            batchId,
            variance,
            expectedPremix: data.expectedPremix,
            actualPremix: data.actualPremixUsed,
          }),
        },
      })
    }

    return NextResponse.json({
      success: true,
      batch,
      batchId,
      variance: variance ? variance.toFixed(2) : null,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating batch:', error)
    return NextResponse.json(
      { error: 'Failed to create batch' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const millId = searchParams.get('millId')
    const status = searchParams.get('status')
    const cropType = searchParams.get('cropType')
    const limit = searchParams.get('limit') || '50'
    const offset = searchParams.get('offset') || '0'

    const where: any = {}
    if (millId) where.millId = millId
    if (status) where.status = status
    if (cropType) where.cropType = cropType

    const batches = await prisma.batchLog.findMany({
      where,
      include: {
        operator: {
          select: {
            name: true,
            email: true,
          },
        },
        mill: {
          select: {
            name: true,
            code: true,
          },
        },
        qcSamples: {
          select: {
            id: true,
            collectionPoint: true,
            collectionTime: true,
          },
        },
        qcTests: {
          select: {
            id: true,
            testType: true,
            status: true,
            result: true,
          },
        },
      },
      orderBy: { batchDateTime: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    })

    const total = await prisma.batchLog.count({ where })

    return NextResponse.json({
      batches,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    })
  } catch (error) {
    console.error('Error fetching batches:', error)
    return NextResponse.json(
      { error: 'Failed to fetch batches' },
      { status: 500 }
    )
  }
}
