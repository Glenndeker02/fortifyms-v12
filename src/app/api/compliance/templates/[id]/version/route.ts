import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = params.id
    const body = await request.json()
    const { changes, reason } = body

    // Fetch current template
    const currentTemplate = await prisma.complianceTemplate.findUnique({
      where: { id: templateId },
    })

    if (!currentTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Deactivate current version
    await prisma.complianceTemplate.update({
      where: { id: templateId },
      data: { isActive: false },
    })

    // Create new version
    const newVersion = (parseFloat(currentTemplate.version) + 0.1).toFixed(1)

    const newTemplate = await prisma.complianceTemplate.create({
      data: {
        name: currentTemplate.name,
        version: newVersion,
        commodity: currentTemplate.commodity,
        country: currentTemplate.country,
        region: currentTemplate.region,
        standardReference: currentTemplate.standardReference,
        certificationType: currentTemplate.certificationType,
        sections: changes.sections || currentTemplate.sections,
        scoringRules: changes.scoringRules || currentTemplate.scoringRules,
        createdBy: body.createdBy,
        isActive: true,
      },
    })

    // TODO: Notify mills using this template
    // const affectedAudits = await prisma.complianceAudit.findMany({
    //   where: {
    //     templateId,
    //     status: { in: ['IN_PROGRESS', 'PENDING'] },
    //   },
    //   include: { mill: true },
    // })

    return NextResponse.json({
      success: true,
      newTemplate,
      message: `Template updated to version ${newVersion}`,
    })
  } catch (error) {
    console.error('Error creating template version:', error)
    return NextResponse.json(
      { error: 'Failed to create new version' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = params.id

    // Get current template
    const current = await prisma.complianceTemplate.findUnique({
      where: { id: templateId },
    })

    if (!current) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Get all versions
    const versions = await prisma.complianceTemplate.findMany({
      where: {
        name: current.name,
        commodity: current.commodity,
        country: current.country,
      },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { audits: true },
        },
      },
    })

    return NextResponse.json({
      current: current.version,
      versions,
    })
  } catch (error) {
    console.error('Error fetching template versions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch versions' },
      { status: 500 }
    )
  }
}
