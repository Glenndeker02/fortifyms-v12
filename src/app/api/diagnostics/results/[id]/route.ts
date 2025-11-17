import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
  requireAuth,
} from '@/lib/api-helpers';
import { canAccessMillData } from '@/lib/auth';

/**
 * GET /api/diagnostics/results/[id]
 * Get detailed information about a specific diagnostic result
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();

    const result = await db.diagnosticResult.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        mill: {
          select: {
            id: true,
            name: true,
            code: true,
            address: true,
            region: true,
            country: true,
          },
        },
      },
    });

    if (!result) {
      return errorResponse('Diagnostic result not found', 404);
    }

    // Check access permissions
    if (result.millId && !canAccessMillData(session.user.role, session.user.millId, result.millId)) {
      return errorResponse('You do not have access to this diagnostic result', 403);
    }

    // Parse JSON fields
    const parsedResult = {
      ...result,
      responses: result.responses ? JSON.parse(result.responses) : {},
      recommendations: result.recommendations ? JSON.parse(result.recommendations) : null,
      metadata: result.metadata ? JSON.parse(result.metadata) : null,
    };

    return successResponse(parsedResult);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/diagnostics/results/[id]
 * Delete a diagnostic result
 *
 * Only system admins can delete results
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();

    // Only system admins can delete results
    if (session.user.role !== 'SYSTEM_ADMIN') {
      return errorResponse('Only system administrators can delete diagnostic results', 403);
    }

    const result = await db.diagnosticResult.findUnique({
      where: { id: params.id },
    });

    if (!result) {
      return errorResponse('Diagnostic result not found', 404);
    }

    await db.diagnosticResult.delete({
      where: { id: params.id },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DIAGNOSTIC_RESULT_DELETE',
        resourceType: 'DIAGNOSTIC_RESULT',
        resourceId: params.id,
        oldValues: result,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return successResponse({ message: 'Diagnostic result deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
