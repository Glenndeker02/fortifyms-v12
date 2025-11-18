/**
 * Multi-Tenancy & Data Isolation
 *
 * Manages tenant hierarchy, data isolation, and tenant-specific configuration
 * Reference: newprd.md Section 3.9.2
 */

import { db } from './db';
import { Role } from './rbac';

export enum TenantType {
  NATIONAL = 'NATIONAL', // National food fortification program
  REGIONAL = 'REGIONAL', // Regional/provincial office
  INSTITUTIONAL = 'INSTITUTIONAL', // Institutional buyer organization
  MILL = 'MILL', // Individual mill
}

export interface TenantConfig {
  id: string;
  name: string;
  type: TenantType;
  parentId: string | null;
  settings: TenantSettings;
  features: TenantFeatures;
  active: boolean;
}

export interface TenantSettings {
  // Compliance thresholds
  minimumFortificationLevel: number; // ppm
  qcPassThreshold: number; // percentage
  complianceScoreThreshold: number; // percentage

  // Operational settings
  maxBatchRetentionDays: number;
  requireDualApproval: boolean; // For critical operations
  enableGeotagging: boolean;

  // Notification preferences
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;

  // Alert thresholds
  criticalAlertEscalationMinutes: number;
  highAlertEscalationMinutes: number;

  // Regional settings
  timezone: string;
  locale: string;
  currency: string;
  measurementSystem: 'metric' | 'imperial';
}

export interface TenantFeatures {
  // Module access
  batchManagement: boolean;
  qcTesting: boolean;
  complianceAudits: boolean;
  equipmentTracking: boolean;
  trainingManagement: boolean;
  orderManagement: boolean;
  deliveryTracking: boolean;
  analytics: boolean;
  reporting: boolean;

  // Advanced features
  advancedAnalytics: boolean;
  customReports: boolean;
  apiAccess: boolean;
  bulkOperations: boolean;
  multiLanguage: boolean;
  offlineMode: boolean;
}

/**
 * Default tenant settings
 */
export const DEFAULT_TENANT_SETTINGS: TenantSettings = {
  minimumFortificationLevel: 30, // 30 ppm minimum
  qcPassThreshold: 95, // 95% pass rate
  complianceScoreThreshold: 80, // 80% compliance score

  maxBatchRetentionDays: 365,
  requireDualApproval: false,
  enableGeotagging: true,

  emailNotifications: true,
  smsNotifications: true,
  pushNotifications: true,

  criticalAlertEscalationMinutes: 30,
  highAlertEscalationMinutes: 120,

  timezone: 'Africa/Nairobi',
  locale: 'en-KE',
  currency: 'KES',
  measurementSystem: 'metric',
};

/**
 * Default tenant features
 */
export const DEFAULT_TENANT_FEATURES: TenantFeatures = {
  batchManagement: true,
  qcTesting: true,
  complianceAudits: true,
  equipmentTracking: true,
  trainingManagement: true,
  orderManagement: true,
  deliveryTracking: true,
  analytics: true,
  reporting: true,

  advancedAnalytics: false,
  customReports: false,
  apiAccess: false,
  bulkOperations: false,
  multiLanguage: false,
  offlineMode: false,
};

/**
 * Feature sets by tenant type
 */
export const TENANT_TYPE_FEATURES: Record<TenantType, Partial<TenantFeatures>> = {
  [TenantType.NATIONAL]: {
    ...DEFAULT_TENANT_FEATURES,
    advancedAnalytics: true,
    customReports: true,
    apiAccess: true,
    bulkOperations: true,
    multiLanguage: true,
  },

  [TenantType.REGIONAL]: {
    ...DEFAULT_TENANT_FEATURES,
    advancedAnalytics: true,
    customReports: true,
    bulkOperations: true,
  },

  [TenantType.INSTITUTIONAL]: {
    batchManagement: false,
    qcTesting: true,
    complianceAudits: false,
    equipmentTracking: false,
    trainingManagement: false,
    orderManagement: true,
    deliveryTracking: true,
    analytics: true,
    reporting: true,
    advancedAnalytics: false,
    customReports: false,
    apiAccess: false,
    bulkOperations: false,
    multiLanguage: false,
    offlineMode: false,
  },

  [TenantType.MILL]: {
    ...DEFAULT_TENANT_FEATURES,
    advancedAnalytics: false,
    customReports: false,
    apiAccess: false,
    bulkOperations: false,
    multiLanguage: false,
    offlineMode: true,
  },
};

