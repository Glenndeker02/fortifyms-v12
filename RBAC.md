# Role-Based Access Control (RBAC) Documentation

## Overview

The FortifyMS RBAC system provides fine-grained access control based on user roles, permissions, and tenant/mill hierarchy. It ensures that users only access functionality and data appropriate to their responsibilities.

## Architecture

The RBAC system consists of three main components:

### 1. Core RBAC (`src/lib/rbac.ts`)

Defines:
- **8 Roles**: System structure with hierarchy
- **50+ Permissions**: Granular access controls
- **Resource Types**: Different data models
- **Helper Functions**: Permission checking utilities

### 2. Permission Middleware (`src/lib/permissions-middleware.ts`)

Provides:
- `requirePermissions()` - Verify user has required permissions
- `requireResourceAccess()` - Check access to specific resources
- `requireMillAccess()` - Verify mill-level access
- `buildPermissionWhere()` - Auto-filter queries by permissions
- `getAccessibleMills()` - Get mills user can access

### 3. Multi-Tenancy (`src/lib/multi-tenancy.ts`)

Manages:
- Tenant hierarchy (National → Regional → Mill)
- Tenant-specific settings and features
- Data isolation between tenants
- Feature flags per tenant type

## Roles

### Mill Staff
1. **Mill Operator**
   - Day-to-day fortification operations
   - Batch creation and basic QC
   - Equipment monitoring
   - Training access
   - **Scope**: Own mill only

2. **Mill Technician**
   - All Operator permissions
   - QC test approval/rejection
   - Equipment maintenance
   - Advanced diagnostics
   - **Scope**: Own mill only

3. **Mill Manager**
   - All Technician permissions
   - Batch approval
   - Compliance audits
   - User management (mill staff)
   - Order fulfillment
   - **Scope**: Own mill only

### FWGA Staff
4. **FWGA Inspector**
   - Quality and compliance audits
   - Multi-mill oversight
   - QC approval/rejection
   - Training management
   - Regional analytics
   - **Scope**: All mills in tenant

5. **FWGA Program Manager**
   - All Inspector permissions
   - National-level analytics
   - User management (all roles)
   - Program oversight
   - Strategic planning
   - **Scope**: All mills in tenant + sub-tenants

### Other Roles
6. **Institutional Buyer**
   - Order management
   - Delivery tracking
   - Supplier performance
   - Procurement analytics
   - **Scope**: Own orders only

7. **Driver/Logistics**
   - Delivery updates
   - Order tracking
   - Route management
   - **Scope**: Assigned deliveries only

8. **System Administrator**
   - Full system access
   - Tenant management
   - System configuration
   - All permissions
   - **Scope**: Global

## Permission Categories

### Batch Management
- `BATCH_CREATE` - Create new batches
- `BATCH_VIEW` - View batch data
- `BATCH_EDIT` - Modify batch information
- `BATCH_DELETE` - Delete batches
- `BATCH_APPROVE` - Approve batches for release

### QC Management
- `QC_TEST_CREATE` - Create QC tests
- `QC_TEST_VIEW` - View test results
- `QC_TEST_EDIT` - Modify test data
- `QC_TEST_APPROVE` - Approve test results
- `QC_TEST_REJECT` - Reject failing tests

### Compliance & Audits
- `AUDIT_CREATE` - Create audit records
- `AUDIT_VIEW` - View audit data
- `AUDIT_EDIT` - Modify audits
- `AUDIT_APPROVE` - Approve audit findings
- `AUDIT_SUBMIT` - Submit audits for review

### Equipment & Maintenance
- `EQUIPMENT_VIEW` - View equipment data
- `EQUIPMENT_EDIT` - Modify equipment records
- `MAINTENANCE_CREATE` - Log maintenance activities
- `MAINTENANCE_VIEW` - View maintenance history
- `MAINTENANCE_COMPLETE` - Mark maintenance complete

### Alerts & Notifications
- `ALERT_VIEW` - View alerts
- `ALERT_CREATE` - Create new alerts
- `ALERT_ACKNOWLEDGE` - Acknowledge alerts
- `ALERT_RESOLVE` - Resolve alerts
- `ALERT_DELETE` - Delete alerts (admins only)

### Analytics & Reports
- `ANALYTICS_MILL` - Mill-level analytics
- `ANALYTICS_REGIONAL` - Regional analytics
- `ANALYTICS_NATIONAL` - National-level analytics
- `REPORT_GENERATE` - Generate reports
- `REPORT_SCHEDULE` - Schedule automated reports

