import { z } from 'zod';
import {
  USER_ROLES,
  BATCH_STATUS,
  QC_STATUS,
  COMPLIANCE_STATUS,
  ALERT_PRIORITY,
  COMMODITY_TYPES,
  BUYER_TYPES,
  FILE_LIMITS,
} from './constants';

/**
 * Validation Schemas
 *
 * Zod validation schemas for all forms in the FortifyMIS Portal.
 * Used for both client-side and server-side validation.
 *
 * Reference: TODO.md Phase 1, newprd.md (all modules), rules.md Rule 6 (Security)
 */

// ============================================================================
// AUTHENTICATION SCHEMAS
// ============================================================================

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  remember: z.boolean().optional(),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum([
    USER_ROLES.MILL_OPERATOR,
    USER_ROLES.MILL_MANAGER,
    USER_ROLES.FWGA_INSPECTOR,
    USER_ROLES.FWGA_PROGRAM_MANAGER,
    USER_ROLES.INSTITUTIONAL_BUYER,
    USER_ROLES.LOGISTICS_PLANNER,
  ]),
  millId: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// ============================================================================
// USER & PROFILE SCHEMAS
// ============================================================================

export const userProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  address: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  timezone: z.string().default('UTC'),
  language: z.string().default('en'),
});

// ============================================================================
// BATCH LOGGING SCHEMAS (Module 3.4.1)
// ============================================================================

export const batchLogSchema = z.object({
  millId: z.string().min(1, 'Mill is required'),
  productionLine: z.string().min(1, 'Production line is required'),
  batchDate: z.coerce.date(),
  shift: z.enum(['MORNING', 'AFTERNOON', 'NIGHT']).optional(),
  operatorId: z.string().min(1, 'Operator is required'),

  // Crop & Product
  rawMaterialType: z.string().min(1, 'Raw material type is required'),
  grade: z.string().optional(),
  rawMaterialLotNumber: z.string().optional(),
  rawMaterialSource: z.string().optional(),

  // Production Volume
  inputWeight: z.number().positive('Input weight must be positive'),
  expectedOutputWeight: z.number().positive('Expected output weight must be positive'),
  actualOutputWeight: z.number().optional(),

  // Fortification Parameters
  premixType: z.string().min(1, 'Premix type is required'),
  premixBatchNumber: z.string().optional(),
  premixManufacturer: z.string().optional(),
  premixExpiryDate: z.coerce.date().optional(),
  targetFortificationLevel: z.string(),
  premixDosingRate: z.number().positive('Dosing rate must be positive'),
  expectedPremixUsage: z.number().positive('Expected premix usage must be positive'),
  actualPremixUsage: z.number().optional(),

  // Equipment
  doserId: z.string().optional(),
  doserSettings: z.string().optional(),
  mixerId: z.string().optional(),
  mixingTime: z.number().positive('Mixing time must be positive').optional(),
  mixerSpeed: z.number().positive('Mixer speed must be positive').optional(),

  // Process Parameters
  processParameters: z.record(z.unknown()).optional(),

  // Storage
  storageLocation: z.string().optional(),
  packagingDate: z.coerce.date().optional(),
  packagingType: z.string().optional(),
  numberOfUnits: z.number().int().positive('Number of units must be positive').optional(),

  notes: z.string().optional(),
});

// ============================================================================
// QC TEST SCHEMAS (Module 3.4.2)
// ============================================================================

export const qcTestSchema = z.object({
  batchId: z.string().min(1, 'Batch is required'),
  sampleId: z.string().optional(),
  sampleCollectionPoint: z.enum(['START', 'MIDDLE', 'END', 'RANDOM']),
  sampleCollectionTime: z.coerce.date(),
  sampledBy: z.string().min(1, 'Sampled by is required'),
  sampleQuantity: z.number().positive('Sample quantity must be positive'),

  // Test Results
  testResults: z.array(z.object({
    testType: z.string(),
    testDate: z.coerce.date(),
    testLocation: z.string(),
    resultValue: z.number(),
    unit: z.string(),
    targetValue: z.number(),
    tolerancePercent: z.number(),
    labCertificateNumber: z.string().optional(),
    labReportFile: z.string().optional(),
  })),

  // Visual Inspection
  colorUniformity: z.enum(['UNIFORM', 'SOMEWHAT_UNIFORM', 'NON_UNIFORM']).optional(),
  odor: z.string().optional(),
  texture: z.string().optional(),
  foreignMatterPresent: z.boolean().optional(),
  foreignMatterDescription: z.string().optional(),
  samplePhotos: z.array(z.string()).optional(),

  notes: z.string().optional(),
});

