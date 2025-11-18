/**
 * Alerts, Notifications & Escalation Engine
 *
 * This module provides comprehensive alerting functionality including:
 * - Alert type definitions and severity levels
 * - Multi-channel notification delivery
 * - Escalation chains and workflows
 * - Action item management
 *
 * Reference: newprd.md Section 3.8
 */

export enum AlertSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum AlertCategory {
  QUALITY_SAFETY = 'QUALITY_SAFETY',
  COMPLIANCE = 'COMPLIANCE',
  MAINTENANCE = 'MAINTENANCE',
  PRODUCTION = 'PRODUCTION',
  PROCUREMENT = 'PROCUREMENT',
  TRAINING = 'TRAINING',
}

export enum AlertType {
  // Quality & Safety (Critical)
  QC_FAILURE = 'QC_FAILURE',
  CONTAMINATION_RISK = 'CONTAMINATION_RISK',
  PREMIX_EXPIRY = 'PREMIX_EXPIRY',

  // Compliance (High)
  CRITICAL_NON_COMPLIANCE = 'CRITICAL_NON_COMPLIANCE',
  COMPLIANCE_SCORE_DROP = 'COMPLIANCE_SCORE_DROP',
  CERTIFICATION_EXPIRY = 'CERTIFICATION_EXPIRY',

  // Maintenance (Medium)
  CALIBRATION_DUE = 'CALIBRATION_DUE',
  CALIBRATION_OVERDUE = 'CALIBRATION_OVERDUE',
  EQUIPMENT_DRIFT = 'EQUIPMENT_DRIFT',

  // Production (Medium)
  PREMIX_USAGE_ANOMALY = 'PREMIX_USAGE_ANOMALY',
  LOW_PREMIX_INVENTORY = 'LOW_PREMIX_INVENTORY',
  PRODUCTION_TARGET_MISS = 'PRODUCTION_TARGET_MISS',

  // Procurement (Medium)
  NEW_RFP_MATCH = 'NEW_RFP_MATCH',
  BID_DEADLINE_APPROACHING = 'BID_DEADLINE_APPROACHING',
  DELIVERY_DELAY = 'DELIVERY_DELAY',
  DELIVERY_ISSUE = 'DELIVERY_ISSUE',

  // Training (Low)
  TRAINING_OVERDUE = 'TRAINING_OVERDUE',
  NEW_TRAINING_AVAILABLE = 'NEW_TRAINING_AVAILABLE',
}

export enum NotificationChannel {
  PUSH = 'PUSH',
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP',
}

export enum AlertStatus {
  PENDING = 'PENDING',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  ESCALATED = 'ESCALATED',
}

export interface AlertConfig {
  type: AlertType;
  severity: AlertSeverity;
  category: AlertCategory;
  channels: NotificationChannel[];
  escalationLevels: EscalationLevel[];
  actionRequired: string;
  responseTimeHours?: number;
}

export interface EscalationLevel {
  level: number;
  roles: string[];
  timeoutMinutes: number;
  requiresAcknowledgment: boolean;
}

/**
 * Alert configuration mapping
 * Defines severity, channels, and escalation for each alert type
 */