/**
 * Get tenant configuration
 */
export async function getTenantConfig(tenantId: string): Promise<TenantConfig | null> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    return null;
  }

  return {
    id: tenant.id,
    name: tenant.name,
    type: tenant.type as TenantType,
    parentId: tenant.parentId,
    settings: (tenant.settings as TenantSettings) || DEFAULT_TENANT_SETTINGS,
    features: (tenant.features as TenantFeatures) || DEFAULT_TENANT_FEATURES,
    active: tenant.active,
  };
}

/**
 * Get tenant hierarchy (parent chain)
 */
export async function getTenantHierarchy(tenantId: string): Promise<string[]> {
  const hierarchy: string[] = [tenantId];
  let currentTenantId: string | null = tenantId;

  while (currentTenantId) {
    const tenant = await db.tenant.findUnique({
      where: { id: currentTenantId },
      select: { parentId: true },
    });

    if (tenant?.parentId) {
      hierarchy.push(tenant.parentId);
      currentTenantId = tenant.parentId;
    } else {
      currentTenantId = null;
    }
  }

  return hierarchy;
}

/**
 * Get all child tenants (subtree)
 */
export async function getChildTenants(
  tenantId: string,
  includeInactive = false
): Promise<string[]> {
  const childIds: string[] = [];

  async function getChildren(parentId: string) {
    const children = await db.tenant.findMany({
      where: {
        parentId,
        ...(includeInactive ? {} : { active: true }),
      },
      select: { id: true },
    });

    for (const child of children) {
      childIds.push(child.id);
      await getChildren(child.id);
    }
  }

  await getChildren(tenantId);
  return childIds;
}

/**
 * Check if tenant has access to another tenant's data
 * Parents can access child data, but not vice versa
 */
export async function canAccessTenant(
  userTenantId: string,
  targetTenantId: string
): Promise<boolean> {
  // Same tenant - always allowed
  if (userTenantId === targetTenantId) {
    return true;
  }

  // Check if target is a child of user's tenant
  const targetHierarchy = await getTenantHierarchy(targetTenantId);
  return targetHierarchy.includes(userTenantId);
}

/**
 * Build tenant filter for database queries
 */
export function buildTenantFilter(
  tenantId: string | null,
  includeChildren = false
): any {
  if (!tenantId) {
    return {};
  }

  if (includeChildren) {
    // This will be expanded with actual child tenant IDs
    return {
      tenantId: {
        in: [tenantId], // Will be populated with child IDs
      },
    };
  }

  return { tenantId };
}

/**
 * Validate tenant-specific setting
 */
export async function validateTenantSetting<K extends keyof TenantSettings>(
  tenantId: string,
  setting: K,
  value: any
): Promise<boolean> {
  const config = await getTenantConfig(tenantId);

  if (!config) {
    return false;
  }

  // Type-specific validation
  switch (setting) {
    case 'minimumFortificationLevel':
      return typeof value === 'number' && value >= 0 && value <= 100;

    case 'qcPassThreshold':
    case 'complianceScoreThreshold':
      return typeof value === 'number' && value >= 0 && value <= 100;

    case 'maxBatchRetentionDays':
      return typeof value === 'number' && value >= 1 && value <= 3650;

    case 'criticalAlertEscalationMinutes':
    case 'highAlertEscalationMinutes':
      return typeof value === 'number' && value >= 5 && value <= 10080; // 5 min to 1 week

    case 'timezone':
      // Basic timezone validation
      return typeof value === 'string' && value.includes('/');

    case 'currency':
      return typeof value === 'string' && value.length === 3;

    case 'measurementSystem':
      return value === 'metric' || value === 'imperial';

    default:
      return typeof value === 'boolean';
  }
}

/**
 * Update tenant settings
 */
export async function updateTenantSettings(
  tenantId: string,
  settings: Partial<TenantSettings>
): Promise<void> {
  // Validate each setting
  for (const [key, value] of Object.entries(settings)) {
    const isValid = await validateTenantSetting(
      tenantId,
      key as keyof TenantSettings,
      value
    );

    if (!isValid) {
      throw new Error(`Invalid value for setting: ${key}`);
    }
  }

  // Get current settings and merge
  const config = await getTenantConfig(tenantId);
  if (!config) {
    throw new Error('Tenant not found');
  }

  const updatedSettings = {
    ...config.settings,
    ...settings,
  };

  await db.tenant.update({
    where: { id: tenantId },
    data: { settings: updatedSettings },
  });
}

/**
 * Check if feature is enabled for tenant
 */
