// Maintenance utility functions

export function calculateNextDueDate(
  lastPerformedDate: Date,
  frequency: string,
  frequencyValue: number
): Date {
  const nextDue = new Date(lastPerformedDate)

  switch (frequency) {
    case 'DAILY':
      nextDue.setDate(nextDue.getDate() + frequencyValue)
      break
    case 'WEEKLY':
      nextDue.setDate(nextDue.getDate() + frequencyValue * 7)
      break
    case 'MONTHLY':
      nextDue.setMonth(nextDue.getMonth() + frequencyValue)
      break
    case 'QUARTERLY':
      nextDue.setMonth(nextDue.getMonth() + frequencyValue * 3)
      break
    case 'YEARLY':
      nextDue.setFullYear(nextDue.getFullYear() + frequencyValue)
      break
    default:
      nextDue.setDate(nextDue.getDate() + 30) // Default to 30 days
  }

  return nextDue
}

export function getDaysUntilDue(dueDate: Date): number {
  const today = new Date()
  const timeDiff = dueDate.getTime() - today.getTime()
  return Math.ceil(timeDiff / (1000 * 3600 * 24))
}

export function getMaintenanceStatus(dueDate: Date): {
  status: 'OVERDUE' | 'DUE_SOON' | 'DUE_UPCOMING' | 'OK'
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  daysRemaining: number
} {
  const daysRemaining = getDaysUntilDue(dueDate)

  if (daysRemaining < 0) {
    return { status: 'OVERDUE', severity: 'CRITICAL', daysRemaining }
  } else if (daysRemaining <= 7) {
    return { status: 'DUE_SOON', severity: 'HIGH', daysRemaining }
  } else if (daysRemaining <= 14) {
    return { status: 'DUE_UPCOMING', severity: 'MEDIUM', daysRemaining }
  } else {
    return { status: 'OK', severity: 'LOW', daysRemaining }
  }
}

export function shouldSendReminder(
  dueDate: Date,
  remindersSent: number[]
): { shouldSend: boolean; reminderDay: number } {
  const daysRemaining = getDaysUntilDue(dueDate)
  const reminderDays = [30, 14, 7, 0] // Days before due to send reminders

  for (const day of reminderDays) {
    if (daysRemaining === day && !remindersSent.includes(day)) {
      return { shouldSend: true, reminderDay: day }
    }
  }

  return { shouldSend: false, reminderDay: 0 }
}

export interface CalibrationMeasurement {
  testPoint: number
  expectedValue: number
  actualValue: number
  unit: string
  tolerance: number // percentage
}

export function validateCalibration(
  measurements: CalibrationMeasurement[]
): {
  isValid: boolean
  overallOffset: number
  failedPoints: number[]
  maxDeviation: number
} {
  let totalOffset = 0
  const failedPoints: number[] = []
  let maxDeviation = 0

  measurements.forEach((measurement, index) => {
    const deviation =
      ((measurement.actualValue - measurement.expectedValue) /
        measurement.expectedValue) *
      100
    const absDeviation = Math.abs(deviation)

    totalOffset += deviation

    if (absDeviation > maxDeviation) {
      maxDeviation = absDeviation
    }

    if (absDeviation > measurement.tolerance) {
      failedPoints.push(index)
    }
  })

  const overallOffset = totalOffset / measurements.length
  const isValid = failedPoints.length === 0 && Math.abs(overallOffset) <= 5

  return {
    isValid,
    overallOffset,
    failedPoints,
    maxDeviation,
  }
}