export const ALERT_CONFIGS: Record<AlertType, AlertConfig> = {
  // Quality & Safety Alerts (Critical)
  [AlertType.QC_FAILURE]: {
    type: AlertType.QC_FAILURE,
    severity: AlertSeverity.CRITICAL,
    category: AlertCategory.QUALITY_SAFETY,
    channels: [NotificationChannel.PUSH, NotificationChannel.SMS, NotificationChannel.EMAIL],
    escalationLevels: [
      { level: 1, roles: ['MILL_OPERATOR'], timeoutMinutes: 30, requiresAcknowledgment: true },
      { level: 2, roles: ['MILL_MANAGER'], timeoutMinutes: 120, requiresAcknowledgment: true },
      { level: 3, roles: ['FWGA_INSPECTOR'], timeoutMinutes: 1440, requiresAcknowledgment: true },
    ],
    actionRequired: 'Root cause analysis and corrective action within 24 hours',
    responseTimeHours: 24,
  },

  [AlertType.CONTAMINATION_RISK]: {
    type: AlertType.CONTAMINATION_RISK,
    severity: AlertSeverity.CRITICAL,
    category: AlertCategory.QUALITY_SAFETY,
    channels: [NotificationChannel.PUSH, NotificationChannel.SMS, NotificationChannel.EMAIL],
    escalationLevels: [
      { level: 1, roles: ['MILL_MANAGER'], timeoutMinutes: 15, requiresAcknowledgment: true },
      { level: 2, roles: ['FWGA_INSPECTOR'], timeoutMinutes: 60, requiresAcknowledgment: true },
    ],
    actionRequired: 'Immediate batch quarantine and investigation',
    responseTimeHours: 1,
  },

  [AlertType.PREMIX_EXPIRY]: {
    type: AlertType.PREMIX_EXPIRY,
    severity: AlertSeverity.CRITICAL,
    category: AlertCategory.QUALITY_SAFETY,
    channels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
    escalationLevels: [
      { level: 1, roles: ['MILL_MANAGER'], timeoutMinutes: 240, requiresAcknowledgment: true },
    ],
    actionRequired: 'Stop using expired premix and source replacement',
    responseTimeHours: 4,
  },

  // Compliance Alerts (High)
  [AlertType.CRITICAL_NON_COMPLIANCE]: {
    type: AlertType.CRITICAL_NON_COMPLIANCE,
    severity: AlertSeverity.HIGH,
    category: AlertCategory.COMPLIANCE,
    channels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
    escalationLevels: [
      { level: 1, roles: ['MILL_MANAGER'], timeoutMinutes: 480, requiresAcknowledgment: true },
      { level: 2, roles: ['FWGA_INSPECTOR'], timeoutMinutes: 10080, requiresAcknowledgment: true },
    ],
    actionRequired: 'Corrective action plan within 7 days',
    responseTimeHours: 168,
  },

  [AlertType.COMPLIANCE_SCORE_DROP]: {
    type: AlertType.COMPLIANCE_SCORE_DROP,
    severity: AlertSeverity.HIGH,
    category: AlertCategory.COMPLIANCE,
    channels: [NotificationChannel.EMAIL],
    escalationLevels: [
      { level: 1, roles: ['MILL_MANAGER'], timeoutMinutes: 1440, requiresAcknowledgment: false },
      { level: 2, roles: ['FWGA_PROGRAM_MANAGER'], timeoutMinutes: 10080, requiresAcknowledgment: false },
    ],
    actionRequired: 'Review and investigation',
    responseTimeHours: 168,
  },

  [AlertType.CERTIFICATION_EXPIRY]: {
    type: AlertType.CERTIFICATION_EXPIRY,
    severity: AlertSeverity.HIGH,
    category: AlertCategory.COMPLIANCE,
    channels: [NotificationChannel.EMAIL],
    escalationLevels: [
      { level: 1, roles: ['MILL_MANAGER'], timeoutMinutes: 20160, requiresAcknowledgment: false },
    ],
    actionRequired: 'Schedule renewal audit',
    responseTimeHours: 720,
  },

  // Maintenance Alerts (Medium)
  [AlertType.CALIBRATION_DUE]: {
    type: AlertType.CALIBRATION_DUE,
    severity: AlertSeverity.MEDIUM,
    category: AlertCategory.MAINTENANCE,
    channels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
    escalationLevels: [
      { level: 1, roles: ['MILL_TECHNICIAN'], timeoutMinutes: 2880, requiresAcknowledgment: false },
      { level: 2, roles: ['MILL_MANAGER'], timeoutMinutes: 10080, requiresAcknowledgment: false },
    ],
    actionRequired: 'Schedule calibration',
    responseTimeHours: 336,
  },

  [AlertType.CALIBRATION_OVERDUE]: {
    type: AlertType.CALIBRATION_OVERDUE,
    severity: AlertSeverity.HIGH,
    category: AlertCategory.MAINTENANCE,
    channels: [NotificationChannel.PUSH, NotificationChannel.SMS, NotificationChannel.EMAIL],
    escalationLevels: [
      { level: 1, roles: ['MILL_MANAGER'], timeoutMinutes: 60, requiresAcknowledgment: true },
      { level: 2, roles: ['FWGA_INSPECTOR'], timeoutMinutes: 480, requiresAcknowledgment: true },
    ],
    actionRequired: 'Immediate calibration, production hold if critical equipment',
    responseTimeHours: 8,
  },

  [AlertType.EQUIPMENT_DRIFT]: {
    type: AlertType.EQUIPMENT_DRIFT,
    severity: AlertSeverity.MEDIUM,
    category: AlertCategory.MAINTENANCE,
    channels: [NotificationChannel.PUSH, NotificationChannel.SMS],
    escalationLevels: [
      { level: 1, roles: ['MILL_OPERATOR'], timeoutMinutes: 60, requiresAcknowledgment: true },
      { level: 2, roles: ['MILL_MANAGER'], timeoutMinutes: 240, requiresAcknowledgment: true },
    ],
    actionRequired: 'Investigate and recalibrate',
    responseTimeHours: 4,
  },

  // Production Alerts (Medium)
  [AlertType.PREMIX_USAGE_ANOMALY]: {
    type: AlertType.PREMIX_USAGE_ANOMALY,
    severity: AlertSeverity.MEDIUM,
    category: AlertCategory.PRODUCTION,
    channels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
    escalationLevels: [
      { level: 1, roles: ['MILL_OPERATOR'], timeoutMinutes: 120, requiresAcknowledgment: false },
      { level: 2, roles: ['MILL_MANAGER'], timeoutMinutes: 480, requiresAcknowledgment: false },
    ],
    actionRequired: 'Verify measurements and check equipment',
    responseTimeHours: 8,
  },

  [AlertType.LOW_PREMIX_INVENTORY]: {
    type: AlertType.LOW_PREMIX_INVENTORY,
    severity: AlertSeverity.MEDIUM,
    category: AlertCategory.PRODUCTION,
    channels: [NotificationChannel.EMAIL],
    escalationLevels: [
      { level: 1, roles: ['MILL_MANAGER'], timeoutMinutes: 1440, requiresAcknowledgment: false },
    ],
    actionRequired: 'Place order for premix',
    responseTimeHours: 48,
  },

  [AlertType.PRODUCTION_TARGET_MISS]: {
    type: AlertType.PRODUCTION_TARGET_MISS,
    severity: AlertSeverity.MEDIUM,
    category: AlertCategory.PRODUCTION,
    channels: [NotificationChannel.EMAIL],
    escalationLevels: [
      { level: 1, roles: ['MILL_MANAGER'], timeoutMinutes: 1440, requiresAcknowledgment: false },
    ],
    actionRequired: 'Review reasons and adjust plan',
    responseTimeHours: 24,
  },

  // Procurement Alerts (Medium)
  [AlertType.NEW_RFP_MATCH]: {
    type: AlertType.NEW_RFP_MATCH,
    severity: AlertSeverity.MEDIUM,
    category: AlertCategory.PROCUREMENT,
    channels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
    escalationLevels: [
      { level: 1, roles: ['MILL_MANAGER'], timeoutMinutes: 2880, requiresAcknowledgment: false },
    ],
    actionRequired: 'Review and consider bidding',
    responseTimeHours: 72,
  },

  [AlertType.BID_DEADLINE_APPROACHING]: {
    type: AlertType.BID_DEADLINE_APPROACHING,
    severity: AlertSeverity.MEDIUM,
    category: AlertCategory.PROCUREMENT,
    channels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
    escalationLevels: [
      { level: 1, roles: ['MILL_MANAGER'], timeoutMinutes: 120, requiresAcknowledgment: false },
    ],
    actionRequired: 'Submit bid or skip',
    responseTimeHours: 24,
  },

  [AlertType.DELIVERY_DELAY]: {
    type: AlertType.DELIVERY_DELAY,
    severity: AlertSeverity.MEDIUM,
    category: AlertCategory.PROCUREMENT,
    channels: [NotificationChannel.SMS, NotificationChannel.PUSH],
    escalationLevels: [
      { level: 1, roles: ['MILL_MANAGER', 'INSTITUTIONAL_BUYER'], timeoutMinutes: 60, requiresAcknowledgment: false },
    ],
    actionRequired: 'Communication and contingency planning',
    responseTimeHours: 2,
  },

  [AlertType.DELIVERY_ISSUE]: {
    type: AlertType.DELIVERY_ISSUE,
    severity: AlertSeverity.MEDIUM,
    category: AlertCategory.PROCUREMENT,
    channels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
    escalationLevels: [
      { level: 1, roles: ['MILL_MANAGER'], timeoutMinutes: 240, requiresAcknowledgment: true },
    ],
    actionRequired: 'Investigate and resolve',
    responseTimeHours: 24,
  },

  // Training Alerts (Low)
  [AlertType.TRAINING_OVERDUE]: {
    type: AlertType.TRAINING_OVERDUE,
    severity: AlertSeverity.LOW,
    category: AlertCategory.TRAINING,
    channels: [NotificationChannel.EMAIL],
    escalationLevels: [
      { level: 1, roles: ['MILL_OPERATOR', 'MILL_TECHNICIAN'], timeoutMinutes: 10080, requiresAcknowledgment: false },
      { level: 2, roles: ['MILL_MANAGER'], timeoutMinutes: 20160, requiresAcknowledgment: false },
    ],
    actionRequired: 'Complete training',
    responseTimeHours: 336,
  },

  [AlertType.NEW_TRAINING_AVAILABLE]: {
    type: AlertType.NEW_TRAINING_AVAILABLE,
    severity: AlertSeverity.LOW,
    category: AlertCategory.TRAINING,
    channels: [NotificationChannel.PUSH],
    escalationLevels: [],
    actionRequired: 'Review and enroll if interested',
  },
};

