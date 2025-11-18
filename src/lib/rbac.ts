/**
 * Role-Based Access Control (RBAC) System
 *
 * Defines roles, permissions, and access control logic
 * Reference: newprd.md Section 3.9.1
 */

export enum Role {
  MILL_OPERATOR = 'MILL_OPERATOR',
  MILL_TECHNICIAN = 'MILL_TECHNICIAN',
  MILL_MANAGER = 'MILL_MANAGER',
  FWGA_INSPECTOR = 'FWGA_INSPECTOR',
  FWGA_PROGRAM_MANAGER = 'FWGA_PROGRAM_MANAGER',
  INSTITUTIONAL_BUYER = 'INSTITUTIONAL_BUYER',
  DRIVER_LOGISTICS = 'DRIVER_LOGISTICS',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
}

export enum Permission {
  // Batch Management
  BATCH_CREATE = 'BATCH_CREATE',
  BATCH_VIEW = 'BATCH_VIEW',
  BATCH_EDIT = 'BATCH_EDIT',
  BATCH_DELETE = 'BATCH_DELETE',
  BATCH_APPROVE = 'BATCH_APPROVE',

  // QC Management
  QC_TEST_CREATE = 'QC_TEST_CREATE',
  QC_TEST_VIEW = 'QC_TEST_VIEW',
  QC_TEST_EDIT = 'QC_TEST_EDIT',
  QC_TEST_APPROVE = 'QC_TEST_APPROVE',
  QC_TEST_REJECT = 'QC_TEST_REJECT',

  // Compliance & Audits
  AUDIT_CREATE = 'AUDIT_CREATE',
  AUDIT_VIEW = 'AUDIT_VIEW',
  AUDIT_EDIT = 'AUDIT_EDIT',
  AUDIT_APPROVE = 'AUDIT_APPROVE',
  AUDIT_SUBMIT = 'AUDIT_SUBMIT',

  // Equipment & Maintenance
  EQUIPMENT_VIEW = 'EQUIPMENT_VIEW',
  EQUIPMENT_EDIT = 'EQUIPMENT_EDIT',
  MAINTENANCE_CREATE = 'MAINTENANCE_CREATE',
  MAINTENANCE_VIEW = 'MAINTENANCE_VIEW',
  MAINTENANCE_COMPLETE = 'MAINTENANCE_COMPLETE',

  // Training
  TRAINING_VIEW = 'TRAINING_VIEW',
  TRAINING_ENROLL = 'TRAINING_ENROLL',
  TRAINING_MANAGE = 'TRAINING_MANAGE',
  TRAINING_CREATE = 'TRAINING_CREATE',

  // Alerts & Notifications
  ALERT_VIEW = 'ALERT_VIEW',
  ALERT_CREATE = 'ALERT_CREATE',
  ALERT_ACKNOWLEDGE = 'ALERT_ACKNOWLEDGE',
  ALERT_RESOLVE = 'ALERT_RESOLVE',
  ALERT_DELETE = 'ALERT_DELETE',

  // Action Items
  ACTION_ITEM_VIEW = 'ACTION_ITEM_VIEW',
  ACTION_ITEM_CREATE = 'ACTION_ITEM_CREATE',
  ACTION_ITEM_ASSIGN = 'ACTION_ITEM_ASSIGN',
  ACTION_ITEM_COMPLETE = 'ACTION_ITEM_COMPLETE',

  // Orders & Procurement
  ORDER_VIEW = 'ORDER_VIEW',
  ORDER_CREATE = 'ORDER_CREATE',
  ORDER_EDIT = 'ORDER_EDIT',
  ORDER_APPROVE = 'ORDER_APPROVE',
  ORDER_FULFILL = 'ORDER_FULFILL',

  // Deliveries & Logistics
  DELIVERY_VIEW = 'DELIVERY_VIEW',
  DELIVERY_CREATE = 'DELIVERY_CREATE',
  DELIVERY_UPDATE = 'DELIVERY_UPDATE',
  DELIVERY_CONFIRM = 'DELIVERY_CONFIRM',

  // Analytics & Reports
  ANALYTICS_MILL = 'ANALYTICS_MILL',
  ANALYTICS_REGIONAL = 'ANALYTICS_REGIONAL',
  ANALYTICS_NATIONAL = 'ANALYTICS_NATIONAL',
  REPORT_GENERATE = 'REPORT_GENERATE',
  REPORT_SCHEDULE = 'REPORT_SCHEDULE',

