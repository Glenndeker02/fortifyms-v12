# Database Setup Guide

## PostgreSQL Setup

The FortifyMIS Portal requires PostgreSQL 12 or higher.

### 1. Install PostgreSQL

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

#### macOS (using Homebrew)
```bash
brew install postgresql@15
brew services start postgresql@15
```

#### Windows
Download and install from: https://www.postgresql.org/download/windows/

### 2. Create Database

Connect to PostgreSQL:
```bash
sudo -u postgres psql
```

Create database and user:
```sql
-- Create database
CREATE DATABASE fortifyms_dev;

-- Create user (optional, or use default postgres user)
CREATE USER fortifyms_user WITH PASSWORD 'your-secure-password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE fortifyms_dev TO fortifyms_user;

-- Exit
\q
```

### 3. Update Environment Variables

Update the `DATABASE_URL` in your `.env` file:

```env
# If using postgres user (default)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fortifyms_dev?schema=public"

# If using custom user
DATABASE_URL="postgresql://fortifyms_user:your-secure-password@localhost:5432/fortifyms_dev?schema=public"
```

### 4. Run Prisma Migrations

Generate Prisma Client (already done):
```bash
npx prisma generate
```

Push schema to database:
```bash
npx prisma db push
```

This will create all tables, indexes, and relationships defined in `prisma/schema.prisma`.

### 5. Verify Database Setup

Open Prisma Studio to verify tables were created:
```bash
npx prisma studio
```

This will open a browser-based GUI at http://localhost:5555 where you can view and edit your database.

## Database Schema

The database includes 60+ models covering:

- **User Management**: Users, profiles, roles, permissions
- **Mill Operations**: Mills, equipment, batch logging
- **Training**: Modules, content, progress, certificates
- **Production**: Batches, premix inventory, production logs
- **Quality Control**: QC tests, calibration, test results
- **Compliance**: Audits, scores, annotations, certificates
- **Procurement**: RFPs, bids, orders, deliveries
- **Logistics**: Shipments, tracking, route optimization
- **Alerts**: Real-time notifications, escalations, preferences
- **Diagnostics**: Decision trees, results, recommendations

## Seeding Initial Data

Once the database is set up, you can seed it with initial data:

```bash
npm run seed
```

This will create:
- Default admin user
- Sample mills
- Training modules
- Diagnostic decision trees
- Sample data for testing

## Production Database

For production deployment, use a managed PostgreSQL service:

- **AWS RDS**: https://aws.amazon.com/rds/postgresql/
- **Google Cloud SQL**: https://cloud.google.com/sql/docs/postgres
- **Azure Database**: https://azure.microsoft.com/en-us/products/postgresql/
- **Supabase**: https://supabase.com/
- **Neon**: https://neon.tech/
- **Railway**: https://railway.app/

Update your production `.env` with the provided connection string.

## Troubleshooting

### Connection Refused
- Ensure PostgreSQL is running: `sudo service postgresql status`
- Check port 5432 is not blocked by firewall
- Verify connection string in `.env`

### Permission Denied
- Grant proper privileges to database user
- Check PostgreSQL `pg_hba.conf` for authentication settings

### Schema Sync Issues
```bash
# Reset database (CAUTION: Deletes all data)
npx prisma db push --force-reset

# Or use migrations for production
npx prisma migrate dev --name init
```

## Next Steps

After database setup:
1. Run `npm run dev` to start development server
2. Visit http://localhost:3000
3. Login with seeded admin credentials
4. Begin configuring your mills and users
