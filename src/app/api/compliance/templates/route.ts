import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
  requireAuth,
} from '@/lib/api-helpers';

const createTemplateSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  version: z.string().min(1, 'Version is required'),
  commodity: z.string().min(1, 'Commodity is required'),
  country: z.string().min(2, 'Country is required'),
  region: z.string().optional(),
  regulatoryStandard: z.string().min(1, 'Regulatory standard is required'),
  certificationType: z.string().optional(),
  sections: z.array(z.any()).default([]),
  scoringRules: z.record(z.any()).default({}),
  isActive: z.boolean().default(true),
});

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
    const validation = createTemplateSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        `Validation error: ${validation.error.errors.map((e) => e.message).join(', ')}`,
        400
      );
    }

    const data = validation.data;

    const template = await db.complianceTemplate.create({
      data: {
        name: data.name,
        version: data.version,
        commodity: data.commodity,
        country: data.country,
        region: data.region,
        regulatoryStandard: data.regulatoryStandard,
        certificationType: data.certificationType,
        sections: data.sections,
        scoringRules: data.scoringRules,
        isActive: data.isActive,
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