[See `src/lib/rbac.ts` for complete permission list]

## Usage in API Routes

### Basic Pattern

```typescript
import { requirePermissions } from '@/lib/permissions-middleware';
import { Permission } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  try {
    // Check permission
    const session = await requirePermissions(Permission.BATCH_VIEW, 'batches');

    // Your logic here
    const batches = await db.batch.findMany();

    return successResponse(batches);
  } catch (error) {
    return handleApiError(error);
  }
}
```

### List Resources with Auto-Filtering

```typescript
import { buildPermissionWhere } from '@/lib/permissions-middleware';

export async function GET(request: NextRequest) {
  const session = await requirePermissions(Permission.BATCH_VIEW);

  // Automatically filters by tenant and mill (for mill staff)
  const where = buildPermissionWhere(session, {
    status: 'COMPLETED',
  });

  const batches = await db.batch.findMany({ where });
  return successResponse(batches);
}
```

### Access Specific Resource

```typescript
import { requireResourceAccess } from '@/lib/permissions-middleware';
import { ResourceType } from '@/lib/rbac';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requirePermissions(Permission.BATCH_VIEW);

  // Verifies: existence, tenant, mill, and user access
  const batch = await requireResourceAccess(
    session,
    ResourceType.BATCH,
    params.id
  );

  return successResponse(batch);
}
```

### Multiple Permissions

```typescript
// User must have ALL specified permissions
const session = await requirePermissions(
  [Permission.BATCH_CREATE, Permission.QC_TEST_CREATE],
  'batch creation'
);
```

### Conditional Logic

```typescript
import { hasPermission } from '@/lib/rbac';

const session = await requirePermissions(Permission.BATCH_EDIT);

// Additional check for sensitive operation
if (body.status === 'APPROVED') {
  if (!hasPermission(session.user.role, Permission.BATCH_APPROVE)) {
    return errorResponse('Cannot approve batches', 403);
  }
}
```

### Mill Access Verification

```typescript
import { requireMillAccess } from '@/lib/permissions-middleware';

const session = await requirePermissions(Permission.BATCH_CREATE);
const { millId } = await request.json();

// Verify user can access this mill
await requireMillAccess(session, millId);

const batch = await db.batch.create({
  data: { millId, ... }
});
```

## Data Isolation

### Tenant Hierarchy

```
National Program (Tenant A)
  ├── Regional Office 1 (Tenant B)
  │   ├── Mill 1
  │   └── Mill 2
  └── Regional Office 2 (Tenant C)
      ├── Mill 3
      └── Mill 4
```

### Access Rules

1. **Mill Staff**: Can only access their assigned mill's data
2. **FWGA Staff**: Can access all mills in their tenant and sub-tenants
3. **System Admins**: Can access all data globally
4. **Buyers/Drivers**: Access based on their specific orders/deliveries

### Automatic Filtering

When using `buildPermissionWhere()`:
- Automatically adds `tenantId` filter
- Automatically adds `millId` filter for mill staff
- Respects tenant hierarchy for FWGA staff

### Example

```typescript
// For Mill Operator at Mill 1
const where = buildPermissionWhere(session);
// Result: { tenantId: 'tenant-b', millId: 'mill-1' }

// For FWGA Inspector in Regional Office 1
const where = buildPermissionWhere(session);
// Result: { tenantId: { in: ['tenant-b', 'mill-1-tenant', 'mill-2-tenant'] } }

// For System Admin
const where = buildPermissionWhere(session);
// Result: {} (no restrictions)
```

## Multi-Tenancy Features

### Tenant Configuration

Each tenant can have custom settings:

```typescript
import { getTenantConfig, updateTenantSettings } from '@/lib/multi-tenancy';

const config = await getTenantConfig(tenantId);

// Update settings
await updateTenantSettings(tenantId, {
  minimumFortificationLevel: 35,
  qcPassThreshold: 98,
  requireDualApproval: true,
});
```

### Feature Flags

Different tenant types have different features:

```typescript
import { isFeatureEnabled } from '@/lib/multi-tenancy';

// Check if feature is enabled
if (await isFeatureEnabled(tenantId, 'advancedAnalytics')) {
  // Show advanced analytics
}
```

### Tenant Types

- **NATIONAL**: Full features, multi-language, API access
- **REGIONAL**: Advanced analytics, custom reports
- **MILL**: Core features, offline mode
- **INSTITUTIONAL**: Order/delivery focused, limited features

## Migration Guide

### Updating Existing Routes

