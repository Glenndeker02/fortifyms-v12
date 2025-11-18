import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { prisma } from '@/lib/db'
import { ComplianceReportPDF } from '@/components/compliance/ComplianceReportPDF'
import { calculateOverallScore } from '@/lib/compliance-scoring'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auditId = params.id

    // Fetch complete audit data
    const audit = await prisma.complianceAudit.findUnique({
      where: { id: auditId },
      include: {
        mill: true,
        template: true,
        auditor: {
          select: { name: true, email: true },
        },
        reviewer: {
          select: { name: true, email: true },
        },
      },
    })

    if (!audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
    }

    // Calculate scoring if not already done
    const sections = JSON.parse(audit.template.sections)
    const responses = JSON.parse(audit.responses || '[]')
    const scoringRules = JSON.parse(audit.template.scoringRules)
    const scoringResult = calculateOverallScore(sections, responses, scoringRules)

    // Generate PDF
    const pdfStream = await renderToBuffer(
      ComplianceReportPDF({
        audit,
        mill: audit.mill,
        template: audit.template,
        scoringResult,
        auditor: audit.auditor,
        reviewer: audit.reviewer,
      })
    )

    // Return PDF
    return new NextResponse(pdfStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="compliance-report-${audit.mill.code}-${new Date(audit.auditDate).toISOString().split('T')[0]}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating compliance report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}
