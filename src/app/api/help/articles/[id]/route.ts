import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import {
  successResponse,
  errorResponse,
  handleApiError,
} from '@/lib/api-helpers';
import { requirePermissions } from '@/lib/permissions-middleware';
import { Permission, Role } from '@/lib/rbac';

const updateArticleSchema = z.object({
  title: z.string().min(5).optional(),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/).optional(),
  summary: z.string().max(500).optional(),
  content: z.string().min(50).optional(),
  categoryId: z.string().cuid().optional(),
  tags: z.array(z.string()).optional(),
  order: z.number().int().nonnegative().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  featuredImage: z.string().url().optional().nullable(),
  metaDescription: z.string().max(160).optional(),
  relatedArticles: z.array(z.string().cuid()).optional(),
  isFeatured: z.boolean().optional(),
});

/**
 * GET /api/help/articles/[id]
 * Get help article by ID or slug (public for published)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const articleId = params.id;

    // Try to find by ID or slug
    const article = await db.helpArticle.findFirst({
      where: {
        OR: [{ id: articleId }, { slug: articleId }],
        isActive: true,
      },
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
    });

    if (!article) {
      return errorResponse('Help article not found', 404);
    }

    // Check if user can view draft articles
    if (article.status !== 'PUBLISHED') {
      try {
        const session = await requirePermissions(Permission.HELP_MANAGE, 'draft article access');
        if (![Role.SYSTEM_ADMIN, Role.FWGA_PROGRAM_MANAGER].includes(session.user.role as Role)) {
          return errorResponse('Help article not found', 404);
        }
      } catch {
        return errorResponse('Help article not found', 404);
      }
    }

    // Increment view count for published articles
    if (article.status === 'PUBLISHED') {
      await db.helpArticle.update({
        where: { id: article.id },
        data: {
          viewCount: { increment: 1 },
        },
      });
    }

    // Get related articles
    let relatedArticles = [];
    if (article.relatedArticles) {
      const relatedIds = JSON.parse(article.relatedArticles);
      relatedArticles = await db.helpArticle.findMany({
        where: {
          id: { in: relatedIds },
          status: 'PUBLISHED',
          isActive: true,
        },
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          viewCount: true,
        },
      });
    }

    return successResponse({
      article,
      relatedArticles,
    });
  } catch (error) {
    return handleApiError(error, 'fetching help article');
  }
}

/**
 * PATCH /api/help/articles/[id]
 * Update help article (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermissions(
      Permission.HELP_MANAGE,
      'help article update'
    );

    // Only admins can update articles
    if (![Role.SYSTEM_ADMIN, Role.FWGA_PROGRAM_MANAGER].includes(session.user.role as Role)) {
      return errorResponse('Only administrators can update help articles', 403);
    }

    const articleId = params.id;
    const body = await request.json();
    const validatedData = updateArticleSchema.parse(body);

    // Check article exists
    const article = await db.helpArticle.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      return errorResponse('Help article not found', 404);
    }

    // Check slug uniqueness if updating
    if (validatedData.slug && validatedData.slug !== article.slug) {
      const existing = await db.helpArticle.findUnique({
        where: { slug: validatedData.slug },
      });

      if (existing) {
        return errorResponse('An article with this slug already exists', 400);
      }
    }

    // Validate category if updating
    if (validatedData.categoryId) {
      const category = await db.helpCategory.findUnique({
        where: { id: validatedData.categoryId },
      });

      if (!category) {
        return errorResponse('Category not found', 404);
      }
    }

    // Validate related articles if updating
    if (validatedData.relatedArticles && validatedData.relatedArticles.length > 0) {
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

    const updated = await db.$transaction(async (tx) => {
      const result = await tx.helpArticle.update({
        where: { id: articleId },
        data: {
          ...validatedData,
          ...(validatedData.relatedArticles && {
            relatedArticles: JSON.stringify(validatedData.relatedArticles),
          }),
          updatedAt: new Date(),
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
          action: 'HELP_ARTICLE_UPDATE',
          resourceType: 'HELP_ARTICLE',
          resourceId: articleId,
          oldValues: JSON.stringify({
            title: article.title,
            status: article.status,
          }),
          newValues: JSON.stringify(validatedData),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      return result;
    });

    return successResponse({
      message: 'Help article updated successfully',
      article: updated,
    });
  } catch (error) {
    return handleApiError(error, 'help article update');
  }
}

/**
 * DELETE /api/help/articles/[id]
 * Soft delete help article (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermissions(
      Permission.HELP_MANAGE,
      'help article deletion'
    );

    // Only admins can delete articles
    if (![Role.SYSTEM_ADMIN, Role.FWGA_PROGRAM_MANAGER].includes(session.user.role as Role)) {
      return errorResponse('Only administrators can delete help articles', 403);
    }

    const articleId = params.id;

    const article = await db.helpArticle.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      return errorResponse('Help article not found', 404);
    }

    await db.$transaction(async (tx) => {
      // Soft delete
      await tx.helpArticle.update({
        where: { id: articleId },
        data: {
          isActive: false,
          status: 'ARCHIVED',
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'HELP_ARTICLE_DELETE',
          resourceType: 'HELP_ARTICLE',
          resourceId: articleId,
          oldValues: JSON.stringify({
            title: article.title,
            status: article.status,
          }),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });
    });

    return successResponse({
      message: 'Help article deleted successfully',
    });
  } catch (error) {
    return handleApiError(error, 'help article deletion');
  }
}
