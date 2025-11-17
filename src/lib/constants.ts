/**
 * Application Constants
 *
 * Centralized constants for the FortifyMIS Portal application.
 * Based on: prisma/schema.prisma enums and newprd.md requirements
 *
 * Reference: TODO.md Phase 1, rules.md Rule 10 (Documentation)
 */

/**
 * User Roles
 * Based on: prisma/schema.prisma UserRole enum
 */
export const USER_ROLES = {
  MILL_OPERATOR: 'MILL_OPERATOR',
  MILL_MANAGER: 'MILL_MANAGER',
  FWGA_INSPECTOR: 'FWGA_INSPECTOR',
  FWGA_PROGRAM_MANAGER: 'FWGA_PROGRAM_MANAGER',
  INSTITUTIONAL_BUYER: 'INSTITUTIONAL_BUYER',
  LOGISTICS_PLANNER: 'LOGISTICS_PLANNER',
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/**
 * Role Display Names
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  [USER_ROLES.MILL_OPERATOR]: 'Mill Operator',
  [USER_ROLES.MILL_MANAGER]: 'Mill Manager',
  [USER_ROLES.FWGA_INSPECTOR]: 'FWGA Inspector',
  [USER_ROLES.FWGA_PROGRAM_MANAGER]: 'FWGA Program Manager',
  [USER_ROLES.INSTITUTIONAL_BUYER]: 'Institutional Buyer',
  [USER_ROLES.LOGISTICS_PLANNER]: 'Logistics Planner',
  [USER_ROLES.SYSTEM_ADMIN]: 'System Administrator',
};

/**
 * Batch Statuses
 */
export const BATCH_STATUS = {
  IN_PRODUCTION: 'IN_PRODUCTION',
  PENDING_QC: 'PENDING_QC',
  QC_PASS: 'QC_PASS',
  QC_FAIL: 'QC_FAIL',
  QUARANTINED: 'QUARANTINED',
  RELEASED: 'RELEASED',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
} as const;

export type BatchStatus = (typeof BATCH_STATUS)[keyof typeof BATCH_STATUS];

/**
 * QC Test Statuses
 */
export const QC_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  PASS: 'PASS',
  PASS_WITH_NOTES: 'PASS_WITH_NOTES',
  MARGINAL: 'MARGINAL',
  FAIL: 'FAIL',
  EXCELLENT: 'EXCELLENT',
} as const;

export type QCStatus = (typeof QC_STATUS)[keyof typeof QC_STATUS];

/**
 * Compliance Audit Statuses
 */
export const COMPLIANCE_STATUS = {
  DRAFT: 'DRAFT',
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  REVISION_REQUESTED: 'REVISION_REQUESTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type ComplianceStatus = (typeof COMPLIANCE_STATUS)[keyof typeof COMPLIANCE_STATUS];

/**
 * Alert Priorities
 */
export const ALERT_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export type AlertPriority = (typeof ALERT_PRIORITY)[keyof typeof ALERT_PRIORITY];

/**
 * Alert Statuses
 */
export const ALERT_STATUS = {
  ACTIVE: 'ACTIVE',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  RESOLVED: 'RESOLVED',
  DISMISSED: 'DISMISSED',
  SNOOZED: 'SNOOZED',
} as const;

export type AlertStatus = (typeof ALERT_STATUS)[keyof typeof ALERT_STATUS];

/**
 * Maintenance Task Statuses
 */
export const MAINTENANCE_STATUS = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
} as const;

export type MaintenanceStatus = (typeof MAINTENANCE_STATUS)[keyof typeof MAINTENANCE_STATUS];

/**
 * RFP (Procurement) Statuses
 */
export const RFP_STATUS = {
  DRAFT: 'DRAFT',
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  AWARDED: 'AWARDED',
  CANCELLED: 'CANCELLED',
} as const;

export type RFPStatus = (typeof RFP_STATUS)[keyof typeof RFP_STATUS];

/**
 * Bid Statuses
 */
export const BID_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  SHORTLISTED: 'SHORTLISTED',
  NOT_SELECTED: 'NOT_SELECTED',
  AWARDED: 'AWARDED',
  WITHDRAWN: 'WITHDRAWN',
} as const;

export type BidStatus = (typeof BID_STATUS)[keyof typeof BID_STATUS];

/**
 * Training Progress Statuses
 */
export const TRAINING_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const;

export type TrainingStatus = (typeof TRAINING_STATUS)[keyof typeof TRAINING_STATUS];

/**
 * Commodity Types
 * Based on: newprd.md Module 3.5
 */
export const COMMODITY_TYPES = {
  FORTIFIED_WHOLE_GRAIN_MAIZE: 'FORTIFIED_WHOLE_GRAIN_MAIZE',
  FORTIFIED_REFINED_MAIZE_FLOUR: 'FORTIFIED_REFINED_MAIZE_FLOUR',
  FORTIFIED_PARBOILED_RICE: 'FORTIFIED_PARBOILED_RICE',
  FORTIFIED_RAW_RICE: 'FORTIFIED_RAW_RICE',
  FORTIFIED_WHEAT_FLOUR: 'FORTIFIED_WHEAT_FLOUR',
} as const;

export type CommodityType = (typeof COMMODITY_TYPES)[keyof typeof COMMODITY_TYPES];

/**
 * Commodity Display Names
 */
