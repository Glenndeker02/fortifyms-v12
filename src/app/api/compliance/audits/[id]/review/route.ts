import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const reviewSchema = z.object({
  action: z.enum(['APPROVE', 'APPROVE_WITH_CONDITIONS', 'REQUEST_REVISION', 'REJECT']),
  comments: z.string(),
  conditions: z.array(z.string()).optional(),
  revisionsRequired: z.array(z.object({
    itemId: z.string(),
    comment: z.string(),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  })).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auditId = params.id
    const body = await request.json()
    const { action, comments, conditions, revisionsRequired } = reviewSchema.parse(body)

    // Get reviewer from session (simplified - should use actual auth)
    const reviewerId = body.reviewerId

    // Fetch audit
    const audit = await prisma.complianceAudit.findUnique({
      where: { id: auditId },
      include: {
        mill: true,
        submitter: true,
      },
    })

    if (!audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
    }

    // Update audit status based on action
    const statusMap = {
      APPROVE: 'APPROVED',
      APPROVE_WITH_CONDITIONS: 'APPROVED',
      REQUEST_REVISION: 'REVISION_REQUESTED',
      REJECT: 'REJECTED',
    }

    const updatedAudit = await prisma.complianceAudit.update({
      where: { id: auditId },
      data: {
        status: statusMap[action],
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewComments: comments,
        reviewConditions: conditions ? JSON.stringify(conditions) : null,
        revisionRequests: revisionsRequired ? JSON.stringify(revisionsRequired) : null,
      },
      include: {
        mill: true,
        reviewer: true,
      },
    })

    // If approved, generate certificate
    if (action === 'APPROVE' && audit.score && audit.score >= 75) {
      const expiryDate = new Date()
      expiryDate.setFullYear(expiryDate.getFullYear() + 1) // 1 year validity

      await prisma.complianceReport.create({
        data: {
          auditId: audit.id,
          reportType: 'CERTIFICATION',
          generatedBy: reviewerId,
          certificateNumber: `CERT-${audit.mill.code}-${Date.now()}`,
          validFrom: new Date(),
          validUntil: expiryDate,
          status: 'ACTIVE',
        },
      })
    }

    // TODO: Send notification to mill
    // TODO: Create audit log entry

    return NextResponse.json({
      success: true,
      audit: updatedAudit,
      message: `Audit ${action.toLowerCase().replace('_', ' ')} successfully`,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error reviewing audit:', error)
    return NextResponse.json({ error: 'Failed to review audit' }, { status: 500 })
  }
}
