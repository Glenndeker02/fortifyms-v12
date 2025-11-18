# RBAC Migration Status

## Overview

This document tracks the migration of API routes from the legacy authentication system to the new Role-Based Access Control (RBAC) system.

**Migration Started**: November 17, 2025
**Last Updated**: November 18, 2025
**Status**: In Progress (11/18 routes migrated - 61%)

---

## Migration Pattern

### Old Pattern (Legacy)
```typescript
import { requireAuth } from '@/lib/api-helpers';
import { isMillStaff, canAccessMillData } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await requireAuth();

  // Manual role checking
  if (isMillStaff(session.user.role)) {
    if (!session.user.millId) {
      return errorResponse('User is not assigned to a mill', 403);
    }
    where.millId = session.user.millId;
  }
  // ... rest of logic
}
```

### New Pattern (RBAC)
```typescript
import { requirePermissions, buildPermissionWhere } from '@/lib/permissions-middleware';
import { Permission, isMillStaff, Role } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  // Permission check replaces requireAuth
  const session = await requirePermissions(Permission.BATCH_VIEW, 'batches');

  // Build base where clause
  const baseWhere: any = {};

  // Apply automatic data isolation
  const where = buildPermissionWhere(session, baseWhere);

  // ... rest of logic
}
```

---

## ✅ Migrated Routes (11/18)

### Batches Module (3/3)
- [x] **`/api/batches/route.ts`** - List and create batches
  - GET: `Permission.BATCH_VIEW` with `buildPermissionWhere()`
  - POST: `Permission.BATCH_CREATE` with mill assignment

- [x] **`/api/batches/[id]/route.ts`** - Individual batch operations
  - GET: `Permission.BATCH_VIEW` with mill access check
  - PATCH: `Permission.BATCH_EDIT`, status updates require `Role.MILL_MANAGER`
  - DELETE: `Permission.BATCH_DELETE`, enforces `Role.SYSTEM_ADMIN` only

- [x] **`/api/batches/stats/route.ts`** - Batch statistics
  - GET: `Permission.BATCH_VIEW` with `buildPermissionWhere()` for auto-filtering

### QC Testing Module (2/3)
- [x] **`/api/qc/route.ts`** - List and create QC tests
  - GET: `Permission.QC_TEST_VIEW` with automatic mill filtering
  - POST: `Permission.QC_TEST_CREATE` with validation

- [x] **`/api/qc/[id]/route.ts`** - Individual QC test operations
  - GET: `Permission.QC_TEST_VIEW` with mill access check
  - PATCH: `Permission.QC_TEST_EDIT` for updates, approval requires technician+
  - DELETE: `Permission.QC_TEST_DELETE` (admin only)

### Compliance Module (2/3)
- [x] **`/api/compliance/audits/route.ts`** - List and create audits
  - GET: `Permission.AUDIT_VIEW` with cross-mill access for FWGA
  - POST: `Permission.AUDIT_CREATE` with template validation

- [x] **`/api/compliance/audits/[id]/route.ts`** - Individual audit operations
  - GET: `Permission.AUDIT_VIEW` with mill access check
  - PATCH: Complex status transitions with role checks
  - DELETE: `Permission.AUDIT_DELETE` (admin only)

### Maintenance Module (2/3)
- [x] **`/api/maintenance/tasks/route.ts`** - List and create tasks
  - GET: `Permission.MAINTENANCE_VIEW` with filtering
  - POST: `Permission.MAINTENANCE_CREATE` with equipment validation

- [x] **`/api/maintenance/tasks/[id]/route.ts`** - Individual task operations
  - GET: `Permission.MAINTENANCE_VIEW` with mill access check
  - PATCH: Status transitions with validation
  - DELETE: `Permission.MAINTENANCE_DELETE` (admin only)

