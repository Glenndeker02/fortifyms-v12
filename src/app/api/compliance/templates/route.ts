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
    const commodity = searchParams.get('commodity');
    const country = searchParams.get('country');
    const isActive = searchParams.get('isActive');

    // Build filter conditions
    const where: any = {};

    if (commodity) {
      where.commodity = commodity;
    }
    if (country) {
      where.country = country;
    }
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const templates = await db.complianceTemplate.findMany({
      where,
      include: {
        audits: {
          select: {
            id: true,
            status: true,
            score: true,
            auditDate: true
          }
        }
      },
      orderBy: [
        { commodity: 'asc' },
        { country: 'asc' },
        { version: 'desc' }
      ]
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching compliance templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['FWGA_INSPECTOR', 'SYSTEM_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      name,
      commodity,
      country,
      region,
      standardReference,
      certificationType,
      sections,
      scoringRules
    } = await request.json();

    // Generate version number
    const existingTemplates = await db.complianceTemplate.findMany({
      where: {
        name,
        commodity,
        country
      },
      orderBy: { version: 'desc' }
    });

    const nextVersion = existingTemplates.length > 0 
      ? (parseFloat(existingTemplates[0].version) + 0.1).toFixed(1)
      : '1.0';

    const template = await db.complianceTemplate.create({
      data: {
        name,
        version: nextVersion,
        commodity,
        country,
        region,
        standardReference,
        certificationType,
        sections: JSON.stringify(sections),
        scoringRules: JSON.stringify(scoringRules),
        createdBy: session.user.id
      }
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error creating compliance template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}