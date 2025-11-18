// Batch Management Utilities

/**
 * Generate unique batch ID with format: [MillCode]-[Line]-[YYYYMMDD]-[Seq]
 * Example: "KEN001-L1-20251118-0034"
 */
export async function generateBatchId(
  millCode: string,
  productionLine: string,
  date: Date,
  prisma: any
): Promise<string> {
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '')
  const lineCode = productionLine.replace(/\s+/g, '').toUpperCase()

  // Get count of batches for this mill, line, and date
  const count = await prisma.batchLog.count({
    where: {
      mill: { code: millCode },
      productionLine: lineCode,
      batchDateTime: {
        gte: new Date(date.setHours(0, 0, 0, 0)),
        lt: new Date(date.setHours(23, 59, 59, 999)),
      },
    },
  })

  const sequence = (count + 1).toString().padStart(4, '0')
  return `${millCode}-${lineCode}-${dateStr}-${sequence}`
}

/**
 * Calculate expected premix usage
 */
export function calculateExpectedPremix(
  throughputKg: number,
  dosingRatePercent: number
): number {
  return (throughputKg * dosingRatePercent) / 100
}

/**
 * Calculate premix variance
 */
export interface PremixVariance {
  expectedPremix: number
  actualPremix: number
  variance: number
  variancePercent: number
  status: 'OK' | 'WARNING' | 'CRITICAL'
  color: 'green' | 'yellow' | 'red'
}

export function calculatePremixVariance(
  throughputKg: number,
  dosingRatePercent: number,
  actualPremixKg: number
): PremixVariance {
  const expectedPremix = calculateExpectedPremix(throughputKg, dosingRatePercent)
  const variance = actualPremixKg - expectedPremix
  const variancePercent = expectedPremix > 0 ? (variance / expectedPremix) * 100 : 0

  let status: 'OK' | 'WARNING' | 'CRITICAL' = 'OK'
  let color: 'green' | 'yellow' | 'red' = 'green'

  const absVariance = Math.abs(variancePercent)
  if (absVariance > 10) {
    status = 'CRITICAL'
    color = 'red'
  } else if (absVariance > 5) {
    status = 'WARNING'
    color = 'yellow'
  }

  return {
    expectedPremix,
    actualPremix: actualPremixKg,
    variance,
    variancePercent,
    status,
    color,
  }
}

/**
 * Calculate yield percentage
 */
export function calculateYield(inputWeight: number, outputWeight: number): number {
  if (inputWeight === 0) return 0
  return (outputWeight / inputWeight) * 100
}

/**
 * Validate QC test result against target
 */
export interface QCValidation {
  isPass: boolean
  status: 'PASS' | 'MARGINAL' | 'FAIL'
  deviation: number
  deviationPercent: number
}

export function validateQCTest(
  result: number,
  target: number,
  tolerance: number
): QCValidation {
  const deviation = result - target
  const deviationPercent = target > 0 ? (deviation / target) * 100 : 0
  const absDeviationPercent = Math.abs(deviationPercent)

  let isPass = true
  let status: 'PASS' | 'MARGINAL' | 'FAIL' = 'PASS'

  if (result < target * 0.75) {
    // Less than 75% of target
    isPass = false
    status = 'FAIL'
  } else if (result < target * 0.80) {
    // 75-80% of target
    isPass = false
    status = 'MARGINAL'
  } else if (absDeviationPercent > tolerance) {
    // Outside tolerance but above 80%
    status = 'MARGINAL'
  }

  return {
    isPass,
    status,
    deviation,
    deviationPercent,
  }
}

/**
 * Determine overall batch QC status from all tests
 */
export interface BatchQCStatus {
  status: 'PASS' | 'PASS_WITH_NOTES' | 'CONDITIONAL_PASS' | 'FAIL'
  passCount: number
  marginalCount: number
  failCount: number
  criticalFailures: string[]
}

