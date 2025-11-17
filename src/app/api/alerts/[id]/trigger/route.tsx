import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { AlertType, AlertCategory, AlertSeverity } from '@prisma/client';

const triggerAlertSchema = z.object({
  triggerType: z.enum([
    'QC_FAILURE',
    'CONTAMINATION_RISK', 
    'PREMIX_EXPIRY',
    'COMPLIANCE_FAILURE',
    'CALIBRATION_DUE',
    'EQUIPMENT_DRIFT',
    'PREMIX_USAGE_ANOMALY',
    'LOW_INVENTORY',
    'PRODUCTION_MISS',
    'TRAINING_OVERDUE'
  ]),
  sourceId: z.string(),
  sourceType: z.string(),
  millId: z.string().optional(),
  data: z.object({}).optional(), // Additional trigger data
});

// POST /api/alerts/trigger - Trigger an alert based on system events
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { triggerType, sourceId, sourceType, millId, data } = triggerAlertSchema.parse(body);

    // Get alert template or create alert based on trigger type
    const alertConfig = getAlertConfig(triggerType, data);
    
    // Create the alert
    const alert = await db.alert.create({
      data: {
        type: alertConfig.type,
        category: alertConfig.category,
        severity: alertConfig.severity,
        title: alertConfig.title,
        message: alertConfig.message,
        summary: alertConfig.summary,
        actionRequired: alertConfig.actionRequired,
        deadline: alertConfig.deadline,
        sourceType,
        sourceId,
        millId,
        details: JSON.stringify(data || {}),
        triggerCondition: JSON.stringify({
          triggerType,
          timestamp: new Date().toISOString(),
          data
        })
      }
    });

    // Determine recipients and create notifications
    const recipients = await determineRecipients(alertConfig.type, alertConfig.severity, millId, sourceType, sourceId);
    
    await Promise.all(
      recipients.map(async (recipient) => {
        const channels = determineNotificationChannels(alertConfig.severity, recipient.role);
        
        return Promise.all(
          channels.map(channel =>
            db.alertNotification.create({
              data: {
                alertId: alert.id,
                userId: recipient.id,
                channel,
                content: JSON.stringify({
                  title: alert.title,
                  message: alert.message,
                  severity: alert.severity,
                  actionRequired: alert.actionRequired,
                  deadline: alert.deadline,
                  responseUrl: generateResponseUrl(alert, sourceType, sourceId)
                }),
                responseUrl: generateResponseUrl(alert, sourceType, sourceId)
              }
            })
          )
        );
      })
    );

    // Trigger immediate notification delivery for critical alerts
    if (alertConfig.severity === 'CRITICAL') {
      await triggerImmediateDelivery(alert.id);
    }

    // Log the trigger
    await db.auditLog.create({
      data: {
        action: 'TRIGGER_ALERT',
        resourceType: 'ALERT',
        resourceId: alert.id,
        newValues: JSON.stringify({
          triggerType,
          sourceType,
          sourceId,
          millId,
          alertConfig
        })
      }
    });

    return NextResponse.json({
      alert,
      message: 'Alert triggered successfully',
      recipientsNotified: recipients.length
    }, { status: 201 });
  } catch (error) {
    console.error('Error triggering alert:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to trigger alert' },
      { status: 500 }
    );
  }
}

