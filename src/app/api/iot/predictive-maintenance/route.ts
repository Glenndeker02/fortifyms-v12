import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
} from '@/lib/api-helpers';
import { requirePermissions, buildPermissionWhere } from '@/lib/permissions-middleware';
import { Permission, Role } from '@/lib/rbac';

/**
 * GET /api/iot/predictive-maintenance
 * Get predictive maintenance insights based on sensor data
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requirePermissions(
      Permission.PREDICTIVE_MAINTENANCE_VIEW,
      'predictive maintenance access'
    );

    const { searchParams } = new URL(request.url);
    const equipmentId = searchParams.get('equipmentId');

    // Build where clause with RBAC
    const permissionWhere = buildPermissionWhere(session, 'equipment');
    const where: any = {
      ...permissionWhere,
      isActive: true,
    };

    if (equipmentId) {
      where.id = equipmentId;
    }

    // Get equipment with sensors
    const equipment = await db.equipment.findMany({
      where,
      include: {
        sensors: {
          where: { isActive: true },
        },
      },
    });

    // Analyze each equipment's sensors for predictive insights
    const insights = await Promise.all(
      equipment.map(async (equip) => {
        const sensorAnalyses = await Promise.all(
          equip.sensors.map(async (sensor) => {
            // Get readings from last 7 days
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const readings = await db.sensorReading.findMany({
              where: {
                sensorId: sensor.id,
                timestamp: { gte: sevenDaysAgo },
              },
              orderBy: { timestamp: 'asc' },
            });

            if (readings.length < 10) {
              return {
                sensorId: sensor.id,
                sensorType: sensor.sensorType,
                status: 'INSUFFICIENT_DATA',
                confidence: 0,
              };
            }

            // Calculate basic statistics
            const values = readings.map((r) => r.value);
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const variance =
              values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
            const stdDev = Math.sqrt(variance);

            // Detect drift: increasing trend over time
            const recentValues = values.slice(-Math.floor(values.length / 3)); // Last third
            const earlyValues = values.slice(0, Math.floor(values.length / 3)); // First third
            const recentMean = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
            const earlyMean = earlyValues.reduce((a, b) => a + b, 0) / earlyValues.length;
            const drift = ((recentMean - earlyMean) / earlyMean) * 100;

            // Calculate coefficient of variation (CV)
            const cv = (stdDev / mean) * 100;

            // Risk assessment
            let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
            let confidence = 0;
            const reasons: string[] = [];

            // Check if trending towards thresholds
            if (sensor.maxThreshold && recentMean > sensor.maxThreshold * 0.9) {
              riskLevel = 'HIGH';
              confidence = 75;
              reasons.push(`Approaching max threshold (${sensor.maxThreshold}${sensor.unit || ''})`);
            } else if (sensor.maxThreshold && recentMean > sensor.maxThreshold * 0.8) {
              riskLevel = 'MEDIUM';
              confidence = 60;
              reasons.push(`Nearing max threshold (${sensor.maxThreshold}${sensor.unit || ''})`);
            }

            // High variability indicates instability
            if (cv > 30) {
              riskLevel = riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM';
              confidence = Math.max(confidence, 65);
              reasons.push(`High variability detected (CV: ${cv.toFixed(1)}%)`);
            }

            // Significant drift
            if (Math.abs(drift) > 15) {
              riskLevel = riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM';
              confidence = Math.max(confidence, 70);
              reasons.push(
                `${drift > 0 ? 'Upward' : 'Downward'} drift detected (${Math.abs(drift).toFixed(
                  1
                )}%)`
              );
            }

            // Critical threshold exceeded
            if (
              (sensor.criticalMax && recentMean > sensor.criticalMax * 0.85) ||
              (sensor.criticalMin && recentMean < sensor.criticalMin * 1.15)
            ) {
              riskLevel = 'CRITICAL';
              confidence = 85;
              reasons.push('Approaching critical threshold');
            }

            // Predict time to failure (simple linear extrapolation)
            let predictedFailureDate: Date | null = null;
            if (sensor.maxThreshold && drift > 5) {
              const daysToThreshold =
                ((sensor.maxThreshold - recentMean) / (recentMean - earlyMean)) * 7;
              if (daysToThreshold > 0 && daysToThreshold < 90) {
                predictedFailureDate = new Date(Date.now() + daysToThreshold * 24 * 60 * 60 * 1000);
                reasons.push(
                  `Estimated ${Math.round(daysToThreshold)} days until threshold breach`
                );
              }
            }

            return {
              sensorId: sensor.id,
              sensorType: sensor.sensorType,
              location: sensor.location,
              riskLevel,
              confidence,
              reasons,
              metrics: {
                mean: parseFloat(mean.toFixed(2)),
                stdDev: parseFloat(stdDev.toFixed(2)),
                cv: parseFloat(cv.toFixed(2)),
                drift: parseFloat(drift.toFixed(2)),
                recentMean: parseFloat(recentMean.toFixed(2)),
              },
              predictedFailureDate,
              recommendedAction:
                riskLevel === 'CRITICAL'
                  ? 'IMMEDIATE_INSPECTION'
                  : riskLevel === 'HIGH'
                  ? 'SCHEDULE_MAINTENANCE'
                  : riskLevel === 'MEDIUM'
                  ? 'MONITOR_CLOSELY'
                  : 'ROUTINE_MONITORING',
            };
          })
        );

        // Determine overall equipment health
        const maxRisk = sensorAnalyses.reduce((max, analysis) => {
          const riskScores = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
          const currentScore = riskScores[analysis.riskLevel as keyof typeof riskScores] || 0;
          const maxScore = riskScores[max as keyof typeof riskScores] || 0;
          return currentScore > maxScore ? analysis.riskLevel : max;
        }, 'LOW');

        return {
          equipmentId: equip.id,
          equipmentName: equip.name,
          equipmentType: equip.type,
          overallRiskLevel: maxRisk,
          sensorAnalyses: sensorAnalyses.filter((a) => a.riskLevel !== 'LOW'),
          lastAnalyzed: new Date(),
        };
      })
    );

    // Filter to equipment with potential issues
    const equipmentAtRisk = insights.filter(
      (i) => i.overallRiskLevel !== 'LOW' && i.sensorAnalyses.length > 0
    );

    return successResponse({
      insights: equipmentAtRisk,
      summary: {
        total: equipment.length,
        atRisk: equipmentAtRisk.length,
        critical: equipmentAtRisk.filter((i) => i.overallRiskLevel === 'CRITICAL').length,
        high: equipmentAtRisk.filter((i) => i.overallRiskLevel === 'HIGH').length,
        medium: equipmentAtRisk.filter((i) => i.overallRiskLevel === 'MEDIUM').length,
      },
    });
  } catch (error) {
    return handleApiError(error, 'predictive maintenance analysis');
  }
}
