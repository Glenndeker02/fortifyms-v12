import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const acknowledgeAlertSchema = z.object({
  userId: z.string(),
  notes: z.string().optional(),
});

// POST /api/alerts/[id]/acknowledge - Acknowledge an alert
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const alertId = params.id;
    const body = await request.json();
    const { userId, notes } = acknowledgeAlertSchema.parse(body);

    // Verify user exists and has permission
    const user = await db.user.findUnique({
      where: { id: userId, isActive: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 404 }
      );
    }

    // Get the alert
    const alert = await db.alert.findUnique({
      where: { id: alertId },
      include: {
        notifications: {
          where: { userId }
        }
      }
    });

    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to acknowledge this alert
    const hasPermission = await checkAcknowledgePermission(user, alert);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to acknowledge this alert' },
        { status: 403 }
      );
    }

    // Update alert acknowledgment
    const updatedAlert = await db.alert.update({
      where: { id: alertId },
      data: {
        isAcknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
        status: 'ACKNOWLEDGED'
      },
      include: {
        acknowledger: {
          select: {
            id: true,
            name: true,
            role: true
          }
        },
        mill: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    // Update notification status
    await Promise.all(
      alert.notifications.map(notification =>
        db.alertNotification.update({
          where: { id: notification.id },
          data: {
            readAt: new Date()
          }
        })
      )
    );

    // Log the acknowledgment
    await db.auditLog.create({
      data: {
        userId,
        action: 'ACKNOWLEDGE_ALERT',
        resourceType: 'ALERT',
        resourceId: alertId,
        newValues: JSON.stringify({
          acknowledgedAt: new Date(),
          acknowledgedBy: userId,
          notes
        })
      }
    });

    // Check if escalation should be triggered based on acknowledgment timing
    await checkEscalationTriggers(alertId, 'ACKNOWLEDGMENT');

    return NextResponse.json({
      alert: updatedAlert,
      message: 'Alert acknowledged successfully'
    });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to acknowledge alert' },
      { status: 500 }
    );
  }
}

async function checkAcknowledgePermission(user: any, alert: any): Promise<boolean> {
  // FWGA users can acknowledge any alert
  if (user.role === 'FWGA_INSPECTOR' || user.role === 'FWGA_PROGRAM_MANAGER') {
    return true;
  }

  // Mill users can acknowledge alerts for their mill
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

async function checkEscalationTriggers(alertId: string, triggerType: string) {
  const alert = await db.alert.findUnique({
    where: { id: alertId },
    include: {
      escalations: {
        orderBy: { level: 'desc' },
        take: 1
      }
    }
  });

  if (!alert) return;

  // Check if acknowledgment is late (based on severity)
  const now = new Date();
  const acknowledgmentThresholds = {
    CRITICAL: 30 * 60 * 1000, // 30 minutes
    HIGH: 2 * 60 * 60 * 1000, // 2 hours
    MEDIUM: 8 * 60 * 60 * 1000, // 8 hours
    LOW: 24 * 60 * 60 * 1000, // 24 hours
  };

  const threshold = acknowledgmentThresholds[alert.severity as keyof typeof acknowledgmentThresholds];
  const timeSinceCreation = now.getTime() - alert.createdAt.getTime();

  if (timeSinceCreation > threshold) {
    // Trigger escalation for late acknowledgment
    await triggerEscalation(alertId, 'NO_ACKNOWLEDGMENT', `Alert acknowledged ${Math.round(timeSinceCreation / (60 * 60 * 1000))} hours after creation`);
  }
}

async function triggerEscalation(alertId: string, reason: string, notes?: string) {
  const alert = await db.alert.findUnique({
    where: { id: alertId },
    include: {
      escalations: {
        orderBy: { level: 'desc' },
        take: 1
      }
    }
  });

  if (!alert) return;

  const currentLevel = alert.escalations[0]?.level || 0;
  const nextLevel = currentLevel + 1;

  // Define escalation paths based on alert type
  const escalationPaths = {
    QC_FAILURE: [
      { role: 'MILL_MANAGER', delay: 2 * 60 * 60 * 1000 }, // 2 hours
      { role: 'FWGA_INSPECTOR', delay: 24 * 60 * 60 * 1000 }, // 24 hours
      { role: 'FWGA_PROGRAM_MANAGER', delay: 72 * 60 * 60 * 1000 } // 72 hours
    ],
    CRITICAL_NON_COMPLIANCE: [
      { role: 'FWGA_INSPECTOR', delay: 24 * 60 * 60 * 1000 }, // 24 hours
      { role: 'FWGA_PROGRAM_MANAGER', delay: 72 * 60 * 60 * 1000 } // 72 hours
    ],
    // Add other alert types as needed
  };

  const path = escalationPaths[alert.type as keyof typeof escalationPaths];
  if (!path || nextLevel >= path.length) return;

  const nextRecipient = path[nextLevel];

  // Find users at the next escalation level
  const recipients = await db.user.findMany({
    where: {
      role: nextRecipient.role,
      isActive: true,
      ...(alert.millId && nextRecipient.role !== 'FWGA_INSPECTOR' && nextRecipient.role !== 'FWGA_PROGRAM_MANAGER' 
        ? { millId: alert.millId } 
        : {})
    }
  });

  // Create escalation records
  await Promise.all(
    recipients.map(recipient =>
      db.alertEscalation.create({
        data: {
          alertId,
          fromUserId: alert.acknowledgedBy,
          toUserId: recipient.id,
          level: nextLevel,
          reason: reason as any,
          triggerCondition: JSON.stringify({
            triggerType,
            currentLevel,
            nextLevel,
            notes
          }),
          notes
        }
      })
    )
  );

  // Create notifications for escalated users
  await Promise.all(
    recipients.map(recipient =>
      db.alertNotification.create({
        data: {
          alertId,
          userId: recipient.id,
          channel: 'EMAIL', // Escalations always use email
          content: JSON.stringify({
            title: `ESCALATED: ${alert.title}`,
            message: `Alert has been escalated to ${recipient.role}. ${notes || ''}`,
            severity: alert.severity,
            escalationLevel: nextLevel,
            responseUrl: `${process.env.NEXT_PUBLIC_APP_URL}/alerts/${alertId}`
          }),
          responseUrl: `${process.env.NEXT_PUBLIC_APP_URL}/alerts/${alertId}`
        }
      })
    )
  );

  // Update alert status
  await db.alert.update({
    where: { id: alertId },
    data: { status: 'ESCALATED' }
  });
}