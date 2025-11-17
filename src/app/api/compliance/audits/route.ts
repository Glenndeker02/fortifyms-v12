import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const millId = searchParams.get('millId');
    const auditType = searchParams.get('auditType');

    // Build filter conditions based on user role
    const where: any = {};

    if (session.user.role === 'MILL_OPERATOR' || session.user.role === 'MILL_MANAGER') {
      // Mill users can only see their own audits
      where.millId = session.user.profile?.mill?.id || millId;
    } else if (millId) {
      where.millId = millId;
    }

    if (status) {
      where.status = status;
    }
    if (auditType) {
      where.auditType = auditType;
    }

    const audits = await db.complianceAudit.findMany({
      where,
      include: {
        mill: {
          select: {
            id: true,
            name: true,
            code: true,
            country: true,
            region: true
          }
        },
        template: {
          select: {
            id: true,
            name: true,
            version: true,
            commodity: true,
            certificationType: true
          }
        },
        auditor: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        submitter: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            annotations: true
          }
        }
      },
      orderBy: [
        { auditDate: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json(audits);
  } catch (error) {
    console.error('Error fetching compliance audits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audits' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      templateId,
      auditType,
      auditDate,
      batchPeriod,
      notes
    } = await request.json();

    // Get user's mill
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        profile: {
          include: {
            mill: true
          }
        }
      }
    });

    if (!user?.profile?.mill) {
      return NextResponse.json(
        { error: 'User is not associated with a mill' },
        { status: 400 }
      );
    }

    // Verify template exists and is applicable
    const template = await db.complianceTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Create new audit
    const audit = await db.complianceAudit.create({
      data: {
        millId: user.profile.mill.id,
        templateId,
        auditorId: session.user.id,
        auditType,
        auditDate: new Date(auditDate),
        batchPeriod,
        notes,
        submittedBy: session.user.id,
        responses: JSON.stringify({}),
        status: 'IN_PROGRESS'
      },
      include: {
        mill: true,
        template: true,
        auditor: true
      }
    });

    return NextResponse.json(audit);
  } catch (error) {
    console.error('Error creating compliance audit:', error);
    return NextResponse.json(
      { error: 'Failed to create audit' },
      { status: 500 }
    );
  }
}