### Training Module (2/3)
- [x] **`/api/training/courses/route.ts`** - List and create courses
  - GET: `Permission.TRAINING_VIEW`
  - POST: `Permission.TRAINING_MANAGE` (managers only)

- [x] **`/api/training/courses/[id]/route.ts`** - Individual course operations
  - GET: `Permission.TRAINING_VIEW`
  - PATCH: `Permission.TRAINING_MANAGE`
  - DELETE: `Permission.TRAINING_MANAGE` (managers only)

---

## ⏳ Remaining Routes (7/18)

### QC Testing Module (1 remaining)
- [ ] **`/api/qc/stats/route.ts`** - QC statistics
  - **Complexity**: Medium
  - **Changes Needed**: Add `Permission.QC_TEST_VIEW`, apply `buildPermissionWhere()`
  - **Priority**: High (used in dashboards)
  - **Similar to**: `/api/batches/stats/route.ts` ✅

### Compliance Module (1 remaining)
- [ ] **`/api/compliance/audits/submit/route.ts`** - Submit audit for review
  - **Complexity**: Medium
  - **Changes Needed**: Add `Permission.AUDIT_SUBMIT`, verify auditor
  - **Priority**: Medium
  - **Notes**: Only auditor can submit their own audits

### Maintenance Module (1 remaining)
- [ ] **`/api/maintenance/tasks/stats/route.ts`** - Maintenance statistics
  - **Complexity**: Low
  - **Changes Needed**: Add `Permission.MAINTENANCE_VIEW`, apply filtering
  - **Priority**: Medium

### Training Module (1 remaining)
- [ ] **`/api/training/progress/route.ts`** - Training progress tracking
  - **Complexity**: Medium
  - **Changes Needed**: Add `Permission.TRAINING_VIEW`, user-specific filtering
  - **Priority**: Medium
  - **Notes**: Users can only see their own progress unless manager/admin

### Reports Module (1 remaining)
- [ ] **`/api/reports/route.ts`** - Report generation
  - **Complexity**: High
  - **Changes Needed**: Add `Permission.REPORT_GENERATE`, complex filtering
  - **Priority**: Low (not used in core flows)
  - **Notes**: Different report types require different permissions

### Analytics Module (2 remaining)
- [ ] **`/api/analytics/dashboard/route.ts`** - Dashboard analytics
  - **Complexity**: High
  - **Changes Needed**: Role-based data scoping (mill vs national)
  - **Priority**: High (used in all dashboards)
  - **Notes**: Currently uses mock data, needs real queries with RBAC

- [ ] **`/api/analytics/trends/route.ts`** - Trend analysis
  - **Complexity**: High
  - **Changes Needed**: Add `Permission.ANALYTICS_*` based on scope
  - **Priority**: Medium
  - **Notes**: Time-series queries with permission-based filtering

---

## 🔍 Recently Reviewed (Not Yet Migrated)

These routes were read during analysis but haven't been migrated yet:

1. **`/api/qc/stats/route.ts`** (Read)
   - Uses old `requireAuth()` pattern
   - Needs `Permission.QC_TEST_VIEW` and `buildPermissionWhere()`
   - Similar to batches/stats which is ✅ migrated

2. **`/api/compliance/audits/[id]/route.ts`** (Read)
   - Complex status transitions already implemented
   - Already using some RBAC patterns (✅ Migrated)

3. **`/api/maintenance/tasks/[id]/route.ts`** (Read)
   - Already migrated ✅

---

## 📊 Migration Statistics

| Module | Total Routes | Migrated | Remaining | % Complete |
|--------|-------------|----------|-----------|------------|
| **Batches** | 3 | 3 | 0 | 100% ✅ |
| **QC Testing** | 3 | 2 | 1 | 67% 🟡 |
| **Compliance** | 3 | 2 | 1 | 67% 🟡 |
| **Maintenance** | 3 | 2 | 1 | 67% 🟡 |
| **Training** | 3 | 2 | 1 | 67% 🟡 |
| **Reports** | 1 | 0 | 1 | 0% 🔴 |
| **Analytics** | 2 | 0 | 2 | 0% 🔴 |
| **TOTAL** | **18** | **11** | **7** | **61%** |

