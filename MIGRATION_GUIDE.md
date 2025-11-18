# Migration Guide - RBAC & Multi-Tenancy

This guide will help you migrate the database and test the new RBAC and multi-tenancy features.

## 📋 Prerequisites

- PostgreSQL database running
- `.env` file configured with `DATABASE_URL`
- Node.js and npm installed

## 🗄️ Database Migration

### Step 1: Generate Prisma Client

```bash
npm run db:generate
```

This generates the Prisma client with the new Tenant model and updated schemas.

### Step 2: Create Migration

```bash
npx prisma migrate dev --name add-tenancy-and-rbac
```

This will:
- Create a new migration file
- Apply the migration to your database
- Add Tenant table
- Add tenantId columns to User, Mill, Alert, ActionItem, AuditLog
- Add ErrorLog table
- Update UserRole enum

**Note**: If you get errors about existing data, you may need to:
1. Backup existing data
2. Add default values for new columns
3. Or use `--create-only` flag and modify the migration manually

### Step 3: Seed the Database

```bash
npm run db:seed
```

This creates:
- 3 Tenants (National, Regional, Institutional)
- 2 Mills
- 8 Users with different roles
- Sample data (equipment, batches, training)

## 🧪 Testing

### Test User Credentials

All users have password: `password123`

| Role | Email | Tenant | Mill |
|------|-------|--------|------|
| System Admin | admin@fortifyms.com | National | - |
| Program Manager | pm@fwga.org | National | - |
| Inspector | inspector@fwga.org | Regional | - |
| Mill Manager | manager@mill1.com | Regional | Mill 1 |
| Mill Technician | technician@mill1.com | Regional | Mill 1 |
| Mill Operator | operator@mill1.com | Regional | Mill 1 |
| Institutional Buyer | buyer@school.edu | WFP | - |
| Driver | driver@logistics.com | Regional | - |

### Permission Testing Scenarios

#### Scenario 1: Mill Operator Permissions
```bash
# Login as: operator@mill1.com / password123
```

**Should be able to:**
- ✅ View batches from their mill
- ✅ Create new batches
- ✅ Create QC tests
- ✅ View equipment and maintenance
- ✅ Enroll in training
- ✅ View and acknowledge alerts

**Should NOT be able to:**
- ❌ View batches from other mills
- ❌ Approve batches
- ❌ Approve/reject QC tests
- ❌ Create compliance audits
- ❌ View national analytics

#### Scenario 2: Mill Manager Permissions
```bash
# Login as: manager@mill1.com / password123
```

**Should be able to:**
- ✅ All Mill Operator permissions
- ✅ Approve batches
- ✅ Approve/reject QC tests
- ✅ Create and submit compliance audits
- ✅ Manage mill staff users
- ✅ Create and assign action items
- ✅ Generate mill-level reports

**Should NOT be able to:**
- ❌ View other mills' data
- ❌ Approve compliance audits (FWGA only)
- ❌ View national-level analytics
- ❌ Manage FWGA staff

#### Scenario 3: FWGA Inspector Permissions
```bash
# Login as: inspector@fwga.org / password123
```

**Should be able to:**
- ✅ View all mills in their region
- ✅ Create and approve compliance audits
- ✅ Approve/reject QC tests
- ✅ Create alerts for mills
- ✅ View regional analytics
- ✅ Generate regional reports

**Should NOT be able to:**
- ❌ Create batches
- ❌ Modify mill operations directly
- ❌ View other regions' mills (without permission)
- ❌ Manage national-level settings

#### Scenario 4: FWGA Program Manager Permissions
```bash
# Login as: pm@fwga.org / password123
```

**Should be able to:**
- ✅ All Inspector permissions
- ✅ View ALL mills nationally
- ✅ Approve compliance audits
- ✅ Create and manage users (all roles)
- ✅ View national analytics
- ✅ Generate all report types
- ✅ Configure system settings

**Should NOT be able to:**
- ❌ Directly operate mill equipment
- ❌ Override system admin settings

#### Scenario 5: System Admin Permissions
```bash
# Login as: admin@fortifyms.com / password123
```

**Should be able to:**
- ✅ Everything (all permissions)
- ✅ Manage tenants
- ✅ Configure system-wide settings
- ✅ View audit logs
- ✅ Access all data globally

### API Testing

#### Test 1: Mill Operator - View Own Mill Batches
```bash
curl -X GET http://localhost:3000/api/batches \
  -H "Cookie: next-auth.session-token=..." \
  -H "Content-Type: application/json"
```

**Expected**: Returns only batches from Mill 1 (KEN001)

#### Test 2: Mill Operator - Try to View Other Mill
```bash
curl -X GET http://localhost:3000/api/batches?millId=KEN002 \
  -H "Cookie: next-auth.session-token=..." \
  -H "Content-Type: application/json"
```

**Expected**: Returns 403 Forbidden (no access to Mill 2)

#### Test 3: FWGA Inspector - View All Mills
```bash
curl -X GET http://localhost:3000/api/analytics/fwga-inspector \
  -H "Cookie: next-auth.session-token=..." \
  -H "Content-Type: application/json"
```

**Expected**: Returns data for all mills in their region