// ============================================================================
// COMPLIANCE AUDIT SCHEMAS (Module 3.2)
// ============================================================================

export const complianceAuditSchema = z.object({
  millId: z.string().min(1, 'Mill is required'),
  templateId: z.string().min(1, 'Template is required'),
  auditorId: z.string().min(1, 'Auditor is required'),
  auditDate: z.coerce.date(),
  auditType: z.enum(['INITIAL', 'RENEWAL', 'SPOT_CHECK']),
  batchId: z.string().optional(),
  productionPeriod: z.string().optional(),

  responses: z.array(z.object({
    itemId: z.string(),
    sectionId: z.string(),
    responseValue: z.union([z.string(), z.number(), z.boolean()]),
    naJustification: z.string().optional(),
    evidenceFiles: z.array(z.string()).optional(),
    notes: z.string().optional(),
  })),

  notes: z.string().optional(),
});

export const complianceTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  version: z.string().min(1, 'Version is required'),
  commodity: z.string(),
  country: z.string(),
  region: z.string().optional(),
  regulatoryStandard: z.string(),
  certificationType: z.enum(['INITIAL', 'RENEWAL', 'SPOT_CHECK']),

  sections: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    order: z.number(),
    items: z.array(z.object({
      id: z.string(),
      question: z.string(),
      responseType: z.enum(['YES_NO_NA', 'NUMERIC', 'TEXT', 'DROPDOWN', 'MULTIPLE_CHOICE']),
      options: z.array(z.string()).optional(),
      criticality: z.enum(['CRITICAL', 'MAJOR', 'MINOR']),
      scoringWeight: z.number(),
      evidenceRequired: z.enum(['MANDATORY', 'OPTIONAL', 'NONE']),
      helpText: z.string().optional(),
      unit: z.string().optional(),
      expectedRange: z.object({
        min: z.number(),
        max: z.number(),
      }).optional(),
    })),
  })),

  scoringRules: z.object({
    passingThreshold: z.number().min(0).max(100),
    criticalItemFailureAction: z.enum(['AUTO_FAIL', 'WARN', 'NONE']),
  }),
});

// ============================================================================
// DIAGNOSTIC SCHEMAS (Module 3.1.1)
// ============================================================================

export const diagnosticResultSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  cropType: z.string().optional(),
  equipmentType: z.string().optional(),

  responses: z.array(z.object({
    questionId: z.string(),
    questionType: z.enum(['NUMERIC', 'DROPDOWN', 'YES_NO', 'TEXT']),
    value: z.union([z.string(), z.number(), z.boolean()]),
    unit: z.string().optional(),
    photoEvidence: z.array(z.string()).optional(),
  })),

  notes: z.string().optional(),
});

// ============================================================================
// TRAINING SCHEMAS (Module 3.1.2)
// ============================================================================

export const trainingCourseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  duration: z.number().int().positive('Duration must be positive'),
  language: z.string().default('en'),
});

export const quizSubmissionSchema = z.object({
  courseId: z.string().min(1, 'Course is required'),
  moduleId: z.string().min(1, 'Module is required'),
  answers: z.array(z.object({
    questionId: z.string(),
    answer: z.union([z.string(), z.array(z.string())]),
  })),
});

// ============================================================================
// MAINTENANCE SCHEMAS (Module 3.3)
// ============================================================================