export async function isFeatureEnabled(
  tenantId: string,
  feature: keyof TenantFeatures
): Promise<boolean> {
  const config = await getTenantConfig(tenantId);

  if (!config) {
    return false;
  }

  return config.features[feature] ?? false;
}

/**
 * Enable/disable feature for tenant
 */
export async function setFeatureEnabled(
  tenantId: string,
  feature: keyof TenantFeatures,
  enabled: boolean
): Promise<void> {
  const config = await getTenantConfig(tenantId);

  if (!config) {
    throw new Error('Tenant not found');
  }

  const updatedFeatures = {
    ...config.features,
    [feature]: enabled,
  };

  await db.tenant.update({
    where: { id: tenantId },
    data: { features: updatedFeatures },
  });
}

/**
 * Create new tenant
 */
export async function createTenant(data: {
  name: string;
  type: TenantType;
  parentId?: string;
  settings?: Partial<TenantSettings>;
  features?: Partial<TenantFeatures>;
}): Promise<string> {
  const settings = {
    ...DEFAULT_TENANT_SETTINGS,
    ...data.settings,
  };

  const features = {
    ...(TENANT_TYPE_FEATURES[data.type] || DEFAULT_TENANT_FEATURES),
    ...data.features,
  };

  const tenant = await db.tenant.create({
    data: {
      name: data.name,
      type: data.type,
      parentId: data.parentId || null,
      settings,
      features,
      active: true,
    },
  });

  return tenant.id;
}

/**
 * Get accessible data scope for user
 */
export async function getDataScope(
  tenantId: string | null,
  role: Role
): Promise<{
  tenantIds: string[];
  millIds: string[];
  scope: 'global' | 'tenant' | 'mill' | 'user';
}> {
  // System admins have global access
  if (role === Role.SYSTEM_ADMIN) {
    return {
      tenantIds: [],
      millIds: [],
      scope: 'global',
    };
  }

  if (!tenantId) {
    return {
      tenantIds: [],
      millIds: [],
      scope: 'user',
    };
  }

  // FWGA staff can access all mills in their tenant hierarchy
  if (role === Role.FWGA_PROGRAM_MANAGER || role === Role.FWGA_INSPECTOR) {
    const childTenants = await getChildTenants(tenantId);
    const tenantIds = [tenantId, ...childTenants];

    const mills = await db.mill.findMany({
      where: {
        tenantId: { in: tenantIds },
        active: true,
      },
      select: { id: true },
    });

    return {
      tenantIds,
      millIds: mills.map(m => m.id),
      scope: 'tenant',
    };
  }

  // Mill staff have mill-specific access
  if (
    role === Role.MILL_OPERATOR ||
    role === Role.MILL_TECHNICIAN ||
    role === Role.MILL_MANAGER
  ) {
    return {
      tenantIds: [tenantId],
      millIds: [], // Will be filtered by user's millId
      scope: 'mill',
    };
  }

  // Institutional buyers and drivers have user-specific access
  return {
    tenantIds: [tenantId],
    millIds: [],
    scope: 'user',
  };
}

/**
 * Validate data isolation
 * Ensures that data from different tenants is properly isolated
 */
export async function validateDataIsolation(
  userTenantId: string | null,
  resourceTenantId: string | null
): Promise<boolean> {
  // If either is null, cannot validate
  if (!userTenantId || !resourceTenantId) {
    return false;
  }

  // Same tenant is always valid
  if (userTenantId === resourceTenantId) {
    return true;
  }

  // Check if user's tenant can access resource's tenant
  return await canAccessTenant(userTenantId, resourceTenantId);
}

/**
 * Get tenant metrics for monitoring
 */
export async function getTenantMetrics(tenantId: string): Promise<{
  userCount: number;
  millCount: number;
  activeUsers: number;
  storageUsed: number;
}> {
  const childTenants = await getChildTenants(tenantId);
  const tenantIds = [tenantId, ...childTenants];

  const [userCount, activeUserCount, millCount] = await Promise.all([
    db.user.count({
      where: { tenantId: { in: tenantIds } },
    }),
    db.user.count({
      where: {
        tenantId: { in: tenantIds },
        lastLoginAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    }),
    db.mill.count({
      where: { tenantId: { in: tenantIds }, active: true },
    }),
  ]);

  // Storage calculation would require file system access
  // Placeholder for now
  const storageUsed = 0;

  return {
    userCount,
    millCount,
    activeUsers: activeUserCount,
    storageUsed,
  };
}