export function detectDrift(
  historicalData: Array<{ date: Date; value: number }>,
  currentValue: number,
  thresholdPercent: number = 5
): {
  isDrifting: boolean
  driftAmount: number
  trend: 'INCREASING' | 'DECREASING' | 'STABLE'
  recommendation: string
} {
  if (historicalData.length < 3) {
    return {
      isDrifting: false,
      driftAmount: 0,
      trend: 'STABLE',
      recommendation: 'Insufficient historical data for drift analysis',
    }
  }

  // Calculate moving average
  const recentValues = historicalData.slice(-5).map((d) => d.value)
  const average = recentValues.reduce((a, b) => a + b, 0) / recentValues.length

  const driftAmount = ((currentValue - average) / average) * 100

  // Detect trend
  let trend: 'INCREASING' | 'DECREASING' | 'STABLE' = 'STABLE'
  if (recentValues.length >= 3) {
    const firstHalf = recentValues.slice(0, Math.floor(recentValues.length / 2))
    const secondHalf = recentValues.slice(Math.floor(recentValues.length / 2))

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

    if (secondAvg > firstAvg * 1.05) trend = 'INCREASING'
    else if (secondAvg < firstAvg * 0.95) trend = 'DECREASING'
  }

  const isDrifting = Math.abs(driftAmount) > thresholdPercent

  let recommendation = ''
  if (isDrifting) {
    if (trend === 'INCREASING') {
      recommendation =
        'Significant upward drift detected. Schedule calibration immediately to prevent over-dosing.'
    } else if (trend === 'DECREASING') {
      recommendation =
        'Significant downward drift detected. Schedule calibration immediately to prevent under-dosing.'
    } else {
      recommendation = 'Drift detected. Schedule calibration within 24 hours.'
    }
  } else {
    recommendation = 'Equipment operating within normal parameters.'
  }

  return {
    isDrifting,
    driftAmount,
    trend,
    recommendation,
  }
}

export function calculateEquipmentHealth(equipment: {
  lastCalibrationDate?: Date
  alertsCount: number
  tasksOverdueCount: number
  ageInYears: number
  avgCalibrationOffset: number
}): {
  healthScore: number // 0-100
  status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL'
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  recommendations: string[]
} {
  let score = 100
  const recommendations: string[] = []

  // Factor 1: Last calibration (max -30 points)
  if (equipment.lastCalibrationDate) {
    const daysSinceCalibration = getDaysUntilDue(equipment.lastCalibrationDate) * -1
    if (daysSinceCalibration > 90) {
      score -= 30
      recommendations.push('Calibration overdue by more than 90 days')
    } else if (daysSinceCalibration > 60) {
      score -= 20
      recommendations.push('Calibration overdue')
    } else if (daysSinceCalibration > 30) {
      score -= 10
    }
  }

  // Factor 2: Active alerts (max -25 points)
  if (equipment.alertsCount > 5) {
    score -= 25
    recommendations.push('Multiple active alerts - immediate attention required')
  } else if (equipment.alertsCount > 2) {
    score -= 15
    recommendations.push('Several active alerts - schedule maintenance')
  } else if (equipment.alertsCount > 0) {
    score -= 5
  }

  // Factor 3: Overdue tasks (max -20 points)
  if (equipment.tasksOverdueCount > 3) {
    score -= 20
    recommendations.push('Multiple overdue maintenance tasks')
  } else if (equipment.tasksOverdueCount > 0) {
    score -= 10
  }

  // Factor 4: Equipment age (max -15 points)
  if (equipment.ageInYears > 10) {
    score -= 15
    recommendations.push('Equipment aging - consider replacement planning')
  } else if (equipment.ageInYears > 7) {
    score -= 10
    recommendations.push('Equipment approaching end of typical lifespan')
  } else if (equipment.ageInYears > 5) {
    score -= 5
  }

  // Factor 5: Calibration drift (max -10 points)
  if (Math.abs(equipment.avgCalibrationOffset) > 5) {
    score -= 10
    recommendations.push('Significant calibration drift detected')
  } else if (Math.abs(equipment.avgCalibrationOffset) > 3) {
    score -= 5
  }

  // Determine status
  let status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL'
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

  if (score >= 90) {
    status = 'EXCELLENT'
    riskLevel = 'LOW'
  } else if (score >= 75) {
    status = 'GOOD'
    riskLevel = 'LOW'
  } else if (score >= 60) {
    status = 'FAIR'
    riskLevel = 'MEDIUM'
  } else if (score >= 40) {
    status = 'POOR'
    riskLevel = 'HIGH'
  } else {
    status = 'CRITICAL'
    riskLevel = 'CRITICAL'
  }

  return {
    healthScore: Math.max(0, score),
    status,
    riskLevel,
    recommendations,
  }
}
