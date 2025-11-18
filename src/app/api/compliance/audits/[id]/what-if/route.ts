import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { whatIfAnalysis } from '@/lib/compliance-scoring'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auditId = params.id
    const body = await request.json()
    const { hypotheticalChanges } = body // Map of itemId -> new value

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

    // Convert object to Map
    const changesMap = new Map(Object.entries(hypotheticalChanges))

    // Perform what-if analysis
    const analysis = whatIfAnalysis(sections, responses, changesMap, scoringRules)

    return NextResponse.json({
      success: true,
      analysis,
    })
  } catch (error) {
    console.error('Error performing what-if analysis:', error)
    return NextResponse.json(
      { error: 'Failed to perform analysis' },
      { status: 500 }
    )
  }
}
