import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
  requireAuth,
  getPaginationParams,
  getSortingParams,
} from '@/lib/api-helpers';
import { isMillStaff } from '@/lib/auth';

/**
 * GET /api/diagnostics/results
 * List diagnostic results with pagination and filtering
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - sortBy: Field to sort by (default: createdAt)
 * - sortOrder: Sort direction (asc/desc, default: desc)
 * - category: Filter by category
 * - severity: Filter by severity
 * - millId: Filter by mill ID
 *
 * Reference: TODO.md Phase 2 - Diagnostics Module, newprd.md 3.1.1
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    // Get pagination and sorting params
    const { skip, take } = getPaginationParams(request);
    const { orderBy } = getSortingParams(request, 'createdAt');

    // Get filter params
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const severity = searchParams.get('severity');
    const millId = searchParams.get('millId');

    // Build where clause
    const where: any = {};

    // Role-based filtering
    if (isMillStaff(session.user.role)) {
      // Mill staff can only see diagnostics from their mill
      if (!session.user.millId) {
        return errorResponse('User is not assigned to a mill', 403);
      }
      where.millId = session.user.millId;
    } else if (millId) {
      // FWGA staff and admins can filter by mill
      where.millId = millId;
    }

    // Category filter
    if (category) {
      where.category = category;
    }

    // Severity filter
    if (severity) {
      where.severity = severity;
    }

    // Get diagnostic results with related data
    const [results, total] = await Promise.all([
      db.diagnosticResult.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          mill: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      }),
      db.diagnosticResult.count({ where }),
    ]);

    // Parse JSON fields
    const parsedResults = results.map((result) => ({
      ...result,
      responses: result.responses ? JSON.parse(result.responses) : {},
      recommendations: result.recommendations ? JSON.parse(result.recommendations) : null,
    }));

    return successResponse({
      results: parsedResults,
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
 * POST /api/diagnostics/results
 * Create a new diagnostic result
 *
 * Body: DiagnosticResultInput
 *
 * Reference: newprd.md Module 3.1.1 (Interactive Diagnostic Wizard)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body = await request.json();

    const { category, subcategory, cropType, equipmentType, responses, questionnaireId } = body;

    if (!category) {
      return errorResponse('Category is required', 400);
    }

    if (!responses || !Array.isArray(responses) || responses.length === 0) {
      return errorResponse('Responses are required', 400);
    }

    // Determine which mill to associate with
    let targetMillId = null;

    if (isMillStaff(session.user.role)) {
      if (!session.user.millId) {
        return errorResponse('User is not assigned to a mill', 403);
      }
      targetMillId = session.user.millId;
    }

    // Analyze responses and generate recommendations
    const analysis = analyzeDiagnosticResponses(category, subcategory, responses);

    // Create diagnostic result
    const result = await db.diagnosticResult.create({
      data: {
        userId: session.user.id,
        millId: targetMillId,
        category,
        subcategory,
        questionnaireId,
        responses: JSON.stringify(responses),
        result: analysis.result,
        recommendations: JSON.stringify(analysis.recommendations),
        severity: analysis.severity,
        metadata: JSON.stringify({
          cropType,
          equipmentType,
          completedAt: new Date().toISOString(),
        }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        mill: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DIAGNOSTIC_RESULT_CREATE',
        resourceType: 'DIAGNOSTIC_RESULT',
        resourceId: result.id,
        newValues: result,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    // TODO: Create training alert if recommendations include training
    // if (analysis.recommendTraining) {
    //   await createTrainingAlert({
    //     userId: session.user.id,
    //     type: 'DIAGNOSTIC_BASED',
    //     recommendedCourses: analysis.recommendedCourses,
    //   });
    // }

    // Parse JSON for response
    const parsedResult = {
      ...result,
      responses: JSON.parse(result.responses),
      recommendations: JSON.parse(result.recommendations),
      metadata: JSON.parse(result.metadata || '{}'),
    };

    return successResponse(parsedResult, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Analyze diagnostic responses and generate recommendations
 * This is a simplified version - in production, this would be much more sophisticated
 */
function analyzeDiagnosticResponses(
  category: string,
  subcategory: string | null,
  responses: any[]
): {
  result: string;
  recommendations: any[];
  severity: string;
} {
  // Count issues based on responses
  let issueCount = 0;
  const recommendations: any[] = [];

  // Simple analysis logic
  responses.forEach((response) => {
    const { questionType, value } = response;

    // Example logic for Yes/No questions
    if (questionType === 'YES_NO' && value === 'NO') {
      issueCount++;
    }

    // Example logic for numeric ranges
    if (questionType === 'NUMERIC') {
      // Check if value is outside expected range
      // This would need more sophisticated logic in production
    }
  });

  // Determine severity
  let severity = 'LOW';
  if (issueCount >= 5) {
    severity = 'HIGH';
  } else if (issueCount >= 3) {
    severity = 'MEDIUM';
  }

  // Generate result summary
  let result = 'Diagnostic completed successfully.';
  if (issueCount > 0) {
    result = `${issueCount} potential issue(s) identified in ${category}.`;
  } else {
    result = `No significant issues identified in ${category}. System appears to be functioning normally.`;
  }

  // Generate recommendations
  if (issueCount > 0) {
    recommendations.push({
      type: 'CORRECTIVE_ACTION',
      priority: severity,
      description: 'Review identified issues and take corrective actions.',
      steps: [
        'Document all findings',
        'Consult with supervisor or technical team',
        'Implement recommended corrections',
        'Re-run diagnostic after corrections',
      ],
    });

    if (severity === 'HIGH') {
      recommendations.push({
        type: 'TRAINING',
        priority: 'HIGH',
        description: `Complete training on ${category}`,
        recommendedCourses: [
          {
            category,
            difficulty: 'INTERMEDIATE',
          },
        ],
      });
    }
  }

  return {
    result,
    recommendations,
    severity,
  };
}