export function determineBatchQCStatus(
  tests: Array<{ testType: string; status: string; result: number; target: number }>
): BatchQCStatus {
  let passCount = 0
  let marginalCount = 0
  let failCount = 0
  const criticalFailures: string[] = []

  for (const test of tests) {
    if (test.status === 'PASS') {
      passCount++
    } else if (test.status === 'MARGINAL') {
      marginalCount++
    } else if (test.status === 'FAIL') {
      failCount++
      criticalFailures.push(
        `${test.testType}: ${test.result} (target: ${test.target})`
      )
    }
  }

  let status: 'PASS' | 'PASS_WITH_NOTES' | 'CONDITIONAL_PASS' | 'FAIL' = 'PASS'

  if (failCount > 0) {
    status = 'FAIL'
  } else if (marginalCount > 2) {
    status = 'CONDITIONAL_PASS'
  } else if (marginalCount > 0) {
    status = 'PASS_WITH_NOTES'
  }

  return {
    status,
    passCount,
    marginalCount,
    failCount,
    criticalFailures,
  }
}

/**
 * Detect anomalies in batch production
 */
export interface BatchAnomaly {
  type: 'PREMIX_DECLINE' | 'PREMIX_SPIKE' | 'YIELD_LOW' | 'YIELD_HIGH' | 'HIGH_VARIANCE'
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  message: string
  recommendation: string
}

export function detectBatchAnomalies(
  currentBatch: {
    premixUsed: number
    expectedPremix: number
    yield: number
  },
  recentBatches: Array<{
    premixUsed: number
    expectedPremix: number
    yield: number
  }>,
  expectedYield: number = 95
): BatchAnomaly[] {
  const anomalies: BatchAnomaly[] = []

  // Premix usage anomaly
  const premixVariance = calculatePremixVariance(
    100, // Normalized
    (currentBatch.expectedPremix / 100) * 100,
    currentBatch.premixUsed
  )

  if (premixVariance.status === 'CRITICAL') {
    if (premixVariance.variancePercent < -10) {
      anomalies.push({
        type: 'PREMIX_DECLINE',
        severity: 'HIGH',
        message: `Premix usage ${Math.abs(premixVariance.variancePercent).toFixed(1)}% below expected`,
        recommendation: 'Check doser calibration and premix flow',
      })
    } else if (premixVariance.variancePercent > 10) {
      anomalies.push({
        type: 'PREMIX_SPIKE',
        severity: 'MEDIUM',
        message: `Premix usage ${premixVariance.variancePercent.toFixed(1)}% above expected`,
        recommendation: 'Check for measurement errors or spillage',
      })
    }
  }

  // Yield anomaly
  if (currentBatch.yield < expectedYield - 5) {
    anomalies.push({
      type: 'YIELD_LOW',
      severity: 'HIGH',
      message: `Yield ${currentBatch.yield.toFixed(1)}% is below expected ${expectedYield}%`,
      recommendation: 'Investigate for spillage, theft, or measurement errors',
    })
  } else if (currentBatch.yield > expectedYield + 5) {
    anomalies.push({
      type: 'YIELD_HIGH',
      severity: 'MEDIUM',
      message: `Yield ${currentBatch.yield.toFixed(1)}% is above expected ${expectedYield}%`,
      recommendation: 'Check measurement accuracy or moisture gain',
    })
  }

  // High variance in recent batches
  if (recentBatches.length >= 5) {
    const premixRates = recentBatches.map(
      (b) => (b.premixUsed / b.expectedPremix) * 100
    )
    const mean = premixRates.reduce((a, b) => a + b, 0) / premixRates.length
    const variance =
      premixRates.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      premixRates.length
    const stdDev = Math.sqrt(variance)

    if (stdDev > 10) {
      anomalies.push({
        type: 'HIGH_VARIANCE',
        severity: 'MEDIUM',
        message: `High variance in premix usage (±${stdDev.toFixed(1)}%)`,
        recommendation: 'Review process controls and operator training',
      })
    }
  }

  return anomalies
}

/**
 * Generate QR code data for batch
 */
export function generateQRCodeData(batch: {
  id: string
  batchId: string
  millId: string
  cropType: string
  productionDate: Date
}): string {
  // In production, this would include cryptographic signature
  const data = {
    batchId: batch.batchId,
    millId: batch.millId,
    cropType: batch.cropType,
    productionDate: batch.productionDate.toISOString(),
    verificationUrl: `/api/batches/verify/${batch.id}`,
  }

  return JSON.stringify(data)
}
