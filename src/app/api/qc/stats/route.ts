import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
  requireAuth,
} from '@/lib/api-helpers';
import { isMillStaff } from '@/lib/auth';

/**
 * GET /api/qc/stats
 * Get QC testing statistics
 *
 * Query parameters:
 * - millId: Filter by mill ID (optional for FWGA staff/admins)
 * - period: Time period (today, week, month, year)
 *
 * Returns:
 * - total: Total number of QC tests
 * - passed: Number of tests that passed
 * - marginal: Number of marginal tests
 * - failed: Number of tests that failed
 * - passRate: Percentage of tests that passed
 * - avgDeviation: Average deviation from target (as percentage)
 * - testsByType: Breakdown by test type
 * - recentTests: Recent test results
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    const { searchParams } = new URL(request.url);
    const millId = searchParams.get('millId');
    const period = searchParams.get('period') || 'month';

    // Build where clause based on role and filters
    const where: any = {};

    // Role-based filtering
    if (isMillStaff(session.user.role)) {
      // Mill staff can only see stats from their mill
      if (!session.user.millId) {
        return errorResponse('User is not assigned to a mill', 403);
      }

      where.batch = {
        millId: session.user.millId,
      };
    } else if (millId) {
      // FWGA staff and admins can filter by mill
      where.batch = {
        millId,
      };
    }

    // Time period filter
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    where.testDate = {
      gte: startDate,
    };

    // Get all QC tests for the period
    const qcTests = await db.qCTest.findMany({
      where,
      include: {
        batch: {
          select: {
            id: true,
            batchId: true,
            productType: true,
            mill: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        tester: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        testDate: 'desc',
      },
    });

    // Calculate statistics
    const total = qcTests.length;
    const passed = qcTests.filter(test => test.status === 'PASS').length;
    const marginal = qcTests.filter(test => test.status === 'MARGINAL').length;
    const failed = qcTests.filter(test => test.status === 'FAIL').length;
    const passRate = total > 0 ? (passed / total) * 100 : 0;

    // Calculate average deviation (absolute values)
    const avgDeviation =
      total > 0
        ? qcTests.reduce((sum, test) => sum + Math.abs(test.deviation || 0), 0) / total
        : 0;

    // Group tests by type
    const testsByType: Record<string, { total: number; passed: number; failed: number; marginal: number }> = {};

    qcTests.forEach(test => {
      if (!testsByType[test.testType]) {
        testsByType[test.testType] = {
          total: 0,
          passed: 0,
          failed: 0,
          marginal: 0,
        };
      }

      testsByType[test.testType].total++;

      if (test.status === 'PASS') {
        testsByType[test.testType].passed++;
      } else if (test.status === 'FAIL') {
        testsByType[test.testType].failed++;
      } else if (test.status === 'MARGINAL') {
        testsByType[test.testType].marginal++;
      }
    });

    // Get recent tests (last 10)
    const recentTests = qcTests.slice(0, 10).map(test => ({
      id: test.id,
      batchId: test.batch.batchId,
      productType: test.batch.productType,
      millName: test.batch.mill.name,
      testType: test.testType,
      testDate: test.testDate,
      result: test.result,
      target: test.target,
      deviation: test.deviation,
      status: test.status,
      testerName: test.tester.name,
    }));

    // Calculate compliance trend (tests over time)
    const testsByDay: Record<string, { total: number; passed: number }> = {};

    qcTests.forEach(test => {
      const dateKey = test.testDate.toISOString().split('T')[0];

      if (!testsByDay[dateKey]) {
        testsByDay[dateKey] = {
          total: 0,
          passed: 0,
        };
      }

      testsByDay[dateKey].total++;
      if (test.status === 'PASS') {
        testsByDay[dateKey].passed++;
      }
    });

    const trend = Object.entries(testsByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({
        date,
        total: stats.total,
        passed: stats.passed,
        passRate: (stats.passed / stats.total) * 100,
      }));

    return successResponse({
      summary: {
        total,
        passed,
        marginal,
        failed,
        passRate: Number(passRate.toFixed(2)),
        avgDeviation: Number(avgDeviation.toFixed(2)),
      },
      testsByType,
      recentTests,
      trend,
      period,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
