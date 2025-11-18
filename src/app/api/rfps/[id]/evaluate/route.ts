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

const evaluateSchema = z.object({
  bidScores: z.array(
    z.object({
      bidId: z.string().cuid(),
      scores: z.object({
        price: z.number().min(0).max(100).optional(),
        quality: z.number().min(0).max(100).optional(),
        delivery: z.number().min(0).max(100).optional(),
        capacity: z.number().min(0).max(100).optional(),
        trackRecord: z.number().min(0).max(100).optional(),
        sustainability: z.number().min(0).max(100).optional(),
      }),
      notes: z.string().optional(),
      disqualified: z.boolean().default(false),
      disqualificationReason: z.string().optional(),
    })
  ),
  evaluationNotes: z.string().optional(),
});

/**
 * POST /api/rfps/[id]/evaluate
 * Evaluate bids for an RFP
 * Calculates weighted scores based on evaluation criteria
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermissions(
      Permission.BID_EVALUATE,
      'bid evaluation'
    );
    const rfpId = params.id;

    // Only buyers and FWGA program managers can evaluate
    if (
      session.user.role !== Role.INSTITUTIONAL_BUYER &&
      session.user.role !== Role.FWGA_PROGRAM_MANAGER &&
      session.user.role !== Role.SYSTEM_ADMIN
    ) {
      return errorResponse('Only buyers can evaluate bids', 403);
    }

    // Parse request body
    const body = await request.json();
    const { bidScores, evaluationNotes } = evaluateSchema.parse(body);

    // Get RFP
    const rfp = await db.rFP.findUnique({
      where: { id: rfpId },
      include: {
        buyer: {
          select: {
            userId: true,
          },
        },
        bids: {
          where: {
            status: {
              in: ['SUBMITTED', 'SHORTLISTED'],
            },
          },
        },
      },
    });

    if (!rfp) {
      return errorResponse('RFP not found', 404);
    }

    // Check ownership (buyers can only evaluate their own RFPs)
    if (
      session.user.role === Role.INSTITUTIONAL_BUYER &&
      rfp.buyer.userId !== session.user.id
    ) {
      return errorResponse('You can only evaluate your own RFPs', 403);
    }

    // Check RFP status
    if (rfp.status !== 'CLOSED') {
      return errorResponse(
        'RFP must be closed before evaluation. Close the RFP first.',
        400
      );
    }

    // Get evaluation criteria from RFP
    const evaluationCriteria = rfp.evaluationCriteria
      ? JSON.parse(rfp.evaluationCriteria)
      : {
          price: { weight: 40 },
          quality: { weight: 30 },
          delivery: { weight: 15 },
          capacity: { weight: 10 },
          trackRecord: { weight: 5 },
        };

    // Calculate weighted scores for each bid
    const evaluatedBids = bidScores.map((bidScore) => {
      const scores = bidScore.scores;
      let totalScore = 0;
      let weightSum = 0;

      Object.keys(scores).forEach((criterion) => {
        const score = scores[criterion as keyof typeof scores];
        const weight = evaluationCriteria[criterion]?.weight || 0;
        if (score !== undefined && weight > 0) {
          totalScore += (score * weight) / 100;
          weightSum += weight;
        }
      });

      const evaluationScore = weightSum > 0 ? totalScore : 0;

      return {
        ...bidScore,
        evaluationScore,
      };
    });

    // Update bids with evaluation scores
    const result = await db.$transaction(async (tx) => {
      const updates = await Promise.all(
        evaluatedBids.map((bidScore) =>
          tx.bid.update({
            where: { id: bidScore.bidId },
            data: {
              evaluationScore: bidScore.evaluationScore,
              status: bidScore.disqualified
                ? 'NOT_SELECTED'
                : bidScore.evaluationScore >= 70
                ? 'SHORTLISTED'
                : 'SUBMITTED',
            },
          })
        )
      );

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'RFP_EVALUATE',
          resourceType: 'RFP',
          resourceId: rfpId,
          newValues: JSON.stringify({
            bidScores: evaluatedBids,
            evaluationNotes,
          }),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      return updates;
    });

    // Get shortlisted bids
    const shortlisted = evaluatedBids
      .filter((b) => !b.disqualified && b.evaluationScore >= 70)
      .sort((a, b) => b.evaluationScore - a.evaluationScore);

    return successResponse({
      message: 'Bids evaluated successfully',
      evaluatedCount: result.length,
      shortlistedCount: shortlisted.length,
      topBid: shortlisted[0]
        ? {
            bidId: shortlisted[0].bidId,
            score: shortlisted[0].evaluationScore,
          }
        : null,
    });
  } catch (error) {
    return handleApiError(error, 'bid evaluation');
  }
}
