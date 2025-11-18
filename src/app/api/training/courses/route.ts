import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
  getPaginationParams,
  getSortingParams,
} from '@/lib/api-helpers';
import { requirePermissions } from '@/lib/permissions-middleware';
import { Permission, Role } from '@/lib/rbac';

const createCourseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  duration: z.number().positive('Duration must be positive'),
  language: z.string().default('en'),
  isActive: z.boolean().default(true),
});

/**
 * GET /api/training/courses
 * List training courses with pagination and filtering
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - sortBy: Field to sort by (default: createdAt)
 * - sortOrder: Sort direction (asc/desc, default: desc)
 * - category: Filter by category
 * - difficulty: Filter by difficulty level
 * - isActive: Filter by active status
 *
 * Reference: TODO.md Phase 2 - Training Module
 */
export async function GET(request: NextRequest) {
  try {
    // Check permission and get session
    const session = await requirePermissions(Permission.TRAINING_VIEW, 'training courses');

    // Get pagination and sorting params
    const { skip, take } = getPaginationParams(request);
    const { orderBy } = getSortingParams(request, 'createdAt');

    // Get filter params
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const difficulty = searchParams.get('difficulty');
    const isActive = searchParams.get('isActive');

    // Build where clause (training is global, no tenant filtering)
    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (difficulty) {
      where.difficulty = difficulty;
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Get courses with related data
    const [courses, total] = await Promise.all([
      db.trainingCourse.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          modules: {
            select: {
              id: true,
              title: true,
              order: true,
            },
            orderBy: {
              order: 'asc',
            },
          },
          _count: {
            select: {
              modules: true,
              progress: true,
            },
          },
          progress: {
            where: {
              userId: session.user.id,
            },
            select: {
              id: true,
              status: true,
              progress: true,
              score: true,
              completedAt: true,
            },
          },
        },
      }),
      db.trainingCourse.count({ where }),
    ]);

    return successResponse({
      courses,
      pagination: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/training/courses
 * Create a new training course
 *
 * Only system admins can create courses
 */
export async function POST(request: NextRequest) {
  try {
    // Check permission and get session (only system admins and program managers)
    const session = await requirePermissions(Permission.TRAINING_CREATE, 'training courses');

    const body = await request.json();
    const validation = createCourseSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        `Validation error: ${validation.error.errors.map((e) => e.message).join(', ')}`,
        400
      );
    }

    const data = validation.data;

    const course = await db.trainingCourse.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        difficulty: data.difficulty,
        duration: data.duration,
        language: data.language,
        isActive: data.isActive,
      },
      include: {
        _count: {
          select: {
            modules: true,
          },
        },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'TRAINING_COURSE_CREATE',
        resourceType: 'TRAINING_COURSE',
        resourceId: course.id,
        newValues: course,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return successResponse(course, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
