// Compliance scoring utilities

export interface ChecklistItem {
  id: string
  question: string
  responseType: 'YES_NO' | 'NUMERIC' | 'TEXT' | 'DROPDOWN' | 'MULTIPLE_CHOICE'
  criticality: 'CRITICAL' | 'MAJOR' | 'MINOR'
  weight: number
  targetValue?: number
  targetRange?: { min: number; max: number }
  unit?: string
}

export interface Section {
  id: string
  name: string
  items: ChecklistItem[]
  minimumThreshold?: number // Percentage threshold for this section
}

export interface AuditResponse {
  itemId: string
  value: any
  evidence?: string[]
  notes?: string
}

export interface ScoringRules {
  criticalWeight: number // e.g., 10 points
  majorWeight: number // e.g., 5 points
  minorWeight: number // e.g., 2 points
  passingThreshold: number // e.g., 75%
  autoFailOnCritical: boolean
  excellentThreshold: number // e.g., 90%
  goodThreshold: number // e.g., 75%
  needsImprovementThreshold: number // e.g., 60%
}

export interface ScoringResult {
  overallScore: number
  overallPercentage: number
  category: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'NON_COMPLIANT'
  sectionScores: SectionScore[]
  redFlags: RedFlag[]
  totalPoints: number
  achievedPoints: number
  criticalFailures: number
  majorIssues: number
  minorIssues: number
}

export interface SectionScore {
  sectionId: string
  sectionName: string
  score: number
  percentage: number
  totalPoints: number
  achievedPoints: number
  itemCount: number
  compliantItems: number
  passed: boolean
}

export interface RedFlag {
  itemId: string
  sectionId: string
  question: string
  criticality: 'CRITICAL' | 'MAJOR' | 'MINOR'
  issue: string
  recommendation: string
  priority: number
}

export function calculateItemScore(
  item: ChecklistItem,
  response: AuditResponse,
  rules: ScoringRules
): { points: number; maxPoints: number; compliant: boolean } {
  const weightMap = {
    CRITICAL: rules.criticalWeight,
    MAJOR: rules.majorWeight,
    MINOR: rules.minorWeight,
  }

  const maxPoints = item.weight || weightMap[item.criticality]
  let points = 0
  let compliant = false

  switch (item.responseType) {
    case 'YES_NO':
      if (response.value === true || response.value === 'YES') {
        points = maxPoints
        compliant = true
      }
      break

    case 'NUMERIC':
      if (item.targetRange) {
        const val = parseFloat(response.value)
        const { min, max } = item.targetRange
        const target = item.targetValue || (min + max) / 2
        const tolerance = (max - min) / 2

        // Full points if within ±10% of target
        const optimalMin = target - tolerance * 0.1
        const optimalMax = target + tolerance * 0.1

        if (val >= optimalMin && val <= optimalMax) {
          points = maxPoints
          compliant = true
        }
        // 50% points if within ±20% of target
        else if (val >= min && val <= max) {
          points = maxPoints * 0.5
          compliant = false
        }
        // 0 points if outside acceptable range
        else {
          points = 0
          compliant = false
        }
      }
      break

    case 'DROPDOWN':
    case 'MULTIPLE_CHOICE':
      // Assume correct answer stored in item.targetValue
      if (response.value === item.targetValue) {
        points = maxPoints
        compliant = true
      }
      break

    case 'TEXT':
      // Text responses are evaluated manually, default to compliant if provided
      if (response.value && response.value.trim().length > 0) {
        points = maxPoints
        compliant = true
      }
      break
  }

  return { points, maxPoints, compliant }
}

export function calculateSectionScore(
  section: Section,
  responses: AuditResponse[],
  rules: ScoringRules
): SectionScore {
  let totalPoints = 0
  let achievedPoints = 0
  let compliantItems = 0

  section.items.forEach((item) => {
    const response = responses.find((r) => r.itemId === item.id)
    if (response) {
      const { points, maxPoints, compliant } = calculateItemScore(item, response, rules)
      totalPoints += maxPoints
      achievedPoints += points
      if (compliant) compliantItems++
    } else {
      // No response = 0 points
      const weightMap = {
        CRITICAL: rules.criticalWeight,
        MAJOR: rules.majorWeight,
        MINOR: rules.minorWeight,
      }
      totalPoints += item.weight || weightMap[item.criticality]
    }
  })

  const percentage = totalPoints > 0 ? (achievedPoints / totalPoints) * 100 : 0
  const passed = section.minimumThreshold
    ? percentage >= section.minimumThreshold
    : true

  return {
    sectionId: section.id,
    sectionName: section.name,
    score: achievedPoints,
    percentage,
    totalPoints,
    achievedPoints,
    itemCount: section.items.length,
    compliantItems,
    passed,
  }
}