  // User Management
  USER_VIEW = 'USER_VIEW',
  USER_CREATE = 'USER_CREATE',
  USER_EDIT = 'USER_EDIT',
  USER_DELETE = 'USER_DELETE',
  USER_ASSIGN_ROLE = 'USER_ASSIGN_ROLE',

  // System Administration
  SYSTEM_CONFIG = 'SYSTEM_CONFIG',
  AUDIT_LOG_VIEW = 'AUDIT_LOG_VIEW',
  TENANT_MANAGE = 'TENANT_MANAGE',
}

export enum ResourceType {
  BATCH = 'BATCH',
  QC_TEST = 'QC_TEST',
  COMPLIANCE_AUDIT = 'COMPLIANCE_AUDIT',
  EQUIPMENT = 'EQUIPMENT',
  MAINTENANCE = 'MAINTENANCE',
  TRAINING = 'TRAINING',
  ALERT = 'ALERT',
  ACTION_ITEM = 'ACTION_ITEM',
  ORDER = 'ORDER',
  DELIVERY = 'DELIVERY',
  USER = 'USER',
  MILL = 'MILL',
}

/**
 * Base permission mappings for each role
 * Defined separately to avoid circular references
 */
const MILL_OPERATOR_PERMISSIONS: Permission[] = [
  // Batch Management
  Permission.BATCH_CREATE,
  Permission.BATCH_VIEW,
  Permission.BATCH_EDIT,

  // QC Management
  Permission.QC_TEST_CREATE,
  Permission.QC_TEST_VIEW,

  // Equipment & Maintenance
  Permission.EQUIPMENT_VIEW,
  Permission.MAINTENANCE_VIEW,
  Permission.MAINTENANCE_CREATE,

  // Training
  Permission.TRAINING_VIEW,
  Permission.TRAINING_ENROLL,

  // Alerts
  Permission.ALERT_VIEW,
  Permission.ALERT_ACKNOWLEDGE,

  // Action Items
  Permission.ACTION_ITEM_VIEW,
  Permission.ACTION_ITEM_COMPLETE,

  // Analytics
  Permission.ANALYTICS_MILL,
];

const MILL_TECHNICIAN_PERMISSIONS: Permission[] = [
  ...MILL_OPERATOR_PERMISSIONS,

  // Additional QC permissions
  Permission.QC_TEST_EDIT,
  Permission.QC_TEST_APPROVE,

  // Additional Equipment permissions
  Permission.EQUIPMENT_EDIT,
  Permission.MAINTENANCE_COMPLETE,

  // Alert resolution
  Permission.ALERT_RESOLVE,
];

const MILL_MANAGER_PERMISSIONS: Permission[] = [
  ...MILL_TECHNICIAN_PERMISSIONS,

  // Batch approval
  Permission.BATCH_APPROVE,
  Permission.BATCH_DELETE,

  // QC rejection
  Permission.QC_TEST_REJECT,

  // Compliance
  Permission.AUDIT_VIEW,
  Permission.AUDIT_CREATE,
  Permission.AUDIT_EDIT,
  Permission.AUDIT_SUBMIT,

  // Training management
  Permission.TRAINING_MANAGE,

  // Action Items
  Permission.ACTION_ITEM_CREATE,
  Permission.ACTION_ITEM_ASSIGN,

  // Orders
  Permission.ORDER_VIEW,
  Permission.ORDER_CREATE,
  Permission.ORDER_FULFILL,

  // Deliveries
  Permission.DELIVERY_VIEW,
  Permission.DELIVERY_CREATE,

  // Reports
  Permission.REPORT_GENERATE,

  // User management (limited to mill staff)
  Permission.USER_VIEW,
  Permission.USER_CREATE,
  Permission.USER_EDIT,
];

