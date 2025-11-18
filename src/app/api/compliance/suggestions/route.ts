import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface Suggestion {
  id: string
  title: string
  description: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  category: 'QUICK_WIN' | 'CRITICAL' | 'IMPROVEMENT'
  estimatedImpact: number // percentage points
  effort: 'LOW' | 'MEDIUM' | 'HIGH'
  actions: string[]
  relatedItems: string[]
  trainingModules?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { auditId, targetScore } = body

    // Fetch audit
    const audit = await prisma.complianceAudit.findUnique({
      where: { id: auditId },
      include: {
        template: true,
        mill: true,
      },
    })

    if (!audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
    }

    const redFlags = JSON.parse(audit.flaggedIssues || '[]')
    const currentScore = audit.score || 0

    // Generate suggestions
    const suggestions: Suggestion[] = []

    // Quick wins - low effort, moderate impact
    const quickWins = redFlags
      .filter((flag: any) => flag.criticality === 'MINOR')
      .slice(0, 3)
      .map((flag: any, index: number) => ({
        id: `qw-${index}`,
        title: `Quick Fix: ${flag.question}`,
        description: flag.recommendation,
        priority: 'MEDIUM' as const,
        category: 'QUICK_WIN' as const,
        estimatedImpact: 2,
        effort: 'LOW' as const,
        actions: [
          flag.recommendation,
          'Document corrective action',
          'Update audit response',
        ],
        relatedItems: [flag.itemId],
      }))

    suggestions.push(...quickWins)

    // Critical fixes
    const criticalIssues = redFlags
      .filter((flag: any) => flag.criticality === 'CRITICAL')
      .map((flag: any, index: number) => ({
        id: `crit-${index}`,
        title: `Critical Issue: ${flag.question}`,
        description: flag.recommendation,
        priority: 'HIGH' as const,
        category: 'CRITICAL' as const,
        estimatedImpact: 10,
        effort: flag.question.toLowerCase().includes('equipment')
          ? ('HIGH' as const)
          : ('MEDIUM' as const),
        actions: getDetailedActions(flag),
        relatedItems: [flag.itemId],
        trainingModules: getRelatedTraining(flag),
      }))

    suggestions.push(...criticalIssues)

    // Major improvements
    const majorImprovements = redFlags
      .filter((flag: any) => flag.criticality === 'MAJOR')
      .slice(0, 5)
      .map((flag: any, index: number) => ({
        id: `maj-${index}`,
        title: `Major Improvement: ${flag.question}`,
        description: flag.recommendation,
        priority: 'MEDIUM' as const,
        category: 'IMPROVEMENT' as const,
        estimatedImpact: 5,
        effort: 'MEDIUM' as const,
        actions: getDetailedActions(flag),
        relatedItems: [flag.itemId],
        trainingModules: getRelatedTraining(flag),
      }))

    suggestions.push(...majorImprovements)

    // Optimize for target score if provided
    if (targetScore && targetScore > currentScore) {
      const scoreDiff = targetScore - currentScore
      const optimized = optimizeSuggestionsForTarget(suggestions, scoreDiff)

      return NextResponse.json({
        success: true,
        currentScore,
        targetScore,
        scoreDiff,
        suggestions: optimized,
        summary: {
          quickWins: suggestions.filter((s) => s.category === 'QUICK_WIN').length,
          critical: suggestions.filter((s) => s.category === 'CRITICAL').length,
          improvements: suggestions.filter((s) => s.category === 'IMPROVEMENT').length,
        },
      })
    }

    return NextResponse.json({
      success: true,
      suggestions,
      summary: {
        quickWins: suggestions.filter((s) => s.category === 'QUICK_WIN').length,
        critical: suggestions.filter((s) => s.category === 'CRITICAL').length,
        improvements: suggestions.filter((s) => s.category === 'IMPROVEMENT').length,
      },
    })
  } catch (error) {
    console.error('Error generating suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    )
  }
}

function getDetailedActions(flag: any): string[] {
  const questionLower = flag.question.toLowerCase()

  if (questionLower.includes('doser') && questionLower.includes('calibration')) {
    return [
      'Stop production immediately',
      'Perform full doser calibration check',
      'Adjust doser settings as needed',
      'Run verification test (minimum 3 cycles)',
      'Document calibration results',
      'Upload calibration certificate',
      'Resume production only after approval',
    ]
  }

  if (questionLower.includes('premix') && questionLower.includes('storage')) {
    return [
      'Inspect current storage conditions',
      'Install temperature monitoring device',
      'Ensure ventilation system is functional',
      'Transfer premix to appropriate storage if needed',
      'Implement daily temperature logging',
      'Train staff on proper premix handling',
    ]
  }

  if (questionLower.includes('qc') || questionLower.includes('quality control')) {
    return [
      'Review QC procedures and requirements',
      'Implement daily QC sampling schedule',
      'Create QC log templates',
      'Train operators on sampling techniques',
      'Establish sample retention policy',
      'Set up regular QC review meetings',
    ]
  }

  return [
    flag.recommendation,
    'Assign responsibility to specific person',
    'Set completion deadline',
    'Document corrective action',
    'Verify effectiveness',
  ]
}

function getRelatedTraining(flag: any): string[] {
  const questionLower = flag.question.toLowerCase()
  const modules: string[] = []

  if (questionLower.includes('doser') || questionLower.includes('calibration')) {
    modules.push('Volumetric Doser Calibration', 'Advanced Dosing Calibration')
  }

  if (questionLower.includes('premix')) {
    modules.push('Premix Handling and Storage')
  }

  if (questionLower.includes('qc') || questionLower.includes('quality')) {
    modules.push('Quality Control Sampling Techniques')
  }

  if (questionLower.includes('mixing') || questionLower.includes('blend')) {
    modules.push('Mixing Uniformity Verification')
  }

  return modules
}

function optimizeSuggestionsForTarget(
  suggestions: Suggestion[],
  scoreDiff: number
): Suggestion[] {
  // Sort by impact/effort ratio (value for money)
  const effortScore = { LOW: 1, MEDIUM: 2, HIGH: 3 }

  return suggestions
    .map((s) => ({
      ...s,
      valueScore: s.estimatedImpact / effortScore[s.effort],
    }))
    .sort((a, b) => b.valueScore - a.valueScore)
    .map(({ valueScore, ...s }) => s)
}