1. **Replace `requireAuth()` with `requirePermissions()`**

```typescript
// Before
const session = await requireAuth();

// After
const session = await requirePermissions(Permission.BATCH_VIEW, 'batches');
```

2. **Update WHERE clauses**

```typescript
// Before
const where: any = {};
if (isMillStaff(session.user.role)) {
  where.millId = session.user.millId;
}

// After
const where = buildPermissionWhere(session);
```

3. **Add resource access checks**

```typescript
// Before
const batch = await db.batch.findUnique({ where: { id } });
if (!batch) return errorResponse('Not found', 404);

// After
const batch = await requireResourceAccess(session, ResourceType.BATCH, id);
```

4. **Add audit logging**

```typescript
await db.auditLog.create({
  data: {
    userId: session.user.id,
    action: 'BATCH_UPDATE',
    resourceType: 'BATCH',
    resourceId: batch.id,
    oldValues: oldBatch,
    newValues: updatedBatch,
    ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
  },
});
```

## Testing

### Test Different Roles

```typescript
// Create test users with different roles
const operator = await createTestUser({ role: Role.MILL_OPERATOR, millId: 'mill-1' });
const manager = await createTestUser({ role: Role.MILL_MANAGER, millId: 'mill-1' });
const inspector = await createTestUser({ role: Role.FWGA_INSPECTOR, tenantId: 'tenant-1' });

// Test permissions
expect(hasPermission(Role.MILL_OPERATOR, Permission.BATCH_CREATE)).toBe(true);
expect(hasPermission(Role.MILL_OPERATOR, Permission.BATCH_APPROVE)).toBe(false);
```

### Test Data Isolation

```typescript
// Operator from Mill 1 shouldn't see Mill 2's batches
const session = createSession({ role: Role.MILL_OPERATOR, millId: 'mill-1' });
const where = buildPermissionWhere(session);

const batches = await db.batch.findMany({ where });
expect(batches.every(b => b.millId === 'mill-1')).toBe(true);
```

## Security Best Practices

1. **Always check permissions** at the API route level, not just in the UI
2. **Use resource access checks** for specific resources
3. **Validate tenant isolation** for all data operations
4. **Create audit logs** for sensitive operations
5. **Return appropriate errors** without leaking sensitive information
6. **Use type-safe permissions** from the Permission enum
7. **Test permission boundaries** thoroughly
8. **Document custom permission logic** in code comments

## Common Patterns

### Pattern 1: View Own Resources

```typescript
const session = await requirePermissions(Permission.ACTION_ITEM_VIEW);
const actionItems = await db.actionItem.findMany({
  where: {
    assignedToId: session.user.id,
  },
});
```

### Pattern 2: Manager Override

```typescript
const session = await requirePermissions(Permission.BATCH_VIEW);
const where: any = buildPermissionWhere(session);

// Managers can see all batches from their mill
if (session.user.role === Role.MILL_MANAGER && session.user.millId) {
  // Override default filtering
  where.millId = session.user.millId;
}
```

### Pattern 3: Hierarchical Access

```typescript
import { canAccessTenant } from '@/lib/multi-tenancy';

const canAccess = await canAccessTenant(
  session.user.tenantId,
  resource.tenantId
);

if (!canAccess) {
  return errorResponse('Access denied', 403);
}
```

## Troubleshooting

### Error: "User not assigned to mill"

Mill staff users must have a `millId` set. Check:
```sql
SELECT id, name, role, millId FROM users WHERE id = 'user-id';
```

### Error: "Access denied: Resource belongs to different organization"

Tenant mismatch. Verify:
```sql
SELECT tenantId FROM users WHERE id = 'user-id';
SELECT tenantId FROM batches WHERE id = 'batch-id';
```

### Permissions not working

Check role permissions mapping:
```typescript
import { getRolePermissions } from '@/lib/rbac';
console.log(getRolePermissions(Role.MILL_OPERATOR));
```

## Reference Files

- **RBAC Core**: `src/lib/rbac.ts`
- **Middleware**: `src/lib/permissions-middleware.ts`
- **Multi-Tenancy**: `src/lib/multi-tenancy.ts`
- **API Example**: `src/app/api/example-rbac-usage/route.ts`
- **Prisma Schema**: `prisma/schema.prisma` (User, Tenant models)

## Support

For questions or issues:
1. Review example files in `src/app/api/example-rbac-usage/`
2. Check existing API routes for patterns
3. Refer to PRD Section 3.9 for requirements
4. Check audit logs for permission errors
