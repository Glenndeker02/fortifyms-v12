import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import {
  successResponse,
  errorResponse,
  handleApiError,
  getPaginationParams,
} from '@/lib/api-helpers';
import { requirePermissions } from '@/lib/permissions-middleware';
import { Permission, Role } from '@/lib/rbac';

const createCategorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().optional(),
  icon: z.string().optional(),
  parentId: z.string().cuid().optional().nullable(),
  order: z.number().int().nonnegative().default(0),
});

/**
 * GET /api/help/categories
 * List all help categories (public access)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');
    const includeArticles = searchParams.get('includeArticles') === 'true';

    const categories = await db.helpCategory.findMany({
      where: {
        isActive: true,
        ...(parentId !== null && { parentId: parentId || null }),
      },
      include: {
        _count: {
          select: {
            articles: {
              where: { status: 'PUBLISHED', isActive: true },
            },
            subcategories: true,
          },
        },
        ...(includeArticles && {
          articles: {
            where: { status: 'PUBLISHED', isActive: true },
            select: {
              id: true,
              title: true,
              slug: true,
              summary: true,
              viewCount: true,
              helpfulCount: true,
              createdAt: true,
            },
            orderBy: { order: 'asc' },
          },
        }),
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    return successResponse({
      categories,
      total: categories.length,
    });
  } catch (error) {
    return handleApiError(error, 'fetching help categories');
  }
}

/**
 * POST /api/help/categories
 * Create a new help category (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requirePermissions(
      Permission.HELP_MANAGE,
      'help category creation'
    );

    // Only admins can create categories
    if (![Role.SYSTEM_ADMIN, Role.FWGA_PROGRAM_MANAGER].includes(session.user.role as Role)) {
      return errorResponse('Only administrators can create help categories', 403);
    }

    const body = await request.json();
    const validatedData = createCategorySchema.parse(body);

    // Check slug uniqueness
    const existing = await db.helpCategory.findUnique({
      where: { slug: validatedData.slug },
    });

    if (existing) {
      return errorResponse('A category with this slug already exists', 400);
    }

    // Validate parent category exists if provided
    if (validatedData.parentId) {
      const parent = await db.helpCategory.findUnique({
        where: { id: validatedData.parentId },
      });

      if (!parent) {
        return errorResponse('Parent category not found', 404);
      }
    }

    const category = await db.$transaction(async (tx) => {
      const created = await tx.helpCategory.create({
        data: {
          name: validatedData.name,
          slug: validatedData.slug,
          description: validatedData.description,
          icon: validatedData.icon,
          parentId: validatedData.parentId,
          order: validatedData.order,
          isActive: true,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'HELP_CATEGORY_CREATE',
          resourceType: 'HELP_CATEGORY',
          resourceId: created.id,
          newValues: JSON.stringify(validatedData),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      return created;
    });

    return successResponse(
      {
        message: 'Help category created successfully',
        category,
      },
      201
    );
  } catch (error) {
    return handleApiError(error, 'help category creation');
  }
}