function getAlertConfig(triggerType: string, data?: any) {
  const configs = {
    QC_FAILURE: {
      type: AlertType.QC_FAILURE,
      category: AlertCategory.QUALITY_SAFETY,
      severity: AlertSeverity.CRITICAL,
      title: 'QC Test Failure - Immediate Action Required',
      message: `Batch ${data?.batchId || 'Unknown'} has failed quality control testing. Immediate investigation and corrective action required.`,
      summary: 'QC test results out of specification',
      actionRequired: 'Investigate root cause and implement corrective action within 24 hours',
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    },
    CONTAMINATION_RISK: {
      type: AlertType.CONTAMINATION_RISK,
      category: AlertCategory.QUALITY_SAFETY,
      severity: AlertSeverity.CRITICAL,
      title: 'Contamination Risk Detected',
      message: `Contamination risk identified in batch ${data?.batchId || 'Unknown'}. Batch must be quarantined immediately.`,
      summary: 'Foreign matter or dangerous moisture level detected',
      actionRequired: 'Quarantine batch and investigate contamination source',
      deadline: new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours
    },
    PREMIX_EXPIRY: {
      type: AlertType.PREMIX_EXPIRY,
      category: AlertCategory.QUALITY_SAFETY,
      severity: AlertSeverity.HIGH,
      title: 'Premix Expiry Alert',
      message: `Premix batch ${data?.premixBatchId || 'Unknown'} is nearing or has passed its expiry date.`,
      summary: 'Premix expiration requires immediate attention',
      actionRequired: 'Stop using expired premix and source replacement',
      deadline: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
    },
    COMPLIANCE_FAILURE: {
      type: AlertType.CRITICAL_NON_COMPLIANCE,
      category: AlertCategory.COMPLIANCE,
      severity: AlertSeverity.HIGH,
      title: 'Critical Non-Compliance Detected',
      message: `Compliance audit has identified critical failures that require immediate attention.`,
      summary: 'Audit results show critical non-compliance issues',
      actionRequired: 'Develop and implement corrective action plan within 7 days',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    },
    CALIBRATION_DUE: {
      type: AlertType.CALIBRATION_DUE,
      category: AlertCategory.MAINTENANCE,
      severity: AlertSeverity.MEDIUM,
      title: 'Equipment Calibration Due',
      message: `Equipment ${data?.equipmentName || 'Unknown'} requires calibration within 14 days.`,
      summary: 'Scheduled maintenance calibration required',
      actionRequired: 'Schedule equipment calibration',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
    },
    EQUIPMENT_DRIFT: {
      type: AlertType.EQUIPMENT_DRIFT,
      category: AlertCategory.MAINTENANCE,
      severity: AlertSeverity.HIGH,
      title: 'Equipment Drift Detected',
      message: `Sensor data indicates equipment drift for ${data?.equipmentName || 'Unknown'}. Output variance >5% detected.`,
      summary: 'Equipment performance drifting from calibration',
      actionRequired: 'Investigate and recalibrate equipment immediately',
      deadline: new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours
    },
    PREMIX_USAGE_ANOMALY: {
      type: AlertType.PREMIX_USAGE_ANOMALY,
      category: AlertCategory.PRODUCTION,
      severity: AlertSeverity.MEDIUM,
      title: 'Premix Usage Anomaly Detected',
      message: `Actual premix usage differs from expected by ${data?.variance || 'Unknown'}%.`,
      summary: 'Unusual premix consumption pattern detected',
      actionRequired: 'Verify measurements and check for equipment issues',
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    },
    LOW_INVENTORY: {
      type: AlertType.LOW_PREMIX_INVENTORY,
      category: AlertCategory.PRODUCTION,
      severity: AlertSeverity.MEDIUM,
      title: 'Low Premix Inventory',
      message: `Premix inventory is below reorder threshold. Current stock: ${data?.currentStock || 'Unknown'}`,
      summary: 'Inventory levels require replenishment',
      actionRequired: 'Place order for premix replenishment',
      deadline: new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 hours
    },
    PRODUCTION_MISS: {
      type: AlertType.PRODUCTION_TARGET_MISS,
      category: AlertCategory.PRODUCTION,
      severity: AlertSeverity.MEDIUM,
      title: 'Production Target Missed',
      message: `Daily production target missed. Achieved: ${data?.actual || 'Unknown'}%, Target: ${data?.target || 'Unknown'}%`,
      summary: 'Production below target for the day',
      actionRequired: 'Review production issues and adjust plan',
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    },
    TRAINING_OVERDUE: {
      type: AlertType.TRAINING_OVERDUE,
      category: AlertCategory.TRAINING_COMPLIANCE,
      severity: AlertSeverity.LOW,
      title: 'Training Overdue',
      message: `Mandatory training "${data?.courseName || 'Unknown'}" is overdue.`,
      summary: 'Required training not completed on time',
      actionRequired: 'Complete overdue training module',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }
  };

  return configs[triggerType as keyof typeof configs] || {
    type: AlertType.QC_FAILURE,
    category: AlertCategory.QUALITY_SAFETY,
    severity: AlertSeverity.MEDIUM,
    title: 'System Alert',
    message: 'An alert has been triggered.',
    summary: 'System-generated alert',
    actionRequired: 'Review alert details',
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000)
  };
}