export const equipmentSchema = z.object({
  millId: z.string().min(1, 'Mill is required'),
  name: z.string().min(1, 'Equipment name is required'),
  type: z.string().min(1, 'Equipment type is required'),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  installationDate: z.coerce.date().optional(),
  location: z.string().optional(),
});

export const maintenanceTaskSchema = z.object({
  equipmentId: z.string().min(1, 'Equipment is required'),
  scheduleId: z.string().optional(),
  assignedTo: z.string().min(1, 'Assigned to is required'),
  type: z.enum(['CALIBRATION', 'CLEANING', 'LUBRICATION', 'INSPECTION', 'REPAIR', 'REPLACEMENT']),
  scheduledDate: z.coerce.date(),
  scheduledTime: z.coerce.date(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  estimatedDuration: z.number().int().positive('Duration must be positive'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),

  // Pre-checklist
  preChecklist: z.array(z.object({
    item: z.string(),
    completed: z.boolean(),
  })).optional(),

  // Work log (filled during maintenance)
  workLog: z.array(z.object({
    step: z.string(),
    completed: z.boolean(),
    notes: z.string().optional(),
  })).optional(),

  // Measurements
  measurements: z.array(z.object({
    parameter: z.string(),
    beforeValue: z.number().optional(),
    afterValue: z.number().optional(),
    unit: z.string(),
  })).optional(),

  // Parts replaced
  partsReplaced: z.array(z.object({
    partName: z.string(),
    serialNumber: z.string().optional(),
    quantity: z.number().int().positive(),
  })).optional(),

  // Calibration data (for calibration tasks)
  calibrationData: z.array(z.object({
    testPoint: z.string(),
    reading: z.number(),
    expected: z.number(),
    tolerance: z.number(),
  })).optional(),

  // Evidence
  evidenceFiles: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

// ============================================================================
// PROCUREMENT SCHEMAS (Module 3.5)
// ============================================================================

export const buyerProfileSchema = z.object({
  organizationName: z.string().min(1, 'Organization name is required'),
  organizationType: z.enum([
    BUYER_TYPES.SCHOOL,
    BUYER_TYPES.NGO,
    BUYER_TYPES.GOVERNMENT_AGENCY,
    BUYER_TYPES.HOSPITAL,
    BUYER_TYPES.CORPORATE_CAFETERIA,
    BUYER_TYPES.OTHER,
  ]),
  registrationId: z.string().optional(),
  primaryContactName: z.string().min(1, 'Contact name is required'),
  primaryContactTitle: z.string().optional(),
  primaryContactPhone: z.string().min(1, 'Contact phone is required'),
  primaryContactEmail: z.string().email('Invalid email address'),
  billingAddress: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string().optional(),
    country: z.string(),
    postalCode: z.string(),
  }),
  deliveryAddresses: z.array(z.object({
    name: z.string(),
    street: z.string(),
    city: z.string(),
    state: z.string().optional(),
    country: z.string(),
    postalCode: z.string(),
    contactPerson: z.string(),
    contactPhone: z.string(),
    accessNotes: z.string().optional(),
  })).min(1, 'At least one delivery address is required'),
});

export const rfpSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  commodity: z.enum([
    COMMODITY_TYPES.FORTIFIED_WHOLE_GRAIN_MAIZE,
    COMMODITY_TYPES.FORTIFIED_REFINED_MAIZE_FLOUR,
    COMMODITY_TYPES.FORTIFIED_PARBOILED_RICE,
    COMMODITY_TYPES.FORTIFIED_RAW_RICE,
    COMMODITY_TYPES.FORTIFIED_WHEAT_FLOUR,
  ]),
  totalVolume: z.number().positive('Total volume must be positive'),
  unitPackaging: z.enum(['1KG_BAGS', '5KG_BAGS', '25KG_BAGS', '50KG_BAGS', 'BULK', 'CUSTOM']),
  numberOfUnits: z.number().int().positive().optional(),

  // Quality Specifications
  qualitySpecs: z.object({
    minIronLevel: z.number().positive().optional(),
    minVitaminA: z.number().positive().optional(),
    otherNutrients: z.array(z.object({
      name: z.string(),
      minLevel: z.number(),
      unit: z.string(),
    })).optional(),
    maxMoistureContent: z.number().optional(),
    minPurity: z.number().optional(),
  }),

  // Delivery Requirements
  deliveryLocations: z.array(z.object({
    addressId: z.string(),
    quantity: z.number().positive(),
  })).min(1, 'At least one delivery location is required'),

  deliverySchedule: z.object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    frequency: z.enum(['ONE_TIME', 'WEEKLY', 'BI_WEEKLY', 'MONTHLY']),
    preferredDays: z.array(z.string()).optional(),
    preferredTimes: z.string().optional(),
  }),

  // Pricing
  maxUnitPrice: z.number().positive().optional(),
  totalBudget: z.number().positive().optional(),
  preferredPaymentTerms: z.enum(['ADVANCE', 'ON_DELIVERY', 'NET_30', 'NET_60', 'ESCROW']),

  // Timeline
  bidDeadline: z.coerce.date(),
  estimatedAwardDate: z.coerce.date().optional(),

  // Eligibility Criteria
  eligibilityCriteria: z.object({
    geographicRestriction: z.object({
      maxDistanceKm: z.number().positive().optional(),
      countries: z.array(z.string()).optional(),
      regions: z.array(z.string()).optional(),
    }).optional(),
    minComplianceScore: z.number().min(0).max(100).optional(),
    minProductionCapacity: z.number().positive().optional(),
    minPreviousOrders: z.number().int().min(0).optional(),
    minRating: z.number().min(0).max(5).optional(),
  }).optional(),

  // Evaluation Criteria
  evaluationCriteria: z.object({
    priceWeight: z.number().min(0).max(100),
    qualityWeight: z.number().min(0).max(100),
    deliveryWeight: z.number().min(0).max(100),
    locationWeight: z.number().min(0).max(100),
    trackRecordWeight: z.number().min(0).max(100),
  }).refine(
    (data) => data.priceWeight + data.qualityWeight + data.deliveryWeight + data.locationWeight + data.trackRecordWeight === 100,
    { message: 'Evaluation criteria weights must sum to 100%' }
  ),
});

