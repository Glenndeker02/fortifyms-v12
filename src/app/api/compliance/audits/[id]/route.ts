import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
  requireAuth,
} from '@/lib/api-helpers';
import { canAccessMillData, isFWGAStaff } from '@/lib/auth';

/**
 * GET /api/compliance/audits/[id]
 * Get detailed information about a specific compliance audit
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();

    const audit = await db.complianceAudit.findUnique({
      where: { id: params.id },
      include: {
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
        template: {
          select: {
            id: true,
            name: true,
            version: true,
            commodity: true,
            certificationType: true,
            sections: true,
            scoringRules: true,
          },
        },
        auditor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        submitter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        annotations: {
          include: {
            annotator: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!audit) {
      return errorResponse('Audit not found', 404);
    }

    // Check access permissions
    if (!canAccessMillData(session.user.role, session.user.millId, audit.millId)) {
      return errorResponse('You do not have access to this audit', 403);
    }

    return successResponse(audit);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/compliance/audits/[id]
 * Update audit information
 *
 * Allowed updates:
 * - responses (audit in progress)
 * - status (submit for review, approve, reject)
 * - reviewNotes (reviewer only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();

    // Get existing audit
    const existingAudit = await db.complianceAudit.findUnique({
      where: { id: params.id },
      include: {
        mill: true,
      },
    });

    if (!existingAudit) {
      return errorResponse('Audit not found', 404);
    }

    // Check access permissions
    if (!canAccessMillData(session.user.role, session.user.millId, existingAudit.millId)) {
      return errorResponse('You do not have access to this audit', 403);
    }

    const body = await request.json();
    const updateData: any = {};

    // Update responses (auditor only, audit must be in progress)
    if (body.responses !== undefined) {
      if (existingAudit.status !== 'IN_PROGRESS') {
        return errorResponse('Can only update responses for audits in progress', 400);
      }
      if (session.user.id !== existingAudit.auditorId) {
        return errorResponse('Only the auditor can update responses', 403);
      }
      updateData.responses = body.responses;
    }

    // Status updates
    if (body.status !== undefined) {
      const validTransitions: Record<string, string[]> = {
        IN_PROGRESS: ['PENDING_REVIEW'],
        PENDING_REVIEW: ['IN_PROGRESS', 'APPROVED', 'REJECTED'],
        APPROVED: [],
        REJECTED: ['IN_PROGRESS'],
      };

      if (!validTransitions[existingAudit.status]?.includes(body.status)) {
        return errorResponse(`Cannot transition from ${existingAudit.status} to ${body.status}`, 400);
      }

      // Submitting for review
      if (body.status === 'PENDING_REVIEW') {
        if (session.user.id !== existingAudit.auditorId) {
          return errorResponse('Only the auditor can submit for review', 403);
        }
        updateData.status = 'PENDING_REVIEW';
        updateData.submittedAt = new Date();
      }

      // Approving or rejecting
      if (body.status === 'APPROVED' || body.status === 'REJECTED') {
        if (!isFWGAStaff(session.user.role) && session.user.role !== 'SYSTEM_ADMIN') {
          return errorResponse('Only FWGA staff can approve/reject audits', 403);
        }
        updateData.status = body.status;
        updateData.reviewedBy = session.user.id;
        updateData.reviewedAt = new Date();

        // Calculate score if approving
        if (body.status === 'APPROVED' && body.score !== undefined) {
          updateData.score = body.score;
        }
      }

      // Returning to in progress
      if (body.status === 'IN_PROGRESS') {
        if (!isFWGAStaff(session.user.role) && session.user.id !== existingAudit.auditorId) {
          return errorResponse('Only the auditor or FWGA staff can return audit to in progress', 403);
        }
        updateData.status = 'IN_PROGRESS';
      }
    }

    // Review notes (FWGA staff only)
    if (body.reviewNotes !== undefined) {
      if (!isFWGAStaff(session.user.role) && session.user.role !== 'SYSTEM_ADMIN') {
        return errorResponse('Only FWGA staff can add review notes', 403);
      }
      updateData.reviewNotes = body.reviewNotes;
    }

    // Other allowed fields
    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    // Update audit
    const updatedAudit = await db.complianceAudit.update({
      where: { id: params.id },
      data: updateData,
      include: {
        mill: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
            version: true,
          },
        },
        auditor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'COMPLIANCE_AUDIT_UPDATE',
        resourceType: 'COMPLIANCE_AUDIT',
        resourceId: params.id,
        oldValues: existingAudit,
        newValues: updatedAudit,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return successResponse(updatedAudit);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/compliance/audits/[id]
 * Delete a compliance audit
 *
 * Only system admins can delete audits
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();

    // Only system admins can delete audits
    if (session.user.role !== 'SYSTEM_ADMIN') {
      return errorResponse('Only system administrators can delete audits', 403);
    }

    const audit = await db.complianceAudit.findUnique({
      where: { id: params.id },
    });

    if (!audit) {
      return errorResponse('Audit not found', 404);
    }

    // Delete the audit and related annotations
    await db.complianceAudit.delete({
      where: { id: params.id },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'COMPLIANCE_AUDIT_DELETE',
        resourceType: 'COMPLIANCE_AUDIT',
        resourceId: params.id,
        oldValues: audit,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return successResponse({ message: 'Audit deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
