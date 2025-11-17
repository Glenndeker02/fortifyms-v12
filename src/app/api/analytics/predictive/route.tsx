import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// Simple linear regression for trend forecasting
function linearRegression(data: number[]) {
  const n = data.length;
  if (n === 0) return { slope: 0, intercept: 0, r2: 0 };
  
  const sumX = data.reduce((sum, _, i) => sum + i, 0);
  const sumY = data.reduce((sum, val) => sum + val, 0);
  const sumXY = data.reduce((sum, val, i) => sum + val * i, 0);
  const sumXX = data.reduce((sum, _, i) => sum + i * i, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Calculate R-squared
  const meanY = sumY / n;
  const ssTotal = data.reduce((sum, val) => sum + Math.pow(val - meanY, 2), 0);
  const ssResidual = data.reduce((sum, val, i) => {
    const predicted = slope * i + intercept;
    return sum + Math.pow(val - predicted, 2);
  }, 0);
  const r2 = 1 - (ssResidual / ssTotal);
  
  return { slope, intercept, r2 };
}

// Exponential smoothing for forecasting
function exponentialSmoothing(data: number[], alpha: number = 0.3) {
  if (data.length === 0) return [];
  
  const smoothed = [data[0]];
  for (let i = 1; i < data.length; i++) {
    smoothed.push(alpha * data[i] + (1 - alpha) * smoothed[i - 1]);
  }
  return smoothed;
}

// Anomaly detection using statistical methods
function detectAnomalies(data: number[], threshold: number = 2) {
  if (data.length < 3) return [];
  
  const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
  const stdDev = Math.sqrt(
    data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length
  );
  
  return data.map((value, index) => ({
    index,
    value,
    isAnomaly: Math.abs(value - mean) > threshold * stdDev,
    zScore: (value - mean) / stdDev
  })).filter(item => item.isAnomaly);
}

// Calculate risk score for a mill
async function calculateMillRiskScore(millId: string, timeframe: number = 30) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - timeframe);
  
  // Get compliance scores
  const complianceData = await db.audit.findMany({
    where: {
      millId,
      createdAt: { gte: startDate, lte: endDate }
    },
    select: { score: true, createdAt: true },
    orderBy: { createdAt: 'asc' }
  });
  
  // Get QC failures
  const qcFailures = await db.qCTestResult.count({
    where: {
      batch: {
        production: { millId }
      },
      status: 'FAIL',
      createdAt: { gte: startDate, lte: endDate }
    }
  });
  
  // Get maintenance compliance
  const maintenanceTasks = await db.maintenanceTask.findMany({
    where: {
      equipment: { millId },
      dueDate: { gte: startDate, lte: endDate }
    }
  });
  
  const overdueMaintenance = maintenanceTasks.filter(task => 
    task.completedAt === null && task.dueDate < new Date()
  ).length;
  
  // Calculate risk components
  let complianceRisk = 0;
  if (complianceData.length > 0) {
    const recentScores = complianceData.slice(-5);
    const avgScore = recentScores.reduce((sum, item) => sum + item.score, 0) / recentScores.length;
    complianceRisk = avgScore < 80 ? 30 : avgScore < 90 ? 15 : 0;
  }
  
  const maintenanceRisk = maintenanceTasks.length > 0 
    ? (overdueMaintenance / maintenanceTasks.length) * 25 
    : 0;
  
  const qcRisk = Math.min((qcFailures / Math.max(complianceData.length, 1)) * 20, 20);
  
  // Trend analysis
  let trendRisk = 0;
  if (complianceData.length >= 3) {
    const scores = complianceData.map(item => item.score);
    const regression = linearRegression(scores);
    if (regression.slope < -0.5) trendRisk = 25;
    else if (regression.slope < -0.2) trendRisk = 10;
  }
  
  const totalRisk = Math.min(complianceRisk + maintenanceRisk + qcRisk + trendRisk, 100);
  
  return {
    totalRisk,
    components: {
      compliance: complianceRisk,
      maintenance: maintenanceRisk,
      quality: qcRisk,
      trend: trendRisk
    },
    riskLevel: totalRisk >= 70 ? 'HIGH' : totalRisk >= 40 ? 'MEDIUM' : 'LOW',
    dataPoints: {
      complianceData: complianceData.length,
      qcFailures,
      maintenanceTasks: maintenanceTasks.length,
      overdueMaintenance
    }
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const millId = searchParams.get('millId');
    const timeframe = parseInt(searchParams.get('timeframe') || '30');
    const forecastPeriods = parseInt(searchParams.get('forecastPeriods') || '12');

    // Check permissions based on user role
    if (session.user.role !== 'FWGA_PROGRAM_MANAGER' && 
        session.user.role !== 'FWGA_INSPECTOR' && 
        session.user.role !== 'SYSTEM_ADMIN' &&
        millId && session.user.millId !== millId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    switch (type) {
      case 'production-forecast': {
        // Get historical production data
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - timeframe);
        
        const productionData = await db.production.findMany({
          where: {
            millId: millId || undefined,
            createdAt: { gte: startDate, lte: endDate }
          },
          select: { 
            actualOutputWeight: true, 
            createdAt: true,
            lineId: true
          },
          orderBy: { createdAt: 'asc' }
        });

        // Group by day and calculate daily totals
        const dailyData = productionData.reduce((acc, item) => {
          const date = item.createdAt.toISOString().split('T')[0];
          if (!acc[date]) acc[date] = 0;
          acc[date] += item.actualOutputWeight || 0;
          return acc;
        }, {} as Record<string, number>);

        const values = Object.values(dailyData);
        const regression = linearRegression(values);
        const smoothed = exponentialSmoothing(values);
        
        // Generate forecast
        const forecast = [];
        const lastValue = values[values.length - 1] || 0;
        for (let i = 1; i <= forecastPeriods; i++) {
          const predictedValue = regression.slope * (values.length + i) + regression.intercept;
          forecast.push({
            period: i,
            predicted: Math.max(0, predictedValue),
            confidence: Math.max(0.5, 1 - (i / forecastPeriods) * 0.3)
          });
        }

        return NextResponse.json({
          historical: values,
          smoothed,
          forecast,
          regression: {
            slope: regression.slope,
            r2: regression.r2,
            trend: regression.slope > 0 ? 'INCREASING' : regression.slope < 0 ? 'DECREASING' : 'STABLE'
          }
        });
      }

      case 'compliance-forecast': {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - timeframe * 7); // Convert to weeks
        
        const complianceData = await db.audit.findMany({
          where: {
            millId: millId || undefined,
            createdAt: { gte: startDate, lte: endDate }
          },
          select: { score: true, createdAt: true },
          orderBy: { createdAt: 'asc' }
        });

        const scores = complianceData.map(item => item.score);
        const regression = linearRegression(scores);
        
        // Generate forecast
        const forecast = [];
        const lastScore = scores[scores.length - 1] || 100;
        for (let i = 1; i <= forecastPeriods; i++) {
          const predictedScore = Math.min(100, Math.max(0, 
            regression.slope * (scores.length + i) + regression.intercept
          ));
          forecast.push({
            period: i,
            predicted: predictedScore,
            confidence: Math.max(0.6, 1 - (i / forecastPeriods) * 0.2)
          });
        }

        return NextResponse.json({
          historical: scores,
          forecast,
          regression: {
            slope: regression.slope,
            r2: regression.r2,
            trend: regression.slope > 0.5 ? 'IMPROVING' : regression.slope < -0.5 ? 'DECLINING' : 'STABLE'
          }
        });
      }

      case 'anomaly-detection': {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - timeframe);
        
        // Get production anomalies
        const productionData = await db.production.findMany({
          where: {
            millId: millId || undefined,
            createdAt: { gte: startDate, lte: endDate }
          },
          select: { 
            actualOutputWeight: true, 
            createdAt: true,
            yield: true
          },
          orderBy: { createdAt: 'asc' }
        });

        const outputValues = productionData.map(item => item.actualOutputWeight || 0);
        const yieldValues = productionData.map(item => item.yield || 0);
        
        const outputAnomalies = detectAnomalies(outputValues);
        const yieldAnomalies = detectAnomalies(yieldValues);
        
        // Get QC anomalies
        const qcData = await db.qCTestResult.findMany({
          where: {
            batch: {
              production: { 
                millId: millId || undefined,
                createdAt: { gte: startDate, lte: endDate }
              }
            }
          },
          select: { 
            resultValue: true, 
            parameter: true,
            status: true,
            createdAt: true
          },
          orderBy: { createdAt: 'asc' }
        });

        const qcAnomalies = qcData
          .filter(test => test.status === 'FAIL')
          .map(test => ({
            type: 'QC_FAILURE',
            parameter: test.parameter,
            value: test.resultValue,
            date: test.createdAt
          }));

        return NextResponse.json({
          productionAnomalies: outputAnomalies.map(anomaly => ({
            type: 'PRODUCTION_OUTPUT',
            date: productionData[anomaly.index]?.createdAt,
            value: anomaly.value,
            zScore: anomaly.zScore
          })),
          yieldAnomalies: yieldAnomalies.map(anomaly => ({
            type: 'PRODUCTION_YIELD',
            date: productionData[anomaly.index]?.createdAt,
            value: anomaly.value,
            zScore: anomaly.zScore
          })),
          qcAnomalies,
          summary: {
            totalAnomalies: outputAnomalies.length + yieldAnomalies.length + qcAnomalies.length,
            productionAnomalies: outputAnomalies.length + yieldAnomalies.length,
            qcAnomalies: qcAnomalies.length
          }
        });
      }

      case 'risk-scoring': {
        if (!millId) {
          // Get all mills for program managers
          const mills = await db.mill.findMany({
            select: { id: true, name: true, location: true }
          });
          
          const riskScores = await Promise.all(
            mills.map(async (mill) => ({
              millId: mill.id,
              millName: mill.name,
              location: mill.location,
              ...(await calculateMillRiskScore(mill.id, timeframe))
            }))
          );

          return NextResponse.json({
            riskScores,
            summary: {
              totalMills: mills.length,
              highRiskMills: riskScores.filter(r => r.riskLevel === 'HIGH').length,
              mediumRiskMills: riskScores.filter(r => r.riskLevel === 'MEDIUM').length,
              lowRiskMills: riskScores.filter(r => r.riskLevel === 'LOW').length
            }
          });
        } else {
          const riskScore = await calculateMillRiskScore(millId, timeframe);
          return NextResponse.json(riskScore);
        }
      }

      case 'optimization-recommendations': {
        if (!millId) {
          return NextResponse.json({ error: 'Mill ID required for optimization recommendations' }, { status: 400 });
        }

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - timeframe * 2); // Extended timeframe for better analysis
        
        // Get calibration data
        const calibrationData = await db.maintenanceTask.findMany({
          where: {
            equipment: { millId },
            type: 'CALIBRATION',
            completedAt: { not: null },
            createdAt: { gte: startDate, lte: endDate }
          },
          include: {
            equipment: {
              select: { type: true, manufacturer: true, model: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        });

        // Get QC data for premix usage analysis
        const qcData = await db.qCTestResult.findMany({
          where: {
            batch: {
              production: { 
                millId,
                createdAt: { gte: startDate, lte: endDate }
              }
            },
            parameter: { in: ['Iron', 'Vitamin A', 'Vitamin B1', 'Vitamin B2'] }
          },
          include: {
            batch: {
              include: {
                production: {
                  select: { premixUsed: true, expectedPremixUsage: true }
                }
              }
            }
          }
        });

        // Analyze calibration patterns
        const calibrationFrequency = calibrationData.length > 0 
          ? timeframe / (calibrationData.length / 30) // days between calibrations
          : 90; // default

        // Analyze QC performance
        const avgQCScores = qcData.reduce((acc, test) => {
          const param = test.parameter;
          if (!acc[param]) acc[param] = [];
          acc[param].push(test.resultValue);
          return acc;
        }, {} as Record<string, number[]>);

        const recommendations = [];

        // Calibration recommendations
        if (calibrationFrequency > 60) {
          recommendations.push({
            type: 'CALIBRATION',
            priority: 'HIGH',
            title: 'Increase Calibration Frequency',
            description: `Current average interval is ${Math.round(calibrationFrequency)} days. Consider calibrating every 30-45 days for better consistency.`,
            expectedImpact: 'Improved QC consistency by 15-20%',
            effort: 'LOW'
          });
        }

        // Premix usage recommendations
        const premixVariance = qcData.reduce((acc, test) => {
          const variance = Math.abs(
            (test.batch.production.premixUsed - test.batch.production.expectedPremixUsage) / 
            test.batch.production.expectedPremixUsage * 100
          );
          return acc + variance;
        }, 0) / Math.max(qcData.length, 1);

        if (premixVariance > 10) {
          recommendations.push({
            type: 'PREMIX_HANDLING',
            priority: 'MEDIUM',
            title: 'Optimize Premix Dosing Process',
            description: `Premix usage variance is ${premixVariance.toFixed(1)}%. Review dosing equipment and operator training.`,
            expectedImpact: 'Reduce premix waste by 8-12%',
            effort: 'MEDIUM'
          });
        }

        // Quality improvement recommendations
        Object.entries(avgQCScores).forEach(([parameter, values]) => {
          const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
          const target = parameter === 'Iron' ? 30 : parameter === 'Vitamin A' ? 15000 : 15; // Example targets
          
          if (avg < target * 0.9) {
            recommendations.push({
              type: 'QUALITY',
              priority: 'HIGH',
              title: `Improve ${parameter} Consistency`,
              description: `Average ${parameter} level is ${avg.toFixed(1)} vs target of ${target}. Review mixing time and premix distribution.`,
              expectedImpact: 'Achieve target consistency in 90% of batches',
              effort: 'MEDIUM'
            });
          }
        });

        return NextResponse.json({
          recommendations: recommendations.sort((a, b) => {
            const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          }),
          analysis: {
            calibrationFrequency: Math.round(calibrationFrequency),
            premixVariance: premixVariance.toFixed(1),
            qcParameters: Object.keys(avgQCScores).length,
            dataPoints: qcData.length
          }
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid analytics type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Predictive analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}