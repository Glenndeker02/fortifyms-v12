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

    const { diagnosticId, responses, currentStep } = await request.json();

    // Update diagnostic result
    const diagnosticResult = await db.diagnosticResult.update({
      where: { id: diagnosticId },
      data: {
        responses: JSON.stringify(responses),
        currentStep,
        progress: (currentStep / Object.keys(responses).length) * 100
      }
    });

    // Analyze responses and generate recommendations
    const analysis = analyzeResponses(responses, diagnosticResult.category);

    if (currentStep === Object.keys(responses).length) {
      // Complete the diagnostic
      const updatedResult = await db.diagnosticResult.update({
        where: { id: diagnosticId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          result: analysis.result,
          recommendations: JSON.stringify(analysis.recommendations),
          severity: analysis.severity,
          flaggedIssues: JSON.stringify(analysis.flaggedIssues)
        }
      });

      return NextResponse.json({
        status: 'completed',
        diagnostic: updatedResult,
        analysis
      });
    }

    return NextResponse.json({
      status: 'in_progress',
      diagnostic: diagnosticResult,
      analysis: analysis.partialAnalysis || null
    });
  } catch (error) {
    console.error('Error submitting diagnostic:', error);
    return NextResponse.json(
      { error: 'Failed to submit diagnostic' },
      { status: 500 }
    );
  }
}

function analyzeResponses(responses: any, category: string) {
  const flaggedIssues = [];
  const recommendations = [];
  let severity = 'ADVISORY';
  let result = 'PASS';

  // Example analysis logic for different categories
  if (category === 'rice_parboiling') {
    // Analyze soaking temperature
    if (responses.soak_temp) {
      const temp = parseFloat(responses.soak_temp);
      if (temp < 65 || temp > 75) {
        flaggedIssues.push({
          id: 'soak_temp_out_of_range',
          title: 'Soaking Temperature Out of Range',
          description: `Temperature ${temp}°C is outside optimal range (65-75°C)`,
          severity: 'WARNING',
          impact: 'Affects starch gelatinization and final grain quality'
        });
        recommendations.push({
          issue: 'soak_temp_out_of_range',
          action: 'Adjust water heating system to maintain 65-75°C range',
          priority: 'HIGH',
          trainingModule: 'temperature-control-basics'
        });
        severity = 'WARNING';
      }
    }

    // Analyze soaking time
    if (responses.soak_time) {
      const time = parseFloat(responses.soak_time);
      if (time < 4 || time > 8) {
        flaggedIssues.push({
          id: 'soak_time_insufficient',
          title: 'Soaking Time Insufficient',
          description: `Soaking time ${time} hours is outside optimal range (4-8 hours)`,
          severity: time < 4 ? 'CRITICAL' : 'WARNING',
          impact: 'Insufficient soaking leads to poor parboiling quality'
        });
        recommendations.push({
          issue: 'soak_time_insufficient',
          action: 'Adjust soaking schedule to maintain 4-8 hours',
          priority: time < 4 ? 'CRITICAL' : 'HIGH',
          trainingModule: 'soaking-process-optimization'
        });
        if (time < 4) severity = 'CRITICAL';
      }
    }
  }

  if (category === 'doser_calibration') {
    // Analyze calibration test weight
    if (responses.calibration_test_weight) {
      const weight = parseFloat(responses.calibration_test_weight);
      if (weight < 95 || weight > 105) {
        flaggedIssues.push({
          id: 'doser_calibration_drift',
          title: 'Doser Calibration Drift Detected',
          description: `Test weight ${weight}g is outside acceptable range (95-105g)`,
          severity: 'CRITICAL',
          impact: 'Incorrect fortification levels affecting product quality'
        });
        recommendations.push({
          issue: 'doser_calibration_drift',
          action: 'Recalibrate doser immediately and verify with repeat tests',
          priority: 'CRITICAL',
          trainingModule: 'doser-calibration-procedures'
        });
        severity = 'CRITICAL';
      }
    }
  }

  if (flaggedIssues.length > 0) {
    result = severity === 'CRITICAL' ? 'FAIL' : 'WARNING';
  }

  return {
    result,
    severity,
    flaggedIssues,
    recommendations,
    summary: {
      totalIssues: flaggedIssues.length,
      criticalIssues: flaggedIssues.filter(i => i.severity === 'CRITICAL').length,
      warningIssues: flaggedIssues.filter(i => i.severity === 'WARNING').length,
      advisoryIssues: flaggedIssues.filter(i => i.severity === 'ADVISORY').length
    }
  };
}