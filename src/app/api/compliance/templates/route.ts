import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
  requireAuth,
} from '@/lib/api-helpers';

/**
 * GET /api/compliance/templates
 * List compliance templates with filtering
 *
 * Query parameters:
 * - commodity: Filter by commodity type
 * - country: Filter by country
 * - isActive: Filter by active status (true/false)
 *
 * Reference: TODO.md Phase 2 - Compliance Module
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

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
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const templates = await db.complianceTemplate.findMany({
      where,
      include: {
        _count: {
          select: {
            audits: true,
          },
        },
      },
      orderBy: [
        { commodity: 'asc' },
        { country: 'asc' },
        { version: 'desc' },
      ],
    });

    return successResponse(templates);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/compliance/templates
 * Create a new compliance template
 *
 * Only system admins can create templates
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    // Only system admins can create templates
    if (session.user.role !== 'SYSTEM_ADMIN') {
      return errorResponse('Only system administrators can create templates', 403);
    }

    const body = await request.json();

    const template = await db.complianceTemplate.create({
      data: {
        name: body.name,
        version: body.version,
        commodity: body.commodity,
        country: body.country,
        region: body.region,
        regulatoryStandard: body.regulatoryStandard,
        certificationType: body.certificationType,
        sections: body.sections || [],
        scoringRules: body.scoringRules || {},
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'COMPLIANCE_TEMPLATE_CREATE',
        resourceType: 'COMPLIANCE_TEMPLATE',
        resourceId: template.id,
        newValues: template,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return successResponse(template, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
