import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { 
  AlertType, 
  AlertCategory, 
  AlertSeverity, 
  AlertStatus,
  NotificationChannel,
  UserRole 
} from '@prisma/client';

// Create alert schema
const createAlertSchema = z.object({
  type: z.nativeEnum(AlertType),
  category: z.nativeEnum(AlertCategory),
  severity: z.nativeEnum(AlertSeverity),
  title: z.string().min(1),
  message: z.string().min(1),
  summary: z.string().optional(),
  details: z.string().optional(),
  actionRequired: z.string().optional(),
  deadline: z.string().datetime().optional(),
  sourceType: z.string(),
  sourceId: z.string().optional(),
  millId: z.string().optional(),
  metadata: z.string().optional(),
  triggerCondition: z.string().optional(),
});

// GET /api/alerts - Fetch alerts with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') as AlertStatus | null;
    const severity = searchParams.get('severity') as AlertSeverity | null;
    const category = searchParams.get('category') as AlertCategory | null;
    const millId = searchParams.get('millId');
    const userId = searchParams.get('userId');
    const isUnread = searchParams.get('isUnread') === 'true';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (category) where.category = category;
    if (millId) where.millId = millId;
    
    // Filter by user's alerts (either directly assigned or through their mill)
    if (userId) {
      const user = await db.user.findUnique({
        where: { id: userId },
        include: { mill: true }
      });

      if (user) {
        where.OR = [
          // Alerts where user is directly involved
          {
            notifications: {
              some: { userId }
            }
          },
          // Alerts for user's mill (if they have one)
          user.millId ? { millId: user.millId } : {},
          // FWGA users see all alerts
          user.role === 'FWGA_INSPECTOR' || user.role === 'FWGA_PROGRAM_MANAGER' ? {} : null
        ].filter(Boolean);
      }
    }

    if (isUnread) {
      where.isAcknowledged = false;
    }

    // Get alerts with pagination
    const [alerts, total] = await Promise.all([
      db.alert.findMany({
        where,
        include: {
          mill: {
            select: {
              id: true,
              name: true,
              code: true,
              country: true
            }
          },
          notifications: {
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
          },
          escalations: {
            include: {
              fromUser: {
                select: {
                  id: true,
                  name: true,
                  role: true
                }
              },
              toUser: {
                select: {
                  id: true,
                  name: true,
                  role: true
                }
              }
            },
            orderBy: {
              escalatedAt: 'desc'
            }
          },
          actions: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  role: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          },
          acknowledger: {
            select: {
              id: true,
              name: true,
              role: true
            }
          },
          resolver: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit,
      }),
      db.alert.count({ where })
    ]);

    return NextResponse.json({
      alerts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

// POST /api/alerts - Create a new alert
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createAlertSchema.parse(body);

    // Create the alert
    const alert = await db.alert.create({
      data: {
        ...validatedData,
        deadline: validatedData.deadline ? new Date(validatedData.deadline) : null,
        details: validatedData.details || null,
        metadata: validatedData.metadata || null,
        triggerCondition: validatedData.triggerCondition || null,
      },
      include: {
        mill: true,
        notifications: true,
        escalations: true,
        actions: true
      }
    });

    // Determine recipients based on alert type and severity
    const recipients = await determineAlertRecipients(
      validatedData.type,
      validatedData.severity,
      validatedData.millId,
      validatedData.sourceType,
      validatedData.sourceId
    );

    // Create notifications for recipients
    const notifications = await Promise.all(
      recipients.map(async (recipient) => {
        const channels = determineNotificationChannels(
          validatedData.severity,
          recipient.role
        );

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
                  responseUrl: generateResponseUrl(alert)
                }),
                responseUrl: generateResponseUrl(alert)
              }
            })
          )
        );
      })
    );

    // Trigger notification delivery
    await triggerNotificationDelivery(alert.id);

    return NextResponse.json({
      alert,
      notifications: notifications.flat()
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating alert:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    );
  }
}

