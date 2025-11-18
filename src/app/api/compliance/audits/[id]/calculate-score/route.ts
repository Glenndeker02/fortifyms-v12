import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateOverallScore } from '@/lib/compliance-scoring'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auditId = params.id

    // Fetch audit with template
    const audit = await prisma.complianceAudit.findUnique({
      where: { id: auditId },
      include: {
        template: true,
      },
    })

    if (!audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
    }

    // Parse template sections and responses
    const sections = JSON.parse(audit.template.sections)
    const responses = JSON.parse(audit.responses || '[]')
    const scoringRules = JSON.parse(audit.template.scoringRules)

    // Calculate scores
    const scoringResult = calculateOverallScore(sections, responses, scoringRules)

    // Update audit with calculated scores
    await prisma.complianceAudit.update({
      where: { id: auditId },
      data: {
        score: scoringResult.overallPercentage,
        sectionScores: JSON.stringify(scoringResult.sectionScores),
        flaggedIssues: JSON.stringify(scoringResult.redFlags),
      },
    })

    return NextResponse.json({
      success: true,
      scoringResult,
    })
  } catch (error) {
    console.error('Error calculating audit score:', error)
    return NextResponse.json(
      { error: 'Failed to calculate score' },
      { status: 500 }
    )
  }
}
