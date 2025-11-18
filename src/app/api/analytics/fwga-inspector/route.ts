import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
  requireAuth,
} from '@/lib/api-helpers';
import { isFWGAStaff } from '@/lib/auth';

/**
 * GET /api/analytics/fwga-inspector
 * Analytics data for FWGA inspector dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    // Only FWGA staff can access this
    if (!isFWGAStaff(session.user.role) && session.user.role !== 'SYSTEM_ADMIN') {
      return errorResponse('Access denied', 403);
    }

    const userId = session.user.id;

    // Get assigned region from user profile (assuming we have this field)
    // For now, we'll show all mills but can filter by region if needed

    // Pending Reviews
    const [
      pendingAudits,
      criticalNonCompliance,
      myAssignedMills,
      upcomingVisits,
    ] = await Promise.all([
      // Audits pending review
      db.complianceAudit.findMany({
        where: {
          status: 'PENDING_REVIEW',
        },
        orderBy: { submittedAt: 'asc' },
        take: 20,
        include: {
          mill: {
            select: {
              id: true,
              name: true,
              code: true,
              region: true,
              country: true,
            },
          },
          template: {
            select: {
              name: true,
              certificationType: true,
            },
          },
        },
      }),

      // Mills with critical non-compliance (score < 60)
      db.complianceAudit.findMany({
        where: {
          status: { in: ['APPROVED', 'REJECTED'] },
          score: { lt: 60 },
        },
        orderBy: { auditDate: 'desc' },
        distinct: ['millId'],
        take: 10,
        include: {
          mill: {
            select: {
              id: true,
              name: true,
              code: true,
              region: true,
            },
          },
        },
      }),

      // Mills assigned to this inspector (from audit history)
      db.complianceAudit.findMany({
        where: {
          auditorId: userId,
        },
        distinct: ['millId'],
        select: {
          millId: true,
          mill: {
            select: {
              id: true,
              name: true,
              code: true,
              region: true,
              country: true,
            },
          },
        },
      }),

      // Upcoming scheduled audits
      db.complianceAudit.findMany({
        where: {
          auditorId: userId,
          status: 'IN_PROGRESS',
          auditDate: { gte: new Date() },
        },
        orderBy: { auditDate: 'asc' },
        take: 10,
        include: {
          mill: {
            select: {
              name: true,
              code: true,
              region: true,
            },
          },
        },
      }),
    ]);

    // Get compliance scores for assigned mills
    const millIds = myAssignedMills.map((a) => a.millId);
    const millComplianceScores = await db.complianceAudit.findMany({
      where: {
        millId: { in: millIds },
      },
      orderBy: { auditDate: 'desc' },
      distinct: ['millId'],
      select: {
        millId: true,
        score: true,
        status: true,
        auditDate: true,
      },
    });

    // Regional overview
    const regionalStats = await db.$queryRaw<
      Array<{ region: string; avgScore: number; millCount: number }>
    >`
      SELECT
        m.region,
        AVG(ca.score) as avgScore,
        COUNT(DISTINCT m.id) as millCount
      FROM mills m
      LEFT JOIN compliance_audits ca ON m.id = ca.mill_id
      WHERE ca.status = 'APPROVED'
      GROUP BY m.region
      ORDER BY avgScore DESC
    `;

    // Common non-compliance issues (from audit annotations)
    const commonIssues = await db.$queryRaw<
      Array<{ category: string; count: number }>
    >`
      SELECT
        json_extract(annotations, '$[*].category') as category,
        COUNT(*) as count
      FROM compliance_audits
      WHERE status IN ('APPROVED', 'REJECTED')
        AND annotations IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
      LIMIT 10
    `;

    const analytics = {
      pendingReviews: {
        count: pendingAudits.length,
        audits: pendingAudits.map((audit) => ({
          id: audit.id,
          mill: audit.mill.name,
          millCode: audit.mill.code,
          template: audit.template.name,
          submittedAt: audit.submittedAt,
          urgency: audit.submittedAt
            ? new Date().getTime() - new Date(audit.submittedAt).getTime() >
              7 * 24 * 60 * 60 * 1000
              ? 'HIGH'
              : 'NORMAL'
            : 'NORMAL',
        })),
        criticalFlags: criticalNonCompliance.map((audit) => ({
          mill: audit.mill.name,
          score: audit.score,
          region: audit.mill.region,
        })),
      },
      myMills: {
        count: myAssignedMills.length,
        mills: myAssignedMills.map((item) => {
          const latestScore = millComplianceScores.find(
            (s) => s.millId === item.millId
          );
          return {
            id: item.mill.id,
            name: item.mill.name,
            code: item.mill.code,
            region: item.mill.region,
            latestScore: latestScore?.score || null,
            status: latestScore?.status || 'NO_AUDIT',
          };
        }),
        upcomingVisits: upcomingVisits.map((visit) => ({
          id: visit.id,
          mill: visit.mill.name,
          date: visit.auditDate,
          region: visit.mill.region,
        })),
      },
      regionalOverview: {
        stats: regionalStats,
        commonIssues: commonIssues,
      },
    };

    return successResponse(analytics);
  } catch (error) {
    return handleApiError(error);
  }
}
