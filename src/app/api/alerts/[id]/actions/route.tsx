import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { ActionType, ActionStatus } from '@prisma/client';

const createActionSchema = z.object({
  userId: z.string(),
  actionType: z.nativeEnum(ActionType),
  description: z.string().min(1),
  dueDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  evidence: z.string().optional(),
  metadata: z.string().optional(),
});

const updateActionSchema = z.object({
  status: z.nativeEnum(ActionStatus).optional(),
  notes: z.string().optional(),
  evidence: z.string().optional(),
  completedAt: z.string().datetime().optional(),
});

// GET /api/alerts/[id]/actions - Get all actions for an alert
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const alertId = params.id;

    const actions = await db.alertAction.findMany({
      where: { alertId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ actions });
  } catch (error) {
    console.error('Error fetching alert actions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alert actions' },
      { status: 500 }
    );
  }
}

// POST /api/alerts/[id]/actions - Create a new action for an alert
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const alertId = params.id;
    const body = await request.json();
    const validatedData = createActionSchema.parse(body);

    // Verify user exists and has permission
    const user = await db.user.findUnique({
      where: { id: validatedData.userId, isActive: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 404 }
      );
    }

    // Get the alert
    const alert = await db.alert.findUnique({
      where: { id: alertId }
    });

    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to create actions for this alert
    const hasPermission = await checkActionPermission(user, alert);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create actions for this alert' },
        { status: 403 }
      );
    }

    // Create the action
    const action = await db.alertAction.create({
      data: {
        alertId,
        userId: validatedData.userId,
        actionType: validatedData.actionType,
        description: validatedData.description,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        notes: validatedData.notes || null,
        evidence: validatedData.evidence || null,
        metadata: validatedData.metadata || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Log the action creation
    await db.auditLog.create({
      data: {
        userId: validatedData.userId,
        action: 'CREATE_ALERT_ACTION',
        resourceType: 'ALERT_ACTION',
        resourceId: action.id,
        newValues: JSON.stringify({
          alertId,
          actionType: validatedData.actionType,
          description: validatedData.description
        })
      }
    });

    // If this is a corrective action, update alert status
    if (validatedData.actionType === 'CORRECTIVE_ACTION') {
      await db.alert.update({
        where: { id: alertId },
        data: { status: 'ACKNOWLEDGED' }
      });
    }

    return NextResponse.json({
      action,
      message: 'Action created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating alert action:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create alert action' },
      { status: 500 }
    );
  }
}

async function checkActionPermission(user: any, alert: any): Promise<boolean> {
  // FWGA users can create actions for any alert
  if (user.role === 'FWGA_INSPECTOR' || user.role === 'FWGA_PROGRAM_MANAGER') {
    return true;
  }

  // Mill users can create actions for alerts in their mill
  if (user.millId && user.millId === alert.millId) {
    return true;
  }

  // Check if user has a direct notification for this alert
  const hasNotification = await db.alertNotification.findFirst({
    where: {
      alertId: alert.id,
      userId: user.id
    }
  });

  return !!hasNotification;
}