import nodemailer from 'nodemailer';
import { db } from './db';
import { NOTIFICATION_TYPES } from './constants';

/**
 * Notification Service
 *
 * Comprehensive notification system for email, SMS, push, and in-app notifications.
 * Supports real-time alerts for QC failures, compliance issues, maintenance, and procurement.
 *
 * Reference: TODO.md Phase 2, newprd.md Module 3.6 (Alerts & Notifications)
 */

/**
 * Notification Payload Types
 */
export interface EmailNotificationPayload {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: {
    filename: string;
    content?: Buffer | string;
    path?: string;
  }[];
}

export interface SMSNotificationPayload {
  to: string | string[];
  message: string;
}

export interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  actions?: {
    action: string;
    title: string;
    icon?: string;
  }[];
}

export interface InAppNotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  link?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Notification Result
 */
export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Email Service Configuration
 */
const createEmailTransporter = () => {
  // In production, use environment variables for SMTP configuration
  if (!process.env.SMTP_HOST) {
    console.warn('SMTP configuration not found. Email notifications will be logged only.');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

const emailTransporter = createEmailTransporter();

/**
 * Send Email Notification
 *
 * @param payload - Email notification payload
 * @returns Notification result
 */
export async function sendEmail(payload: EmailNotificationPayload): Promise<NotificationResult> {
  try {
    if (!emailTransporter) {
      // Development fallback: log email instead of sending
      console.log('📧 Email Notification (Dev Mode):', {
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      });

      return {
        success: true,
        messageId: `dev-${Date.now()}`,
      };
    }

    const info = await emailTransporter.sendMail({
      from: process.env.SMTP_FROM || 'FortifyMIS <noreply@fortifymis.com>',
      to: Array.isArray(payload.to) ? payload.to.join(', ') : payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      attachments: payload.attachments,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error('Email notification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send SMS Notification
 *
 * @param payload - SMS notification payload
 * @returns Notification result
 */
export async function sendSMS(payload: SMSNotificationPayload): Promise<NotificationResult> {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      // Development fallback: log SMS instead of sending
      console.log('📱 SMS Notification (Dev Mode):', {
        to: payload.to,
        message: payload.message,
      });

      return {
        success: true,
        messageId: `dev-sms-${Date.now()}`,
      };
    }

    // TODO: Integrate with Twilio or Africa's Talking for production
    // Example with Twilio:
    // const twilio = require('twilio');
    // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    //
    // const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
    // const results = await Promise.all(
    //   recipients.map(to =>
    //     client.messages.create({
    //       body: payload.message,
    //       from: process.env.TWILIO_PHONE_NUMBER,
    //       to: to,
    //     })
    //   )
    // );

    return {
      success: true,
      messageId: `sms-${Date.now()}`,
    };
  } catch (error) {
    console.error('SMS notification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send Push Notification
 *
 * @param payload - Push notification payload
 * @returns Notification result
 */
export async function sendPushNotification(
  payload: PushNotificationPayload
): Promise<NotificationResult> {
  try {
    // Fetch user's push subscription from database
    const subscriptions = await db.pushSubscription.findMany({
      where: {
        userId: payload.userId,
        enabled: true,
      },
    });

    if (subscriptions.length === 0) {
      return {
        success: false,
        error: 'No push subscriptions found for user',
      };
    }

    // TODO: Implement Web Push using web-push library
    // Example:
    // const webpush = require('web-push');
    //
    // webpush.setVapidDetails(
    //   process.env.VAPID_SUBJECT || 'mailto:support@fortifymis.com',
    //   process.env.VAPID_PUBLIC_KEY,
    //   process.env.VAPID_PRIVATE_KEY
    // );
    //
    // const pushPayload = JSON.stringify({
    //   title: payload.title,
    //   body: payload.body,
    //   icon: payload.icon,
    //   badge: payload.badge,
    //   data: payload.data,
    //   actions: payload.actions,
    // });
    //
    // const results = await Promise.all(
    //   subscriptions.map(sub =>
    //     webpush.sendNotification(JSON.parse(sub.subscription), pushPayload)
    //   )
    // );

    console.log('🔔 Push Notification (Dev Mode):', {
      userId: payload.userId,
      title: payload.title,
      body: payload.body,
      subscriptionCount: subscriptions.length,
    });

    return {
      success: true,
      messageId: `push-${Date.now()}`,
    };
  } catch (error) {
    console.error('Push notification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create In-App Notification
 *
 * @param payload - In-app notification payload
 * @returns Notification result
 */
export async function createInAppNotification(
  payload: InAppNotificationPayload
): Promise<NotificationResult> {
  try {
    const notification = await db.notification.create({
      data: {
        userId: payload.userId,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        priority: payload.priority,
        link: payload.link,
        metadata: payload.metadata || {},
        read: false,
      },
    });

    return {
      success: true,
      messageId: notification.id,
    };
  } catch (error) {
    console.error('In-app notification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send Multi-Channel Notification
 *
 * @param channels - Notification channels to use
 * @param payloads - Payloads for each channel
 * @returns Results for each channel
 */
export async function sendMultiChannelNotification(config: {
  email?: EmailNotificationPayload;
  sms?: SMSNotificationPayload;
  push?: PushNotificationPayload;
  inApp?: InAppNotificationPayload;
}): Promise<{
  email?: NotificationResult;
  sms?: NotificationResult;
  push?: NotificationResult;
  inApp?: NotificationResult;
}> {
  const results: {
    email?: NotificationResult;
    sms?: NotificationResult;
    push?: NotificationResult;
    inApp?: NotificationResult;
  } = {};

  // Send all notifications in parallel
  const promises: Promise<void>[] = [];

  if (config.email) {
    promises.push(
      sendEmail(config.email).then((result) => {
        results.email = result;
      })
    );
  }

  if (config.sms) {
    promises.push(
      sendSMS(config.sms).then((result) => {
        results.sms = result;
      })
    );
  }

  if (config.push) {
    promises.push(
      sendPushNotification(config.push).then((result) => {
        results.push = result;
      })
    );
  }

  if (config.inApp) {
    promises.push(
      createInAppNotification(config.inApp).then((result) => {
        results.inApp = result;
      })
    );
  }

  await Promise.all(promises);

  return results;
}

/**
 * Pre-configured Alert Notifications
 * Based on: newprd.md Module 3.6 (Alert Types)
 */

/**
 * Send QC Failure Alert
 *
 * @param params - QC failure parameters
 */
export async function sendQCFailureAlert(params: {
  batchId: string;
  millId: string;
  millName: string;
  testType: string;
  failureReason: string;
  recipientEmails: string[];
  recipientPhones?: string[];
  operatorUserId?: string;
  managerUserId?: string;
}) {
  const subject = `🚨 QC Failure Alert - Batch ${params.batchId}`;
  const message = `
QC Test Failed at ${params.millName}

Batch ID: ${params.batchId}
Test Type: ${params.testType}
Failure Reason: ${params.failureReason}

Immediate action required. Please review the batch and take corrective measures.
  `.trim();

  const html = `
    <h2 style="color: #dc2626;">🚨 QC Failure Alert</h2>
    <p><strong>Mill:</strong> ${params.millName}</p>
    <p><strong>Batch ID:</strong> ${params.batchId}</p>
    <p><strong>Test Type:</strong> ${params.testType}</p>
    <p><strong>Failure Reason:</strong> ${params.failureReason}</p>
    <hr />
    <p style="color: #dc2626;"><strong>Immediate action required.</strong> Please review the batch and take corrective measures.</p>
  `;

  await sendMultiChannelNotification({
    email: {
      to: params.recipientEmails,
      subject,
      text: message,
      html,
    },
    sms: params.recipientPhones
      ? {
          to: params.recipientPhones,
          message: `QC FAILURE: Batch ${params.batchId} at ${params.millName}. ${params.testType} failed. Immediate action required.`,
        }
      : undefined,
    inApp: params.operatorUserId
      ? {
          userId: params.operatorUserId,
          title: subject,
          message,
          type: 'ERROR',
          priority: 'CRITICAL',
          link: `/batches/${params.batchId}`,
        }
      : undefined,
  });
}

/**
 * Send Premix Inventory Low Alert
 *
 * @param params - Inventory alert parameters
 */
export async function sendPremixInventoryAlert(params: {
  millId: string;
  millName: string;
  currentStock: number;
  reorderPoint: number;
  daysRemaining: number;
  recipientEmails: string[];
  managerUserId?: string;
}) {
  const subject = `⚠️ Low Premix Inventory - ${params.millName}`;
  const message = `
Premix inventory is running low at ${params.millName}

Current Stock: ${params.currentStock} kg
Reorder Point: ${params.reorderPoint} kg
Estimated Days Remaining: ${params.daysRemaining} days

Please reorder premix to avoid production disruptions.
  `.trim();

  const html = `
    <h2 style="color: #f59e0b;">⚠️ Low Premix Inventory Alert</h2>
    <p><strong>Mill:</strong> ${params.millName}</p>
    <p><strong>Current Stock:</strong> ${params.currentStock} kg</p>
    <p><strong>Reorder Point:</strong> ${params.reorderPoint} kg</p>
    <p><strong>Estimated Days Remaining:</strong> ${params.daysRemaining} days</p>
    <hr />
    <p style="color: #f59e0b;"><strong>Action required:</strong> Please reorder premix to avoid production disruptions.</p>
  `;

  await sendMultiChannelNotification({
    email: {
      to: params.recipientEmails,
      subject,
      text: message,
      html,
    },
    inApp: params.managerUserId
      ? {
          userId: params.managerUserId,
          title: subject,
          message,
          type: 'WARNING',
          priority: 'HIGH',
          link: `/inventory/premix`,
        }
      : undefined,
  });
}

/**
 * Send Maintenance Due Alert
 *
 * @param params - Maintenance alert parameters
 */
export async function sendMaintenanceDueAlert(params: {
  taskId: string;
  equipmentName: string;
  millName: string;
  dueDate: Date;
  isOverdue: boolean;
  recipientEmails: string[];
  assignedUserId?: string;
}) {
  const status = params.isOverdue ? 'OVERDUE' : 'DUE SOON';
  const subject = `${params.isOverdue ? '🔴' : '🟡'} Maintenance ${status} - ${params.equipmentName}`;
  const message = `
Maintenance ${status.toLowerCase()} for ${params.equipmentName} at ${params.millName}

Equipment: ${params.equipmentName}
Due Date: ${params.dueDate.toLocaleDateString()}
Status: ${status}

${params.isOverdue ? 'This task is overdue. Please complete immediately.' : 'Please schedule this maintenance task.'}
  `.trim();

  const html = `
    <h2 style="color: ${params.isOverdue ? '#dc2626' : '#f59e0b'};">${params.isOverdue ? '🔴' : '🟡'} Maintenance ${status}</h2>
    <p><strong>Equipment:</strong> ${params.equipmentName}</p>
    <p><strong>Mill:</strong> ${params.millName}</p>
    <p><strong>Due Date:</strong> ${params.dueDate.toLocaleDateString()}</p>
    <p><strong>Status:</strong> ${status}</p>
    <hr />
    <p style="color: ${params.isOverdue ? '#dc2626' : '#f59e0b'};">
      ${params.isOverdue ? '<strong>This task is overdue. Please complete immediately.</strong>' : 'Please schedule this maintenance task.'}
    </p>
  `;

  await sendMultiChannelNotification({
    email: {
      to: params.recipientEmails,
      subject,
      text: message,
      html,
    },
    inApp: params.assignedUserId
      ? {
          userId: params.assignedUserId,
          title: subject,
          message,
          type: params.isOverdue ? 'ERROR' : 'WARNING',
          priority: params.isOverdue ? 'HIGH' : 'MEDIUM',
          link: `/maintenance/${params.taskId}`,
        }
      : undefined,
  });
}

/**
 * Send Compliance Audit Reminder
 *
 * @param params - Compliance audit parameters
 */
export async function sendComplianceAuditReminder(params: {
  auditId: string;
  millName: string;
  scheduledDate: Date;
  daysUntilAudit: number;
  recipientEmails: string[];
  managerUserId?: string;
}) {
  const subject = `📋 Compliance Audit Reminder - ${params.millName}`;
  const message = `
Upcoming compliance audit for ${params.millName}

Scheduled Date: ${params.scheduledDate.toLocaleDateString()}
Days Until Audit: ${params.daysUntilAudit}

Please ensure all documentation and records are up to date.
  `.trim();

  const html = `
    <h2 style="color: #3b82f6;">📋 Compliance Audit Reminder</h2>
    <p><strong>Mill:</strong> ${params.millName}</p>
    <p><strong>Scheduled Date:</strong> ${params.scheduledDate.toLocaleDateString()}</p>
    <p><strong>Days Until Audit:</strong> ${params.daysUntilAudit}</p>
    <hr />
    <p>Please ensure all documentation and records are up to date before the audit date.</p>
  `;

  await sendMultiChannelNotification({
    email: {
      to: params.recipientEmails,
      subject,
      text: message,
      html,
    },
    inApp: params.managerUserId
      ? {
          userId: params.managerUserId,
          title: subject,
          message,
          type: 'INFO',
          priority: 'MEDIUM',
          link: `/compliance/audits/${params.auditId}`,
        }
      : undefined,
  });
}

/**
 * Send RFP Notification to Mills
 *
 * @param params - RFP notification parameters
 */
export async function sendRFPNotification(params: {
  rfpId: string;
  buyerName: string;
  commodity: string;
  quantity: number;
  deadline: Date;
  recipientEmails: string[];
  millUserIds?: string[];
}) {
  const subject = `📢 New RFP: ${params.commodity} - ${params.quantity} MT`;
  const message = `
New Request for Proposal (RFP) from ${params.buyerName}

Commodity: ${params.commodity}
Quantity: ${params.quantity} MT
Submission Deadline: ${params.deadline.toLocaleDateString()}

Submit your bid to participate in this procurement opportunity.
  `.trim();

  const html = `
    <h2 style="color: #10b981;">📢 New Request for Proposal (RFP)</h2>
    <p><strong>Buyer:</strong> ${params.buyerName}</p>
    <p><strong>Commodity:</strong> ${params.commodity}</p>
    <p><strong>Quantity:</strong> ${params.quantity} MT</p>
    <p><strong>Submission Deadline:</strong> ${params.deadline.toLocaleDateString()}</p>
    <hr />
    <p>Submit your bid to participate in this procurement opportunity.</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/procurement/rfps/${params.rfpId}" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View RFP Details</a></p>
  `;

  await sendMultiChannelNotification({
    email: {
      to: params.recipientEmails,
      subject,
      text: message,
      html,
    },
  });

  // Send in-app notifications to mill users
  if (params.millUserIds && params.millUserIds.length > 0) {
    await Promise.all(
      params.millUserIds.map((userId) =>
        createInAppNotification({
          userId,
          title: subject,
          message,
          type: 'INFO',
          priority: 'MEDIUM',
          link: `/procurement/rfps/${params.rfpId}`,
        })
      )
    );
  }
}

/**
 * Mark In-App Notification as Read
 *
 * @param notificationId - Notification ID
 * @param userId - User ID (for authorization)
 */
export async function markNotificationAsRead(notificationId: string, userId: string) {
  try {
    await db.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Mark notification as read error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Mark All Notifications as Read for User
 *
 * @param userId - User ID
 */
export async function markAllNotificationsAsRead(userId: string) {
  try {
    await db.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get Unread Notification Count for User
 *
 * @param userId - User ID
 * @returns Unread count
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    return await db.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  } catch (error) {
    console.error('Get unread notification count error:', error);
    return 0;
  }
}

/**
 * Delete Notification
 *
 * @param notificationId - Notification ID
 * @param userId - User ID (for authorization)
 */
export async function deleteNotification(notificationId: string, userId: string) {
  try {
    await db.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Delete notification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