export function detectRedFlags(
  sections: Section[],
  responses: AuditResponse[],
  rules: ScoringRules
): RedFlag[] {
  const redFlags: RedFlag[] = []

  sections.forEach((section) => {
    section.items.forEach((item) => {
      const response = responses.find((r) => r.itemId === item.id)
      if (!response) return

      const { compliant } = calculateItemScore(item, response, rules)

      if (!compliant) {
        const priority = item.criticality === 'CRITICAL' ? 1 : item.criticality === 'MAJOR' ? 2 : 3

        redFlags.push({
          itemId: item.id,
          sectionId: section.id,
          question: item.question,
          criticality: item.criticality,
          issue: getIssueDescription(item, response),
          recommendation: getRecommendation(item, response),
          priority,
        })
      }
    })
  })

  return redFlags.sort((a, b) => a.priority - b.priority)
}

function getIssueDescription(item: ChecklistItem, response: AuditResponse): string {
  switch (item.responseType) {
    case 'YES_NO':
      return `Failed compliance check: ${item.question}`
    case 'NUMERIC':
      return `Value ${response.value} ${item.unit || ''} is outside acceptable range`
    default:
      return `Non-compliant response for: ${item.question}`
  }
}

function getRecommendation(item: ChecklistItem, response: AuditResponse): string {
  // Rule-based recommendations
  const questionLower = item.question.toLowerCase()

  if (questionLower.includes('doser') && questionLower.includes('calibration')) {
    return 'Re-calibrate doser within 7 days and upload new calibration certificate'
  }
  if (questionLower.includes('premix') && questionLower.includes('storage')) {
    return 'Install temperature monitoring and ventilation system. Verify storage conditions daily.'
  }
  if (questionLower.includes('qc') || questionLower.includes('quality control')) {
    return 'Implement daily QC log and maintain for minimum 12 months'
  }
  if (questionLower.includes('record') || questionLower.includes('documentation')) {
    return 'Establish documentation procedures and train staff on record keeping requirements'
  }

  return `Review and address non-compliance for: ${item.question}`
}

export function calculateOverallScore(
  sections: Section[],
  responses: AuditResponse[],
  rules: ScoringRules
): ScoringResult {
  const sectionScores = sections.map((section) =>
    calculateSectionScore(section, responses, rules)
  )

  const totalPoints = sectionScores.reduce((sum, s) => sum + s.totalPoints, 0)
  const achievedPoints = sectionScores.reduce((sum, s) => sum + s.achievedPoints, 0)
  const overallPercentage = totalPoints > 0 ? (achievedPoints / totalPoints) * 100 : 0

  // Count critical, major, minor issues
  const redFlags = detectRedFlags(sections, responses, rules)
  const criticalFailures = redFlags.filter((f) => f.criticality === 'CRITICAL').length
  const majorIssues = redFlags.filter((f) => f.criticality === 'MAJOR').length
  const minorIssues = redFlags.filter((f) => f.criticality === 'MINOR').length

  // Determine category
  let category: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'NON_COMPLIANT'
  if (rules.autoFailOnCritical && criticalFailures > 0) {
    category = 'NON_COMPLIANT'
  } else if (overallPercentage >= rules.excellentThreshold) {
    category = 'EXCELLENT'
  } else if (overallPercentage >= rules.goodThreshold) {
    category = 'GOOD'
  } else if (overallPercentage >= rules.needsImprovementThreshold) {
    category = 'NEEDS_IMPROVEMENT'
  } else {
    category = 'NON_COMPLIANT'
  }

  return {
    overallScore: achievedPoints,
    overallPercentage,
    category,
    sectionScores,
    redFlags,
    totalPoints,
    achievedPoints,
    criticalFailures,
    majorIssues,
    minorIssues,
  }
}

// What-if analysis: recalculate score with hypothetical changes
export function whatIfAnalysis(
  sections: Section[],
  currentResponses: AuditResponse[],
  hypotheticalChanges: Map<string, any>, // itemId -> new value
  rules: ScoringRules
): {
  currentScore: ScoringResult
  projectedScore: ScoringResult
  improvement: number
  itemsToFix: string[]
} {
  const currentScore = calculateOverallScore(sections, currentResponses, rules)

  // Apply hypothetical changes
  const modifiedResponses = currentResponses.map((response) => {
    if (hypotheticalChanges.has(response.itemId)) {
      return { ...response, value: hypotheticalChanges.get(response.itemId) }
    }
    return response
  })

  const projectedScore = calculateOverallScore(sections, modifiedResponses, rules)
  const improvement = projectedScore.overallPercentage - currentScore.overallPercentage

  return {
    currentScore,
    projectedScore,
    improvement,
    itemsToFix: Array.from(hypotheticalChanges.keys()),
  }
}