const FWGA_INSPECTOR_PERMISSIONS: Permission[] = [
  // View all mill operations
  Permission.BATCH_VIEW,
  Permission.QC_TEST_VIEW,
  Permission.QC_TEST_APPROVE,
  Permission.QC_TEST_REJECT,

  // Compliance audits
  Permission.AUDIT_VIEW,
  Permission.AUDIT_CREATE,
  Permission.AUDIT_EDIT,
  Permission.AUDIT_APPROVE,

  // Equipment inspection
  Permission.EQUIPMENT_VIEW,
  Permission.MAINTENANCE_VIEW,

  // Training oversight
  Permission.TRAINING_VIEW,
  Permission.TRAINING_MANAGE,

  // Alerts
  Permission.ALERT_VIEW,
  Permission.ALERT_CREATE,
  Permission.ALERT_ACKNOWLEDGE,
  Permission.ALERT_RESOLVE,

  // Action Items
  Permission.ACTION_ITEM_VIEW,
  Permission.ACTION_ITEM_CREATE,
  Permission.ACTION_ITEM_ASSIGN,

  // Analytics
  Permission.ANALYTICS_MILL,
  Permission.ANALYTICS_REGIONAL,

  // Reports
  Permission.REPORT_GENERATE,
  Permission.REPORT_SCHEDULE,
];

const FWGA_PROGRAM_MANAGER_PERMISSIONS: Permission[] = [
  ...FWGA_INSPECTOR_PERMISSIONS,

  // Additional batch permissions
  Permission.BATCH_APPROVE,

  // Training creation
  Permission.TRAINING_CREATE,

  // Full alert management
  Permission.ALERT_DELETE,

  // National analytics
  Permission.ANALYTICS_NATIONAL,

  // User management
  Permission.USER_VIEW,
  Permission.USER_CREATE,
  Permission.USER_EDIT,
  Permission.USER_DELETE,
  Permission.USER_ASSIGN_ROLE,

  // Audit logs
  Permission.AUDIT_LOG_VIEW,
];

/**
 * Role permission mappings
 * Each role has a set of permissions they can perform
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.MILL_OPERATOR]: MILL_OPERATOR_PERMISSIONS,
  [Role.MILL_TECHNICIAN]: MILL_TECHNICIAN_PERMISSIONS,
  [Role.MILL_MANAGER]: MILL_MANAGER_PERMISSIONS,
  [Role.FWGA_INSPECTOR]: FWGA_INSPECTOR_PERMISSIONS,
  [Role.FWGA_PROGRAM_MANAGER]: FWGA_PROGRAM_MANAGER_PERMISSIONS,

  [Role.INSTITUTIONAL_BUYER]: [
    // Orders
    Permission.ORDER_VIEW,
    Permission.ORDER_CREATE,
    Permission.ORDER_EDIT,
    Permission.ORDER_APPROVE,

    // Deliveries
    Permission.DELIVERY_VIEW,
    Permission.DELIVERY_CONFIRM,

    // Limited batch view
    Permission.BATCH_VIEW,

    // QC view for ordered batches
    Permission.QC_TEST_VIEW,

    // Analytics for procurement
    Permission.ANALYTICS_MILL,
    Permission.ANALYTICS_REGIONAL,

    // Reports
    Permission.REPORT_GENERATE,

    // Alerts related to orders
    Permission.ALERT_VIEW,
    Permission.ALERT_ACKNOWLEDGE,
  ],

  [Role.DRIVER_LOGISTICS]: [
    // Deliveries
    Permission.DELIVERY_VIEW,
    Permission.DELIVERY_UPDATE,

    // Orders (view only)
    Permission.ORDER_VIEW,

    // Batches (view for pickup)
    Permission.BATCH_VIEW,

    // Alerts
    Permission.ALERT_VIEW,
    Permission.ALERT_ACKNOWLEDGE,

    // Action Items
    Permission.ACTION_ITEM_VIEW,
    Permission.ACTION_ITEM_COMPLETE,
  ],

  [Role.SYSTEM_ADMIN]: Object.values(Permission),
};

/**
 * Role hierarchy - used for permission inheritance and escalation
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.MILL_OPERATOR]: 1,
  [Role.MILL_TECHNICIAN]: 2,
  [Role.MILL_MANAGER]: 3,
  [Role.DRIVER_LOGISTICS]: 3,
  [Role.FWGA_INSPECTOR]: 4,
  [Role.INSTITUTIONAL_BUYER]: 4,
  [Role.FWGA_PROGRAM_MANAGER]: 5,
  [Role.SYSTEM_ADMIN]: 6,
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a role can access a resource owned by another role
 */