---

## 🎯 Next Steps

### Phase 1: Complete Core Modules (Priority: High)
1. Migrate `/api/qc/stats/route.ts` - QC statistics for dashboards
2. Migrate `/api/maintenance/tasks/stats/route.ts` - Maintenance statistics
3. Migrate `/api/compliance/audits/submit/route.ts` - Audit submission

### Phase 2: Complete Supporting Modules (Priority: Medium)
4. Migrate `/api/training/progress/route.ts` - Training progress
5. Migrate `/api/analytics/dashboard/route.ts` - Dashboard analytics
6. Migrate `/api/analytics/trends/route.ts` - Trend analysis

### Phase 3: Advanced Features (Priority: Low)
7. Migrate `/api/reports/route.ts` - Report generation

### Phase 4: Testing & Verification
- Run comprehensive RBAC tests (see `TESTING_GUIDE.md`)
- Verify data isolation for each role
- Test permission inheritance
- Verify audit logging

### Phase 5: Documentation & Cleanup
- Update API documentation with permission requirements
- Remove old auth helper functions
- Update frontend to use new permission-aware components
- Create deployment checklist

---

## 🚨 Breaking Changes

### For API Consumers

**Before (Legacy)**:
```typescript
// Any authenticated user could access
const response = await fetch('/api/batches');
```

**After (RBAC)**:
```typescript
// Must have BATCH_VIEW permission
// Mill staff automatically filtered to their mill
const response = await fetch('/api/batches');
// Returns 403 if user lacks permission
```

### For Developers

1. **Import Changes**:
   ```typescript
   // Old
   import { requireAuth } from '@/lib/api-helpers';
   import { isMillStaff } from '@/lib/auth';

   // New
   import { requirePermissions, buildPermissionWhere } from '@/lib/permissions-middleware';
   import { Permission, Role, isMillStaff } from '@/lib/rbac';
   ```

2. **Permission Checks**:
   ```typescript
   // Old: Manual role checking
   if (session.user.role !== 'SYSTEM_ADMIN') {
     return errorResponse('Forbidden', 403);
   }

   // New: Permission-based checking
   const session = await requirePermissions(Permission.BATCH_DELETE, 'batches');
   if (session.user.role !== Role.SYSTEM_ADMIN) {
     return errorResponse('Only system administrators can delete batches', 403);
   }
   ```

3. **Data Filtering**:
   ```typescript
   // Old: Manual filtering
   if (isMillStaff(session.user.role)) {
     where.millId = session.user.millId;
   }

   // New: Automatic filtering
   const where = buildPermissionWhere(session, baseWhere);
   ```

---

## 📝 Notes

- All migrated routes have been tested with `npm run build` ✅
- Build completes successfully with expected dynamic route warnings
- Circular reference issue in `src/lib/rbac.ts` has been fixed ✅
- Audit logging is automatically created for all update/delete operations
- Session expiration set to 24 hours
- All routes use TypeScript strict mode with proper type safety

---

## 🔗 Related Documentation

- [`TESTING_GUIDE.md`](./TESTING_GUIDE.md) - Comprehensive testing scenarios
- [`MIGRATION_GUIDE.md`](./MIGRATION_GUIDE.md) - Database setup and migration
- [`src/lib/rbac.ts`](./src/lib/rbac.ts) - Permission definitions and role mappings
- [`src/lib/permissions-middleware.ts`](./src/lib/permissions-middleware.ts) - Middleware implementation

---

**Last Migration**: `/api/batches/[id]/route.ts` and `/api/batches/stats/route.ts` (Nov 18, 2025)
**Next Target**: `/api/qc/stats/route.ts`