/**
 * Get alert configuration for a specific type
 */
export function getAlertConfig(type: AlertType): AlertConfig {
  return ALERT_CONFIGS[type];
}

/**
 * Get severity color for UI display
 */
export function getSeverityColor(severity: AlertSeverity): string {
  switch (severity) {
    case AlertSeverity.CRITICAL:
      return 'text-red-600 bg-red-50 border-red-300';
    case AlertSeverity.HIGH:
      return 'text-orange-600 bg-orange-50 border-orange-300';
    case AlertSeverity.MEDIUM:
      return 'text-yellow-600 bg-yellow-50 border-yellow-300';
    case AlertSeverity.LOW:
      return 'text-blue-600 bg-blue-50 border-blue-300';
  }
}

/**
 * Format alert message for different channels
 */
export function formatAlertMessage(
  type: AlertType,
  context: Record<string, any>,
  channel: NotificationChannel
): string {
  const config = getAlertConfig(type);

  switch (channel) {
    case NotificationChannel.SMS:
      // SMS: Concise, under 160 characters
      return `${config.severity}: ${type.replace(/_/g, ' ')} - ${context.summary || 'Action required'}. View: ${context.link || 'app'}`;

    case NotificationChannel.PUSH:
      // Push: Brief but informative
      return `${config.severity} Alert: ${context.title || type.replace(/_/g, ' ')}`;

    case NotificationChannel.EMAIL:
    case NotificationChannel.IN_APP:
      // Email/In-App: Full details
      return context.message || `${type.replace(/_/g, ' ')}: ${config.actionRequired}`;

    default:
      return context.message || type.replace(/_/g, ' ');
  }
}