export function canAccessResource(
  userRole: Role,
  resourceRole: Role,
  permission: Permission
): boolean {
  // System admins can access everything
  if (userRole === Role.SYSTEM_ADMIN) {
    return true;
  }

  // Check if user has the required permission
  if (!hasPermission(userRole, permission)) {
    return false;
  }

  // FWGA staff can access mill resources
  if (
    (userRole === Role.FWGA_INSPECTOR || userRole === Role.FWGA_PROGRAM_MANAGER) &&
    (resourceRole === Role.MILL_OPERATOR ||
     resourceRole === Role.MILL_TECHNICIAN ||
     resourceRole === Role.MILL_MANAGER)
  ) {
    return true;
  }

  // Users can access resources at their level or below in hierarchy
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[resourceRole];
}

/**
 * Check if a user can access data from a specific mill
 */
export function canAccessMill(
  userRole: Role,
  userMillId: string | null,
  targetMillId: string
): boolean {
  // System admins can access all mills
  if (userRole === Role.SYSTEM_ADMIN) {
    return true;
  }

  // FWGA staff can access all mills
  if (
    userRole === Role.FWGA_INSPECTOR ||
    userRole === Role.FWGA_PROGRAM_MANAGER
  ) {
    return true;
  }

  // Mill staff can only access their assigned mill
  if (
    userRole === Role.MILL_OPERATOR ||
    userRole === Role.MILL_TECHNICIAN ||
    userRole === Role.MILL_MANAGER
  ) {
    return userMillId === targetMillId;
  }

  // Institutional buyers and drivers have no mill-specific restrictions
  // (they access based on orders/deliveries, not mills)
  return false;
}

/**
 * Check if a user is mill staff
 */
export function isMillStaff(role: Role): boolean {
  return [
    Role.MILL_OPERATOR,
    Role.MILL_TECHNICIAN,
    Role.MILL_MANAGER,
  ].includes(role);
}

/**
 * Check if a user is FWGA staff
 */
export function isFWGAStaff(role: Role): boolean {
  return [
    Role.FWGA_INSPECTOR,
    Role.FWGA_PROGRAM_MANAGER,
  ].includes(role);
}

/**
 * Get human-readable role name
 */
export function getRoleName(role: Role): string {
  const roleNames: Record<Role, string> = {
    [Role.MILL_OPERATOR]: 'Mill Operator',
    [Role.MILL_TECHNICIAN]: 'Mill Technician',
    [Role.MILL_MANAGER]: 'Mill Manager',
    [Role.FWGA_INSPECTOR]: 'FWGA Inspector',
    [Role.FWGA_PROGRAM_MANAGER]: 'FWGA Program Manager',
    [Role.INSTITUTIONAL_BUYER]: 'Institutional Buyer',
    [Role.DRIVER_LOGISTICS]: 'Driver/Logistics',
    [Role.SYSTEM_ADMIN]: 'System Administrator',
  };
  return roleNames[role] || role;
}

/**
 * Get role description
 */
export function getRoleDescription(role: Role): string {
  const descriptions: Record<Role, string> = {
    [Role.MILL_OPERATOR]: 'Day-to-day fortification operations',
    [Role.MILL_TECHNICIAN]: 'Technical support and QC testing',
    [Role.MILL_MANAGER]: 'Mill oversight and compliance',
    [Role.FWGA_INSPECTOR]: 'Quality and compliance audits',
    [Role.FWGA_PROGRAM_MANAGER]: 'Program oversight and strategic planning',
    [Role.INSTITUTIONAL_BUYER]: 'Procurement and order management',
    [Role.DRIVER_LOGISTICS]: 'Delivery and logistics management',
    [Role.SYSTEM_ADMIN]: 'Full system administration',
  };
  return descriptions[role] || '';
}

/**
 * Validate permission requirements
 * Throws error with descriptive message if permission check fails
 */
export function requirePermission(
  role: Role,
  permission: Permission,
  resourceName?: string
): void {
  if (!hasPermission(role, permission)) {
    const roleName = getRoleName(role);
    const resource = resourceName || 'this resource';
    throw new Error(
      `Access denied: ${roleName} does not have permission to access ${resource}`
    );
  }
}

/**
 * Validate multiple permissions
 */
export function requireAllPermissions(
  role: Role,
  permissions: Permission[],
  resourceName?: string
): void {
  if (!hasAllPermissions(role, permissions)) {
    const roleName = getRoleName(role);
    const resource = resourceName || 'this resource';
    throw new Error(
      `Access denied: ${roleName} does not have all required permissions to access ${resource}`
    );
  }
}
