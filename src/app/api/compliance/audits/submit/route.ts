import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { auditId, responses, evidence, notes } = await request.json();

    // Verify audit exists and user has permission
    const audit = await db.complianceAudit.findFirst({
      where: {
        id: auditId,
        OR: [
          { submittedBy: session.user.id },
          { auditorId: session.user.id },
          { mill: { users: { some: { id: session.user.id } } } }
        ]
      },
      include: {
        template: true,
        mill: true
      }
    });

    if (!audit) {
      return NextResponse.json(
        { error: 'Audit not found or access denied' },
        { status: 404 }
      );
    }

    // Parse template sections and scoring rules
    const template = JSON.parse(audit.template.sections);
    const scoringRules = JSON.parse(audit.template.scoringRules);

    // Calculate compliance score
    const scoringResult = calculateComplianceScore(responses, template, scoringRules);

    // Update audit with results
    const updatedAudit = await db.complianceAudit.update({
      where: { id: auditId },
      data: {
        responses: JSON.stringify(responses),
        evidence: JSON.stringify(evidence),
        notes,
        score: scoringResult.overallScore,
        sectionScores: JSON.stringify(scoringResult.sectionScores),
        flaggedIssues: JSON.stringify(scoringResult.flaggedIssues),
        correctiveActions: JSON.stringify(scoringResult.correctiveActions),
        status: 'SUBMITTED',
        submittedAt: new Date()
      },
      include: {
        mill: true,
        template: true,
        auditor: true,
        submitter: true
      }
    });

    // Create notification for FWGA inspectors
    if (audit.auditType === 'SELF_AUDIT') {
      await db.notification.create({
        data: {
          type: 'COMPLIANCE_SUBMISSION',
          title: 'New Compliance Audit Submitted',
          message: `${audit.mill.name} has submitted a ${audit.template.certificationType} compliance audit for review`,
          priority: scoringResult.overallScore < 60 ? 'HIGH' : 'MEDIUM',
          actionUrl: `/compliance/review/${auditId}`,
          metadata: JSON.stringify({
            auditId,
            millId: audit.millId,
            score: scoringResult.overallScore
          })
        }
      });
    }

    return NextResponse.json({
      audit: updatedAudit,
      scoring: scoringResult
    });
  } catch (error) {
    console.error('Error submitting audit:', error);
    return NextResponse.json(
      { error: 'Failed to submit audit' },
      { status: 500 }
    );
  }
}

function calculateComplianceScore(responses: any, template: any, scoringRules: any) {
  const sectionScores = {};
  const flaggedIssues = [];
  const correctiveActions = [];
  let totalPoints = 0;
  let earnedPoints = 0;

  // Process each section
  template.sections.forEach((section: any) => {
    let sectionTotal = 0;
    let sectionEarned = 0;
    const sectionIssues = [];
    const sectionActions = [];

    section.items.forEach((item: any) => {
      const response = responses[item.id];
      const weight = item.weight || getWeightByCriticality(item.criticality);
      
      sectionTotal += weight;
      totalPoints += weight;

      if (response !== undefined && response !== null) {
        let itemScore = 0;

        if (item.type === 'yes_no') {
          itemScore = response === 'yes' ? weight : 0;
          if (response === 'no' && item.criticality === 'CRITICAL') {
            flaggedIssues.push({
              itemId: item.id,
              section: section.title,
              title: item.question,
              severity: 'CRITICAL',
              description: 'Critical compliance item failed'
            });
            sectionActions.push({
              itemId: item.id,
              action: `Address critical issue: ${item.question}`,
              priority: 'CRITICAL',
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            });
          }
        } else if (item.type === 'numeric') {
          const target = item.target || 0;
          const tolerance = item.tolerance || 0.1;
          const deviation = Math.abs(response - target);
          const maxDeviation = target * tolerance;
          
          if (deviation <= maxDeviation) {
            itemScore = weight;
          } else if (deviation <= maxDeviation * 2) {
            itemScore = weight * 0.5;
          } else {
            itemScore = 0;
            if (item.criticality === 'CRITICAL') {
              flaggedIssues.push({
                itemId: item.id,
                section: section.title,
                title: item.question,
                severity: 'CRITICAL',
                description: `Value ${response} is outside acceptable range`
              });
            }
          }
        }

        sectionEarned += itemScore;
        earnedPoints += itemScore;
      }
    });

    const sectionScore = sectionTotal > 0 ? (sectionEarned / sectionTotal) * 100 : 0;
    sectionScores[section.id] = {
      title: section.title,
      score: sectionScore,
      earned: sectionEarned,
      total: sectionTotal,
      issues: sectionIssues,
      actions: sectionActions
    };
  });

  const overallScore = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

  // Determine compliance level
  let complianceLevel = 'NON_COMPLIANT';
  if (overallScore >= 90) complianceLevel = 'EXCELLENT';
  else if (overallScore >= 75) complianceLevel = 'GOOD';
  else if (overallScore >= 60) complianceLevel = 'NEEDS_IMPROVEMENT';

  return {
    overallScore,
    complianceLevel,
    sectionScores,
    flaggedIssues,
    correctiveActions,
    summary: {
      totalItems: template.sections.reduce((sum: number, s: any) => sum + s.items.length, 0),
      answeredItems: Object.keys(responses).length,
      criticalIssues: flaggedIssues.filter((i: any) => i.severity === 'CRITICAL').length,
      majorIssues: flaggedIssues.filter((i: any) => i.severity === 'MAJOR').length
    }
  };
}

function getWeightByCriticality(criticality: string): number {
  switch (criticality) {
    case 'CRITICAL': return 10;
    case 'MAJOR': return 5;
    case 'MINOR': return 2;
    default: return 1;
  }
}