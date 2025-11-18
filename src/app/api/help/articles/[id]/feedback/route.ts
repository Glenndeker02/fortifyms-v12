import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import {
  successResponse,
  errorResponse,
  handleApiError,
} from '@/lib/api-helpers';

const feedbackSchema = z.object({
  helpful: z.boolean(),
  comment: z.string().max(500).optional(),
  email: z.string().email().optional(),
});

/**
 * POST /api/help/articles/[id]/feedback
 * Submit feedback for a help article (public access)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const articleId = params.id;
    const body = await request.json();
    const validatedData = feedbackSchema.parse(body);

    // Check article exists and is published
    const article = await db.helpArticle.findFirst({
      where: {
        OR: [{ id: articleId }, { slug: articleId }],
        status: 'PUBLISHED',
        isActive: true,
      },
    });

    if (!article) {
      return errorResponse('Help article not found', 404);
    }

    // Get IP address for duplicate prevention
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Check for duplicate feedback from same IP within 24 hours
    const recentFeedback = await db.helpFeedback.findFirst({
      where: {
        articleId: article.id,
        ipAddress,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    if (recentFeedback) {
      return errorResponse(
        'You have already submitted feedback for this article recently',
        429
      );
    }

    const result = await db.$transaction(async (tx) => {
      // Create feedback record
      const feedback = await tx.helpFeedback.create({
        data: {
          articleId: article.id,
          helpful: validatedData.helpful,
          comment: validatedData.comment,
          email: validatedData.email,
          ipAddress,
          userAgent,
        },
      });

      // Update article counters
      await tx.helpArticle.update({
        where: { id: article.id },
        data: {
          ...(validatedData.helpful
            ? { helpfulCount: { increment: 1 } }
            : { notHelpfulCount: { increment: 1 } }),
        },
      });

      return feedback;
    });

    return successResponse(
      {
        message: 'Thank you for your feedback!',
        feedbackId: result.id,
      },
      201
    );
  } catch (error) {
    return handleApiError(error, 'article feedback submission');
  }
}

/**
 * GET /api/help/articles/[id]/feedback
 * Get feedback for an article (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const articleId = params.id;

    const article = await db.helpArticle.findFirst({
      where: {
        OR: [{ id: articleId }, { slug: articleId }],
        isActive: true,
      },
    });

    if (!article) {
      return errorResponse('Help article not found', 404);
    }

    const feedback = await db.helpFeedback.findMany({
      where: {
        articleId: article.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        helpful: true,
        comment: true,
        email: true,
        createdAt: true,
      },
    });

    const stats = {
      total: feedback.length,
      helpful: feedback.filter((f) => f.helpful).length,
      notHelpful: feedback.filter((f) => !f.helpful).length,
      withComments: feedback.filter((f) => f.comment).length,
    };

    return successResponse({
      feedback,
      stats,
    });
  } catch (error) {
    return handleApiError(error, 'fetching article feedback');
  }
}
