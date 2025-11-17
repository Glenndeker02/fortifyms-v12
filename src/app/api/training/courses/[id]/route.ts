import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
  requireAuth,
} from '@/lib/api-helpers';

/**
 * GET /api/training/courses/[id]
 * Get detailed information about a specific training course
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();

    const course = await db.trainingCourse.findUnique({
      where: { id: params.id },
      include: {
        modules: {
          include: {
            quizzes: {
              select: {
                id: true,
                question: true,
                type: true,
                options: true,
                points: true,
                order: true,
              },
              orderBy: {
                order: 'asc',
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        progress: {
          where: {
            userId: session.user.id,
          },
        },
        _count: {
          select: {
            modules: true,
            progress: true,
          },
        },
      },
    });

    if (!course) {
      return errorResponse('Course not found', 404);
    }

    return successResponse(course);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/training/courses/[id]
 * Update course information
 *
 * Only system admins can update courses
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();

    // Only system admins can update courses
    if (session.user.role !== 'SYSTEM_ADMIN') {
      return errorResponse('Only system administrators can update courses', 403);
    }

    const existingCourse = await db.trainingCourse.findUnique({
      where: { id: params.id },
    });

    if (!existingCourse) {
      return errorResponse('Course not found', 404);
    }

    const body = await request.json();
    const updateData: any = {};

    // Allowed fields
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.difficulty !== undefined) updateData.difficulty = body.difficulty;
    if (body.duration !== undefined) updateData.duration = body.duration;
    if (body.language !== undefined) updateData.language = body.language;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const updatedCourse = await db.trainingCourse.update({
      where: { id: params.id },
      data: updateData,
      include: {
        _count: {
          select: {
            modules: true,
            progress: true,
          },
        },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'TRAINING_COURSE_UPDATE',
        resourceType: 'TRAINING_COURSE',
        resourceId: params.id,
        oldValues: existingCourse,
        newValues: updatedCourse,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return successResponse(updatedCourse);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/training/courses/[id]
 * Delete a training course
 *
 * Only system admins can delete courses
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();

    // Only system admins can delete courses
    if (session.user.role !== 'SYSTEM_ADMIN') {
      return errorResponse('Only system administrators can delete courses', 403);
    }

    const course = await db.trainingCourse.findUnique({
      where: { id: params.id },
    });

    if (!course) {
      return errorResponse('Course not found', 404);
    }

    // Soft delete by marking as inactive
    const deletedCourse = await db.trainingCourse.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'TRAINING_COURSE_DELETE',
        resourceType: 'TRAINING_COURSE',
        resourceId: params.id,
        oldValues: course,
        newValues: deletedCourse,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return successResponse({ message: 'Course deactivated successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