// Helper functions
async function determineAlertRecipients(
  type: AlertType,
  severity: AlertSeverity,
  millId?: string,
  sourceType?: string,
  sourceId?: string
) {
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
    case 'QC_FAILURE':
    case 'CONTAMINATION_RISK':
      // Quality & Safety Alerts
      if (mill) {
        // Add operator, mill manager, QC supervisor
        const operator = mill.users.find(u => u.role === 'MILL_OPERATOR');
        const manager = mill.users.find(u => u.role === 'MILL_MANAGER');
        
        if (operator) recipients.push(operator);
        if (manager) recipients.push(manager);
      }
      
      // Add FWGA QA Officer
      const fWGAOfficers = await db.user.findMany({
        where: { 
          role: { in: ['FWGA_INSPECTOR', 'FWGA_PROGRAM_MANAGER'] },
          isActive: true 
        }
      });
      recipients.push(...fWGAOfficers);
      break;

    case 'CRITICAL_NON_COMPLIANCE':
    case 'COMPLIANCE_SCORE_DROP':
    case 'CERTIFICATION_EXPIRY':
      // Compliance Alerts
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

    case 'CALIBRATION_DUE':
    case 'CALIBRATION_OVERDUE':
    case 'EQUIPMENT_DRIFT':
      // Maintenance Alerts
      if (mill) {
        const maintenanceStaff = mill.users.filter(u => 
          u.role === 'MILL_OPERATOR' || u.role === 'MILL_MANAGER'
        );
        recipients.push(...maintenanceStaff);
      }
      break;

    case 'PREMIX_USAGE_ANOMALY':
    case 'LOW_PREMIX_INVENTORY':
    case 'PRODUCTION_TARGET_MISS':
      // Production Alerts
      if (mill) {
        const productionStaff = mill.users.filter(u => 
          u.role === 'MILL_OPERATOR' || u.role === 'MILL_MANAGER'
        );
        recipients.push(...productionStaff);
      }
      break;

    case 'NEW_RFP_MATCH':
    case 'BID_DEADLINE_APPROACHING':
      // Procurement Alerts
      if (mill) {
        const manager = mill.users.find(u => u.role === 'MILL_MANAGER');
        if (manager) recipients.push(manager);
      }
      break;

    case 'TRAINING_OVERDUE':
    case 'NEW_TRAINING_AVAILABLE':
      // Training Alerts - handled separately based on specific user
      break;
  }

  return recipients.filter((recipient, index, self) => 
    index === self.findIndex(r => r.id === recipient.id)
  );
}

function determineNotificationChannels(severity: AlertSeverity, userRole: UserRole): NotificationChannel[] {
  const channels: NotificationChannel[] = [NotificationChannel.IN_SYSTEM];

  switch (severity) {
    case 'CRITICAL':
      channels.push(NotificationChannel.PUSH, NotificationChannel.SMS, NotificationChannel.EMAIL);
      break;
    case 'HIGH':
      channels.push(NotificationChannel.PUSH, NotificationChannel.EMAIL);
      break;
    case 'MEDIUM':
      channels.push(NotificationChannel.PUSH, NotificationChannel.EMAIL);
      break;
    case 'LOW':
      channels.push(NotificationChannel.EMAIL);
      break;
  }

  return channels;
}

function generateResponseUrl(alert: any): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  switch (alert.type) {
    case 'QC_FAILURE':
    case 'CONTAMINATION_RISK':
      return `${baseUrl}/production/batches/${alert.sourceId}`;
    case 'CRITICAL_NON_COMPLIANCE':
    case 'COMPLIANCE_SCORE_DROP':
      return `${baseUrl}/compliance/audits/${alert.sourceId}`;
    case 'CALIBRATION_DUE':
    case 'CALIBRATION_OVERDUE':
    case 'EQUIPMENT_DRIFT':
      return `${baseUrl}/maintenance/equipment/${alert.sourceId}`;
    case 'NEW_RFP_MATCH':
      return `${baseUrl}/procurement/rfps/${alert.sourceId}`;
    default:
      return `${baseUrl}/alerts/${alert.id}`;
  }
}

async function triggerNotificationDelivery(alertId: string) {
  // This would typically be handled by a background job
  // For now, we'll mark notifications as sent immediately
  const notifications = await db.alertNotification.findMany({
    where: { alertId, status: 'PENDING' }
  });

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