async function determineRecipients(type: AlertType, severity: AlertSeverity, millId?: string, sourceType?: string, sourceId?: string) {
  const recipients: any[] = [];

  // Get mill information if available
  const mill = millId ? await db.mill.findUnique({
    where: { id: millId },
    include: {
      users: {
        where: { isActive: true }
      }
    }
  }) : null;

  // Define recipient rules based on alert type
  switch (type) {
    case AlertType.QC_FAILURE:
    case AlertType.CONTAMINATION_RISK:
      if (mill) {
        const operator = mill.users.find(u => u.role === 'MILL_OPERATOR');
        const manager = mill.users.find(u => u.role === 'MILL_MANAGER');
        if (operator) recipients.push(operator);
        if (manager) recipients.push(manager);
      }
      const fWGAOfficers = await db.user.findMany({
        where: { 
          role: { in: ['FWGA_INSPECTOR', 'FWGA_PROGRAM_MANAGER'] },
          isActive: true 
        }
      });
      recipients.push(...fWGAOfficers);
      break;

    case AlertType.CRITICAL_NON_COMPLIANCE:
    case AlertType.COMPLIANCE_SCORE_DROP:
    case AlertType.CERTIFICATION_EXPIRY:
      if (mill) {
        const manager = mill.users.find(u => u.role === 'MILL_MANAGER');
        if (manager) recipients.push(manager);
      }
      const inspectors = await db.user.findMany({
        where: { 
          role: { in: ['FWGA_INSPECTOR', 'FWGA_PROGRAM_MANAGER'] },
          isActive: true 
        }
      });
      recipients.push(...inspectors);
      break;

    case AlertType.CALIBRATION_DUE:
    case AlertType.CALIBRATION_OVERDUE:
    case AlertType.EQUIPMENT_DRIFT:
      if (mill) {
        const maintenanceStaff = mill.users.filter(u => 
          u.role === 'MILL_OPERATOR' || u.role === 'MILL_MANAGER'
        );
        recipients.push(...maintenanceStaff);
      }
      break;

    case AlertType.PREMIX_USAGE_ANOMALY:
    case AlertType.LOW_PREMIX_INVENTORY:
    case AlertType.PRODUCTION_TARGET_MISS:
      if (mill) {
        const productionStaff = mill.users.filter(u => 
          u.role === 'MILL_OPERATOR' || u.role === 'MILL_MANAGER'
        );
        recipients.push(...productionStaff);
      }
      break;

    case AlertType.NEW_RFP_MATCH:
    case AlertType.BID_DEADLINE_APPROACHING:
      if (mill) {
        const manager = mill.users.find(u => u.role === 'MILL_MANAGER');
        if (manager) recipients.push(manager);
      }
      break;

    case AlertType.TRAINING_OVERDUE:
    case AlertType.NEW_TRAINING_AVAILABLE:
      // These would be handled based on specific user data
      break;
  }

  return recipients.filter((recipient, index, self) => 
    index === self.findIndex(r => r.id === recipient.id)
  );
}

function determineNotificationChannels(severity: AlertSeverity, userRole: string) {
  const channels = ['IN_SYSTEM'];

  switch (severity) {
    case 'CRITICAL':
      channels.push('PUSH', 'SMS', 'EMAIL');
      break;
    case 'HIGH':
      channels.push('PUSH', 'EMAIL');
      break;
    case 'MEDIUM':
      channels.push('PUSH', 'EMAIL');
      break;
    case 'LOW':
      channels.push('EMAIL');
      break;
  }

  return channels;
}

function generateResponseUrl(alert: any, sourceType: string, sourceId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  switch (sourceType) {
    case 'QC_TEST':
    case 'BATCH_LOG':
      return `${baseUrl}/production/batches/${sourceId}`;
    case 'COMPLIANCE_AUDIT':
      return `${baseUrl}/compliance/audits/${sourceId}`;
    case 'MAINTENANCE':
      return `${baseUrl}/maintenance/equipment/${sourceId}`;
    case 'PROCUREMENT':
      return `${baseUrl}/procurement/rfps/${sourceId}`;
    case 'TRAINING':
      return `${baseUrl}/training/courses/${sourceId}`;
    default:
      return `${baseUrl}/alerts/${alert.id}`;
  }
}

async function triggerImmediateDelivery(alertId: string) {
  const notifications = await db.alertNotification.findMany({
    where: { alertId, status: 'PENDING' }
  });

  // In a real implementation, this would trigger background jobs
  // For now, we'll mark them as sent immediately
  await Promise.all(
    notifications.map(notification =>
      db.alertNotification.update({
        where: { id: notification.id },
        data: {
          status: 'SENT',
          sentAt: new Date()
        }
      })
    )
  );
}