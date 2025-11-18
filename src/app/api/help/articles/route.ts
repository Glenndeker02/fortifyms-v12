import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import {
  successResponse,
  errorResponse,
  handleApiError,
  getPaginationParams,
  getSortingParams,
} from '@/lib/api-helpers';
import { requirePermissions } from '@/lib/permissions-middleware';
import { Permission, Role } from '@/lib/rbac';

const createArticleSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  summary: z.string().max(500, 'Summary must be less than 500 characters').optional(),
  content: z.string().min(50, 'Content must be at least 50 characters'),
  categoryId: z.string().cuid('Invalid category ID'),
  tags: z.array(z.string()).default([]),
  order: z.number().int().nonnegative().default(0),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  featuredImage: z.string().url().optional().nullable(),
  metaDescription: z.string().max(160).optional(),
  relatedArticles: z.array(z.string().cuid()).default([]),
});

/**
 * GET /api/help/articles
 * List and search help articles (public access for published)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { skip, take } = getPaginationParams(searchParams);
    const { sortBy, sortOrder } = getSortingParams(searchParams);

    const query = searchParams.get('q');
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status') as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | null;
    const tag = searchParams.get('tag');
    const featured = searchParams.get('featured') === 'true';

    // Build where clause
    const where: any = {
      isActive: true,
    };

    // Check if user is authenticated for draft articles
    let canViewDrafts = false;
    try {
      const session = await requirePermissions(Permission.HELP_MANAGE, 'help article access', false);
      if (session && [Role.SYSTEM_ADMIN, Role.FWGA_PROGRAM_MANAGER].includes(session.user.role as Role)) {
        canViewDrafts = true;
      }
    } catch {
      // Not authenticated - can only view published
    }

    if (!canViewDrafts) {
      where.status = 'PUBLISHED';
    } else if (status) {
      where.status = status;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (tag) {
      where.tags = {
        has: tag,
      };
    }

    if (featured) {
      where.isFeatured = true;
    }

    // Full-text search
    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { summary: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
      ];
    }

    // Build order by
    const orderBy: any = {};
    if (sortBy === 'views') {
      orderBy.viewCount = sortOrder;
    } else if (sortBy === 'helpful') {
      orderBy.helpfulCount = sortOrder;
    } else if (sortBy === 'updated') {
      orderBy.updatedAt = sortOrder;
    } else {
      orderBy.createdAt = sortOrder || 'desc';
    }

    const [articles, total] = await Promise.all([
      db.helpArticle.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          author: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy,
        skip,
        take,
      }),
      db.helpArticle.count({ where }),
    ]);

    return successResponse({
      articles,
      pagination: {
        total,
        page: Math.floor(skip / take) + 1,
        pageSize: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    return handleApiError(error, 'fetching help articles');
  }
}

/**
 * POST /api/help/articles
 * Create a new help article (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requirePermissions(
      Permission.HELP_MANAGE,
      'help article creation'
    );

    // Only admins can create articles
    if (![Role.SYSTEM_ADMIN, Role.FWGA_PROGRAM_MANAGER].includes(session.user.role as Role)) {
      return errorResponse('Only administrators can create help articles', 403);
    }

    const body = await request.json();
    const validatedData = createArticleSchema.parse(body);

    // Check slug uniqueness
    const existing = await db.helpArticle.findUnique({
      where: { slug: validatedData.slug },
    });

    if (existing) {
      return errorResponse('An article with this slug already exists', 400);
    }

    // Validate category exists
    const category = await db.helpCategory.findUnique({
      where: { id: validatedData.categoryId },
    });

    if (!category) {
      return errorResponse('Category not found', 404);
    }

    // Validate related articles exist
    if (validatedData.relatedArticles.length > 0) {
      const relatedCount = await db.helpArticle.count({
        where: {
          id: { in: validatedData.relatedArticles },
          isActive: true,
        },
      });

      if (relatedCount !== validatedData.relatedArticles.length) {
        return errorResponse('One or more related articles not found', 400);
      }
    }

    const article = await db.$transaction(async (tx) => {
      const created = await tx.helpArticle.create({
        data: {
          title: validatedData.title,
          slug: validatedData.slug,
          summary: validatedData.summary,
          content: validatedData.content,
          categoryId: validatedData.categoryId,
          authorId: session.user.id,
          tags: validatedData.tags,
          order: validatedData.order,
          status: validatedData.status,
          featuredImage: validatedData.featuredImage,
          metaDescription: validatedData.metaDescription,
          relatedArticles: JSON.stringify(validatedData.relatedArticles),
          isActive: true,
          viewCount: 0,
          helpfulCount: 0,
          notHelpfulCount: 0,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'HELP_ARTICLE_CREATE',
          resourceType: 'HELP_ARTICLE',
          resourceId: created.id,
          newValues: JSON.stringify({
            title: validatedData.title,
            categoryId: validatedData.categoryId,
            status: validatedData.status,
          }),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      return created;
    });

    return successResponse(
      {
        message: 'Help article created successfully',
        article,
      },
      201
    );
  } catch (error) {
    return handleApiError(error, 'help article creation');
  }
}