export const COMMODITY_LABELS: Record<CommodityType, string> = {
  [COMMODITY_TYPES.FORTIFIED_WHOLE_GRAIN_MAIZE]: 'Fortified Whole Grain Maize',
  [COMMODITY_TYPES.FORTIFIED_REFINED_MAIZE_FLOUR]: 'Fortified Refined Maize Flour',
  [COMMODITY_TYPES.FORTIFIED_PARBOILED_RICE]: 'Fortified Parboiled Rice',
  [COMMODITY_TYPES.FORTIFIED_RAW_RICE]: 'Fortified Raw Rice',
  [COMMODITY_TYPES.FORTIFIED_WHEAT_FLOUR]: 'Fortified Wheat Flour',
};

/**
 * File Upload Limits
 */
export const FILE_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_VIDEO_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_DOCUMENT_SIZE: 10 * 1024 * 1024, // 10MB
} as const;

/**
 * Allowed File Types
 */
export const ALLOWED_FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  SPREADSHEETS: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
  VIDEOS: ['video/mp4', 'video/webm', 'video/ogg'],
} as const;

/**
 * Pagination Defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1,
} as const;

/**
 * QC Test Thresholds
 * Based on: newprd.md Module 3.4.3
 */
export const QC_THRESHOLDS = {
  CRITICAL_FAIL_THRESHOLD: 0.75, // <75% of target = FAIL
  MARGINAL_THRESHOLD: 0.8, // 75-80% of target = MARGINAL
  PASS_THRESHOLD: 0.9, // 80-90% of target = PASS
  EXCELLENT_THRESHOLD: 0.95, // >95% of target = EXCELLENT
  MOISTURE_MAX: 15, // >15% moisture = FAIL (spoilage risk)
} as const;

/**
 * Premix Variance Thresholds
 * Based on: newprd.md Module 3.4.1
 */
export const PREMIX_VARIANCE_THRESHOLDS = {
  ACCEPTABLE: 0.05, // ±5% variance = acceptable (green)
  WARNING: 0.1, // ±5-10% variance = warning (yellow)
  CRITICAL: 0.1, // >±10% variance = critical (red)
} as const;

/**
 * Compliance Score Categories
 * Based on: newprd.md Module 3.2.2
 */
export const COMPLIANCE_SCORE_CATEGORIES = {
  EXCELLENT: { min: 90, max: 100, label: 'Excellent', color: 'green' },
  GOOD: { min: 75, max: 89, label: 'Good', color: 'light-green' },
  NEEDS_IMPROVEMENT: { min: 60, max: 74, label: 'Needs Improvement', color: 'yellow' },
  NON_COMPLIANT: { min: 0, max: 59, label: 'Non-Compliant', color: 'red' },
} as const;

/**
 * Notification Types
 */
export const NOTIFICATION_TYPES = {
  EMAIL: 'EMAIL',
  SMS: 'SMS',
  PUSH: 'PUSH',
  IN_APP: 'IN_APP',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

/**
 * Diagnostic Categories
 * Based on: newprd.md Module 3.1.1
 */
export const DIAGNOSTIC_CATEGORIES = {
  RICE_PARBOILING: 'rice_parboiling',
  MAIZE_FORTIFICATION: 'maize_fortification',
  DOSER_CALIBRATION: 'doser_calibration',
  PREMIX_HANDLING: 'premix_handling',
  POST_MIX_BLENDING: 'post_mix_blending',
} as const;

export type DiagnosticCategory = (typeof DIAGNOSTIC_CATEGORIES)[keyof typeof DIAGNOSTIC_CATEGORIES];

/**
 * Equipment Types
 */
export const EQUIPMENT_TYPES = {
  DOSER: 'DOSER',
  MIXER: 'MIXER',
  SENSOR: 'SENSOR',
  PREMIX_FEEDER: 'PREMIX_FEEDER',
  MOTOR: 'MOTOR',
  SCALE: 'SCALE',
  PARBOILING_TANK: 'PARBOILING_TANK',
  DRYER: 'DRYER',
  BLENDER: 'BLENDER',
} as const;

export type EquipmentType = (typeof EQUIPMENT_TYPES)[keyof typeof EQUIPMENT_TYPES];

/**
 * Buyer Organization Types
 * Based on: newprd.md Module 3.5.1
 */
export const BUYER_TYPES = {
  SCHOOL: 'SCHOOL',
  NGO: 'NGO',
  GOVERNMENT_AGENCY: 'GOVERNMENT_AGENCY',
  HOSPITAL: 'HOSPITAL',
  CORPORATE_CAFETERIA: 'CORPORATE_CAFETERIA',
  OTHER: 'OTHER',
} as const;

export type BuyerType = (typeof BUYER_TYPES)[keyof typeof BUYER_TYPES];

/**
 * API Rate Limits
 */
export const RATE_LIMITS = {
  DEFAULT: 100, // 100 requests per minute
  AUTH: 10, // 10 login attempts per minute
  UPLOAD: 20, // 20 file uploads per minute
} as const;

/**
 * Session Configuration
 */
export const SESSION_CONFIG = {
  MAX_AGE: 24 * 60 * 60, // 24 hours in seconds
  UPDATE_AGE: 60 * 60, // Update session every 1 hour
} as const;

/**
 * Application Metadata
 */
export const APP_META = {
  NAME: 'FortifyMIS Portal',
  VERSION: '12.0.0',
  DESCRIPTION: 'Comprehensive digital platform for food fortification operations',
  SUPPORT_EMAIL: 'support@fortifymis.com',
} as const;

/**
 * Date Formats
 */
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  DISPLAY_WITH_TIME: 'MMM dd, yyyy HH:mm',
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  SHORT: 'MM/dd/yyyy',
  LONG: 'MMMM dd, yyyy',
} as const;

/**
 * Currency Configuration
 */
export const CURRENCY_CONFIG = {
  DEFAULT: 'USD',
  SUPPORTED: ['USD', 'KES', 'UGX', 'TZS', 'NGN'] as const,
} as const;
