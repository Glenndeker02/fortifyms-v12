import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
} from '@/lib/api-helpers';
import { requirePermissions } from '@/lib/permissions-middleware';
import { Permission, Role } from '@/lib/rbac';

/**
 * GET /api/training/progress
 * Get user's training progress across all courses
 *
 * Query parameters:
 * - userId: Get progress for specific user (admins only)
 * - status: Filter by status (NOT_STARTED, IN_PROGRESS, COMPLETED)
 *
 * Reference: TODO.md Phase 2 - Training Module
 */
export async function GET(request: NextRequest) {
  try {
    // Check permission and get session
    const session = await requirePermissions(Permission.TRAINING_VIEW, 'training progress');

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');
    const status = searchParams.get('status');

    // Determine which user's progress to fetch
    let userId = session.user.id;

    if (userIdParam) {
      // Only admins and managers can view other users' progress
      if (session.user.role !== Role.SYSTEM_ADMIN && session.user.role !== Role.MILL_MANAGER) {
        return errorResponse('You do not have permission to view other users progress', 403);
      }
      userId = userIdParam;
    }

    // Build where clause
    const where: any = {
      userId,
    };

    if (status) {
      where.status = status;
    }

    const progress = await db.trainingProgress.findMany({
      where,
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            difficulty: true,
            duration: true,
            _count: {
              select: {
                modules: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return successResponse(progress);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/training/progress
 * Create or update training progress for a course
 */
export async function POST(request: NextRequest) {
  try {
    // Check permission and get session
    const session = await requirePermissions(Permission.TRAINING_ENROLL, 'training progress');

    const body = await request.json();
    const { courseId, progress: progressValue, score, status } = body;

    if (!courseId) {
      return errorResponse('Course ID is required', 400);
    }

    // Check if course exists
    const course = await db.trainingCourse.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return errorResponse('Course not found', 404);
    }

    // Check if progress record already exists
    const existingProgress = await db.trainingProgress.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId,
        },
      },
    });

    let result;

    if (existingProgress) {
      // Update existing progress
      const updateData: any = {};

      if (progressValue !== undefined) {
        updateData.progress = progressValue;
      }

      if (score !== undefined) {
        updateData.score = score;
      }

      if (status !== undefined) {
        updateData.status = status;

        // If marking as completed, set completedAt
        if (status === 'COMPLETED' && !existingProgress.completedAt) {
          updateData.completedAt = new Date();

          // Generate certificate if score is sufficient (70% or higher)
          if (score && score >= 70) {
            const certificateId = `CERT-${Date.now()}-${session.user.id.slice(0, 8)}`;
            const verificationCode = `${courseId.slice(0, 4)}-${session.user.id.slice(0, 4)}-${Date.now().toString(36)}`;

            const certificate = await db.trainingCertificate.create({
              data: {
                userId: session.user.id,
                courseId,
                certificateId,
                score,
                verificationCode,
              },
            });

            updateData.certificateId = certificate.certificateId;
          }
        }
      }

      result = await db.trainingProgress.update({
        where: {
          userId_courseId: {
            userId: session.user.id,
            courseId,
          },
        },
        data: updateData,
        include: {
          course: {
            select: {
              id: true,
              title: true,
              category: true,
            },
          },
        },
      });
    } else {
      // Create new progress record
      const createData: any = {
        userId: session.user.id,
        courseId,
        status: status || 'IN_PROGRESS',
        progress: progressValue || 0,
      };

      if (score !== undefined) {
        createData.score = score;
      }

      result = await db.trainingProgress.create({
        data: createData,
        include: {
          course: {
            select: {
              id: true,
              title: true,
              category: true,
            },
          },
        },
      });
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: existingProgress ? 'TRAINING_PROGRESS_UPDATE' : 'TRAINING_PROGRESS_CREATE',
        resourceType: 'TRAINING_PROGRESS',
        resourceId: result.id,
        oldValues: existingProgress,
        newValues: result,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return successResponse(result, existingProgress ? 200 : 201);
  } catch (error) {
    return handleApiError(error);
  }
}