#### Test 4: Program Manager - National Analytics
```bash
curl -X GET http://localhost:3000/api/analytics/fwga-program-manager \
  -H "Cookie: next-auth.session-token=..." \
  -H "Content-Type: application/json"
```

**Expected**: Returns national-level analytics with all mills

### Data Isolation Testing

#### Test Tenant Hierarchy
```bash
# As Program Manager (National Tenant)
# Should see: National + Regional + Institutional tenants and all mills

# As Inspector (Regional Tenant)
# Should see: Regional tenant and only Nairobi mills

# As Mill Manager (Regional Tenant, Mill 1)
# Should see: Only Mill 1 data
```

## 🔄 Updating Existing Routes

### Example: Update Batch API with RBAC

**Before:**
```typescript
export async function GET(request: NextRequest) {
  const session = await requireAuth();

  const where: any = {};
  if (isMillStaff(session.user.role)) {
    where.millId = session.user.millId;
  }

  const batches = await db.batch.findMany({ where });
  return successResponse(batches);
}
```

**After:**
```typescript
import { requirePermissions, buildPermissionWhere } from '@/lib/permissions-middleware';
import { Permission } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  // Check permission
  const session = await requirePermissions(Permission.BATCH_VIEW, 'batches');

  // Auto-filter by tenant and mill
  const where = buildPermissionWhere(session);

  const batches = await db.batch.findMany({ where });
  return successResponse(batches);
}
```

### Routes to Update

Priority routes to migrate:
1. ✅ `/api/batches` - Batch management
2. ✅ `/api/qc` - QC testing
3. ✅ `/api/compliance/audits` - Compliance audits
4. ✅ `/api/equipment` - Equipment management
5. ✅ `/api/maintenance` - Maintenance tasks
6. ✅ `/api/training` - Training management
7. ✅ `/api/alerts` - Alert management (already using RBAC)
8. ✅ `/api/action-items` - Action items (already using RBAC)

## 🐛 Troubleshooting

### Migration Errors

#### Error: Column already exists
```
column "tenantId" of relation "users" already exists
```

**Solution**: Drop and recreate the database, or use migration rollback:
```bash
npx prisma migrate reset
```

#### Error: Foreign key constraint fails
```
insert or update on table "users" violates foreign key constraint
```

**Solution**: Ensure tenants are created before users. Run seed in order.

### Permission Errors

#### User can't access their own mill data
**Check:**
1. User has `millId` set correctly
2. User's `tenantId` matches mill's `tenantId`
3. User's role has required permission

```sql
-- Verify user setup
SELECT id, email, role, millId, tenantId FROM users WHERE email = 'operator@mill1.com';

-- Verify mill setup
SELECT id, code, name, tenantId FROM mills WHERE code = 'KEN001';
```

#### Inspector can't see mill data
**Check:**
1. Inspector's `tenantId` is parent of mill's `tenantId`
2. Inspector role has `ANALYTICS_REGIONAL` permission

### Seed Data Issues

#### Seed fails with "Unique constraint"
**Solution**: Clear existing data or use upsert (already implemented)

```bash
npx prisma migrate reset --skip-seed
npm run db:seed
```

## 📊 Monitoring

### Check Tenant Hierarchy
```sql
SELECT
  t.id,
  t.name,
  t.type,
  p.name as parent_name
FROM tenants t
LEFT JOIN tenants p ON t.parent_id = p.id
ORDER BY t.type, t.name;
```

### Check User-Tenant-Mill Relationships
```sql
SELECT
  u.email,
  u.role,
  t.name as tenant,
  m.code as mill
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
LEFT JOIN mills m ON u.mill_id = m.id
ORDER BY u.role, u.email;
```

### Check Permission Usage
```sql
SELECT
  action,
  COUNT(*) as count
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY action
ORDER BY count DESC;
```

## 🚀 Next Steps

1. **Apply Migration**: Run `npx prisma migrate dev`
2. **Seed Database**: Run `npm run db:seed`
3. **Test Login**: Try logging in as different roles
4. **Test Permissions**: Verify access controls work
5. **Update Routes**: Gradually migrate existing routes
6. **Monitor Logs**: Check audit logs and error logs
7. **Performance**: Add database indexes if needed

## 📚 Additional Resources

- [RBAC Documentation](./RBAC.md)
- [Example API Routes](./docs/examples/example-rbac-usage/)
- [Multi-Tenancy Utilities](./src/lib/multi-tenancy.ts)
- [Permission Middleware](./src/lib/permissions-middleware.ts)

## ⚠️ Important Notes

1. **Backup First**: Always backup your database before migration
2. **Test Environment**: Test in development before production
3. **User Assignment**: Ensure all users have proper `tenantId` and `millId`
4. **Gradual Migration**: Update routes gradually, not all at once
5. **Monitor Performance**: Watch for query performance with new joins

## 🎯 Success Criteria

✅ Database migration completes without errors
✅ Seed data creates all tenants and users
✅ Users can login with correct roles
✅ Permission checks prevent unauthorized access
✅ Data isolation works (users only see their tenant's data)
✅ Audit logs are created for all operations
✅ Error logs capture system errors

---

For questions or issues, refer to RBAC.md or check the example routes in docs/examples/.
