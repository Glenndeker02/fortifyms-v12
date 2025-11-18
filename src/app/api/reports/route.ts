import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  handleApiError,
  requireAuth,
} from '@/lib/api-helpers';

/**
 * POST /api/reports
 * Generate a report based on template and parameters
 *
 * Report Types:
 * - PRODUCTION_SUMMARY: Daily/monthly production summary
 * - COMPLIANCE_AUDIT: Compliance audit report
 * - QC_ANALYSIS: Quality control analysis
 * - TRAINING_PROGRESS: Training completion report
 * - MAINTENANCE_LOG: Maintenance activities log
 *
 * Reference: newprd.md Section 3.7.3 - Report Generation
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const { reportType, dateRange, millId, format = 'JSON' } = body;

    if (!reportType || !dateRange) {
      return errorResponse('Report type and date range are required', 400);
    }

    const { startDate, endDate } = dateRange;
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Build where clause based on role
    const whereClause: any = {
      createdAt: {
        gte: start,
        lte: end,
      },
    };

    // Role-based filtering
    if (session.user.role === 'MILL_MANAGER' || session.user.role === 'MILL_OPERATOR') {
      if (!session.user.millId) {
        return errorResponse('User is not assigned to a mill', 403);
      }
      whereClause.millId = session.user.millId;
    } else if (millId) {
      whereClause.millId = millId;
    }

    let reportData: any = {};

    switch (reportType) {
      case 'PRODUCTION_SUMMARY':
        const [batches, totalProduction, batchesByStatus] = await Promise.all([
          db.batch.findMany({
            where: whereClause,
            include: {
              mill: {
                select: { name: true, code: true },
              },
              qcTests: {
                select: { testType: true, result: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          }),
          db.batch.aggregate({
            where: whereClause,
            _sum: { quantityProduced: true },
            _avg: { quantityProduced: true },
          }),
          db.batch.groupBy({
            by: ['status'],
            where: whereClause,
            _count: true,
          }),
        ]);

        reportData = {
          title: 'Production Summary Report',
          period: { startDate, endDate },
          summary: {
            totalBatches: batches.length,
            totalProduction: totalProduction._sum.quantityProduced || 0,
            averageProduction: totalProduction._avg.quantityProduced || 0,
            batchesByStatus: batchesByStatus,
          },
          batches: batches.map((b) => ({
            batchNumber: b.batchNumber,
            mill: b.mill?.name,
            commodity: b.commodity,
            quantity: b.quantityProduced,
            status: b.status,
            createdAt: b.createdAt,
            qcTests: b.qcTests.length,
          })),
        };
        break;

      case 'COMPLIANCE_AUDIT':
        const audits = await db.complianceAudit.findMany({
          where: {
            ...whereClause,
            auditDate: {
              gte: start,
              lte: end,
            },
          },
          include: {
            mill: {
              select: { name: true, code: true },
            },
            template: {
              select: { name: true, version: true },
            },
          },
          orderBy: { auditDate: 'desc' },
        });

        const avgScore = audits.reduce((sum, a) => sum + (a.score || 0), 0) / (audits.length || 1);

        reportData = {
          title: 'Compliance Audit Report',
          period: { startDate, endDate },
          summary: {
            totalAudits: audits.length,
            averageScore: Math.round(avgScore),
            passed: audits.filter((a) => a.status === 'APPROVED').length,
            failed: audits.filter((a) => a.status === 'REJECTED').length,
            pending: audits.filter((a) => a.status === 'PENDING_REVIEW').length,
          },
          audits: audits.map((a) => ({
            mill: a.mill.name,
            template: a.template.name,
            auditDate: a.auditDate,
            score: a.score,
            status: a.status,
            auditType: a.auditType,
          })),
        };
        break;

      case 'QC_ANALYSIS':
        const qcTests = await db.qcTest.findMany({
          where: whereClause,
          include: {
            batch: {
              select: {
                batchNumber: true,
                commodity: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        const passRate =
          (qcTests.filter((t) => t.result === 'PASS').length / (qcTests.length || 1)) * 100;

        reportData = {
          title: 'Quality Control Analysis Report',
          period: { startDate, endDate },
          summary: {
            totalTests: qcTests.length,
            passed: qcTests.filter((t) => t.result === 'PASS').length,
            failed: qcTests.filter((t) => t.result === 'FAIL').length,
            passRate: Math.round(passRate),
          },
          tests: qcTests.map((t) => ({
            batchNumber: t.batch.batchNumber,
            commodity: t.batch.commodity,
            testType: t.testType,
            result: t.result,
            testedAt: t.createdAt,
          })),
        };
        break;

      case 'TRAINING_PROGRESS':
        const trainingProgress = await db.trainingProgress.findMany({
          where: {
            updatedAt: {
              gte: start,
              lte: end,
            },
          },
          include: {
            user: {
              select: { name: true, role: true },
            },
            course: {
              select: { title: true, category: true, difficulty: true },
            },
          },
        });

        const completedCount = trainingProgress.filter(
          (t) => t.status === 'COMPLETED'
        ).length;
        const completionRate = (completedCount / (trainingProgress.length || 1)) * 100;

        reportData = {
          title: 'Training Progress Report',
          period: { startDate, endDate },
          summary: {
            totalEnrollments: trainingProgress.length,
            completed: completedCount,
            inProgress: trainingProgress.filter((t) => t.status === 'IN_PROGRESS').length,
            completionRate: Math.round(completionRate),
          },
          progress: trainingProgress.map((t) => ({
            user: t.user.name,
            role: t.user.role,
            course: t.course.title,
            category: t.course.category,
            status: t.status,
            progress: t.progress,
            score: t.score,
            completedAt: t.completedAt,
          })),
        };
        break;

      case 'MAINTENANCE_LOG':
        const maintenanceTasks = await db.maintenanceTask.findMany({
          where: whereClause,
          include: {
            equipment: {
              select: { name: true, type: true },
            },
            assignee: {
              select: { name: true },
            },
          },
          orderBy: { scheduledDate: 'desc' },
        });

        reportData = {
          title: 'Maintenance Activities Log',
          period: { startDate, endDate },
          summary: {
            totalTasks: maintenanceTasks.length,
            completed: maintenanceTasks.filter((t) => t.status === 'COMPLETED').length,
            pending: maintenanceTasks.filter((t) => t.status === 'SCHEDULED').length,
            overdue: maintenanceTasks.filter((t) => t.status === 'OVERDUE').length,
          },
          tasks: maintenanceTasks.map((t) => ({
            equipment: t.equipment.name,
            equipmentType: t.equipment.type,
            type: t.type,
            priority: t.priority,
            status: t.status,
            assignee: t.assignee?.name,
            scheduledDate: t.scheduledDate,
            completedAt: t.completedAt,
          })),
        };
        break;

      default:
        return errorResponse('Invalid report type', 400);
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'REPORT_GENERATE',
        resourceType: 'REPORT',
        resourceId: reportType,
        newValues: { reportType, dateRange, millId },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    // Return in requested format
    if (format === 'CSV') {
      // TODO: Convert to CSV format
      return successResponse({ ...reportData, format: 'CSV' });
    } else if (format === 'PDF') {
      // TODO: Generate PDF
      return successResponse({ ...reportData, format: 'PDF', note: 'PDF generation coming soon' });
    } else {
      return successResponse(reportData);
    }
  } catch (error) {
    return handleApiError(error);
  }
}