export const bidSchema = z.object({
  rfpId: z.string().min(1, 'RFP is required'),

  // Pricing
  unitPrice: z.number().positive('Unit price must be positive'),
  deliveryCost: z.number().min(0, 'Delivery cost cannot be negative').optional(),
  additionalCosts: z.number().min(0).optional(),
  priceValidity: z.number().int().positive('Price validity must be positive'),
  paymentTerms: z.string(),

  // Delivery Proposal
  deliverySchedule: z.array(z.object({
    locationId: z.string(),
    proposedDate: z.coerce.date(),
  })),
  leadTime: z.number().int().positive('Lead time must be positive'),
  deliveryMethod: z.enum(['OWN_FLEET', 'THIRD_PARTY', 'BUYER_PICKUP']),

  // Quality Assurance
  sampleOffer: z.boolean(),

  notes: z.string().optional(),
});

// ============================================================================
// FILE UPLOAD SCHEMAS
// ============================================================================

export const fileUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= FILE_LIMITS.MAX_FILE_SIZE, {
      message: `File size must be less than ${FILE_LIMITS.MAX_FILE_SIZE / (1024 * 1024)}MB`,
    }),
  category: z.enum(['EVIDENCE', 'CERTIFICATE', 'REPORT', 'PHOTO', 'DOCUMENT']),
  description: z.string().optional(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type BatchLogInput = z.infer<typeof batchLogSchema>;
export type QCTestInput = z.infer<typeof qcTestSchema>;
export type ComplianceAuditInput = z.infer<typeof complianceAuditSchema>;
export type DiagnosticResultInput = z.infer<typeof diagnosticResultSchema>;
export type MaintenanceTaskInput = z.infer<typeof maintenanceTaskSchema>;
export type RFPInput = z.infer<typeof rfpSchema>;
export type BidInput = z.infer<typeof bidSchema>;
