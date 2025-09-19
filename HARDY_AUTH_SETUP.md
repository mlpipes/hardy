# 🏥 Hardy Auth Backend Setup Guide

This guide will help you set up the new Hardy Auth backend with proper database naming and migrate from the old MLPipes Auth setup.

## 🚀 Quick Start

### Prerequisites

- Docker Desktop installed and running
- Node.js 18+ and npm 8+
- PostgreSQL client tools (optional, for manual database access)

### 1. Clone and Setup

```bash
# Navigate to the Hardy Auth directory
cd /Users/alsabay/mlpipes/CARIHealth/dev/mlpipes-auth

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local
```

### 2. Start Hardy Auth Backend

```bash
# Run the automated setup script
npm run hardy:setup
```

This script will:
- ✅ Stop any existing containers
- ✅ Create Docker volumes for Hardy Auth
- ✅ Start PostgreSQL database on port **5434**
- ✅ Start Redis on port **6381**
- ✅ Run database migrations
- ✅ Seed initial data
- ✅ Start Adminer for database management

### 3. Verify Setup

```bash
# Check container status and database tables
npm run hardy:status
```

Expected output:
- PostgreSQL container: `hardy-auth-db` (healthy)
- Redis container: `hardy-auth-redis` (healthy)
- Adminer container: `hardy-auth-adminer` (running)
- Database tables: 10+ tables created

## 🔧 Manual Setup (Alternative)

If you prefer manual setup or encounter issues:

### 1. Start Database Services

```bash
# Start only database services
docker-compose up -d auth-db auth-redis

# Wait for database to be ready
docker exec hardy-auth-db pg_isready -U auth_service -d hardy_auth
```

### 2. Run Database Migrations

```bash
# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Seed initial data
npm run db:seed
```

### 3. Start Development Services

```bash
# Start Adminer (optional)
docker-compose --profile development up -d auth-adminer

# Start the Next.js application
npm run dev
```

## 📊 Connection Information

### Database (PostgreSQL)
- **Host**: localhost
- **Port**: 5434 (Hardy Auth dedicated port)
- **Database**: `hardy_auth`
- **Username**: `auth_service`
- **Password**: `auth_password`
- **URL**: `postgresql://auth_service:auth_password@localhost:5434/hardy_auth`

### Redis (Session Storage)
- **Host**: localhost
- **Port**: 6381 (Hardy Auth dedicated port)
- **Password**: `auth_redis_password`
- **URL**: `redis://default:auth_redis_password@localhost:6381`

### Adminer (Database Admin)
- **URL**: http://localhost:8081
- **System**: PostgreSQL
- **Server**: auth-db
- **Username**: auth_service
- **Password**: auth_password
- **Database**: hardy_auth

## 👥 Demo Accounts

The seed script creates these demo accounts for testing:

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| System Admin | `admin@mlpipes.ai` | `HardyAuth2024!` | Full system access |
| Clinician | `dr.johnson@mlpipes.ai` | `Clinician2024!` | Healthcare provider |
| Tenant Admin | `admin@hardy-demo-hospital.com` | `Admin2024!` | Organization admin |
| Staff | `staff@hardy-demo-hospital.com` | `Staff2024!` | General staff member |

⚠️ **Security Notice**: Change these passwords immediately in production!

## 🔄 Migration from Old MLPipes Auth

If you have existing data in the old MLPipes Auth database:

### 1. Export Old Data

```bash
# Export data from old database (adjust connection details)
pg_dump -h localhost -p 5433 -U old_user -d mlpipes_auth > old_auth_backup.sql
```

### 2. Import to Hardy Auth

```bash
# Import data structure (be careful with conflicts)
psql -h localhost -p 5434 -U auth_service -d hardy_auth < old_auth_backup.sql

# Run migration script to update naming and settings
npm run hardy:migrate
```

### 3. Verify Migration

```bash
# Connect to database and check migration log
docker exec -it hardy-auth-db psql -U auth_service -d hardy_auth

# In PostgreSQL shell:
SELECT * FROM migration_log ORDER BY started_at;
```

## 🛠️ Management Commands

### Docker Operations
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Restart specific service
docker-compose restart auth-db
```

### Database Operations
```bash
# Access database shell
docker exec -it hardy-auth-db psql -U auth_service -d hardy_auth

# Access Redis shell
docker exec -it hardy-auth-redis redis-cli

# Reset database (destructive!)
npm run db:reset

# Create new migration
npx prisma migrate dev --name "description"

# Deploy migrations (production)
npx prisma migrate deploy
```

### Development Operations
```bash
# Start development server
npm run dev

# Run type checking
npm run type-check

# Run linting
npm run lint

# Run tests
npm test

# Build for production
npm run build
```

## 🔍 Troubleshooting

### Database Connection Issues

1. **Port conflicts**: Ensure port 5434 is not in use
   ```bash
   lsof -i :5434
   ```

2. **Container not starting**: Check Docker logs
   ```bash
   docker-compose logs auth-db
   ```

3. **Permission errors**: Reset Docker volumes
   ```bash
   docker-compose down -v
   docker volume rm hardy_auth_db_data hardy_auth_redis_data
   npm run hardy:setup
   ```

### Application Issues

1. **Environment variables**: Verify `.env.local` file
   ```bash
   cat .env.local | grep DATABASE_URL
   ```

2. **Prisma client outdated**: Regenerate client
   ```bash
   npx prisma generate
   ```

3. **Port conflicts**: Change application port
   ```bash
   npm run dev -- -p 3002
   ```

## 🏗️ Architecture Overview

### Hardy Auth Infrastructure

```
┌─────────────────────────────────────────────────────────────┐
│                     Hardy Auth System                       │
├─────────────────────────────────────────────────────────────┤
│  Next.js App (Port 3001)                                  │
│  ├── Authentication Routes                                 │
│  ├── Admin Dashboard                                       │
│  ├── API Endpoints (tRPC)                                  │
│  └── Healthcare UI Components                              │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL Database (Port 5434)                          │
│  ├── Database: hardy_auth                                  │
│  ├── User: auth_service                                    │
│  ├── Row-Level Security (RLS)                             │
│  └── HIPAA Audit Logging                                   │
├─────────────────────────────────────────────────────────────┤
│  Redis Cache (Port 6381)                                   │
│  ├── Session Storage                                       │
│  ├── Rate Limiting                                         │
│  └── Cache Layer                                           │
├─────────────────────────────────────────────────────────────┤
│  Adminer (Port 8081) - Development Only                   │
│  └── Database Administration Interface                     │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

Hardy Auth uses a multi-tenant healthcare-focused schema:

- **Organizations**: Healthcare facilities (hospitals, clinics, practices)
- **Users**: Healthcare professionals and staff
- **Members**: Organization membership with roles
- **Audit Logs**: HIPAA-compliant activity tracking (7-year retention)
- **Sessions**: Secure session management
- **Passkeys**: WebAuthn/FHIR-ready authentication

## 🔐 Security Features

### HIPAA Compliance
- ✅ 7-year audit log retention
- ✅ Row-level security (RLS)
- ✅ Encrypted sensitive data
- ✅ Session timeout controls
- ✅ Failed login attempt tracking

### Healthcare Integration
- ✅ NPI number support
- ✅ Medical license tracking
- ✅ Specialty classifications
- ✅ Department-based access
- ✅ Emergency access provisions

### Enterprise Security
- ✅ Multi-factor authentication (TOTP/SMS)
- ✅ WebAuthn/Passkey support
- ✅ Magic link authentication
- ✅ Rate limiting and DDoS protection
- ✅ Comprehensive audit trails

## 📝 Next Steps

1. **Configure Environment**: Update `.env.local` with your settings
2. **Start Development**: Run `npm run dev` to start the application
3. **Access Dashboard**: Visit http://localhost:3001/admin
4. **Test Authentication**: Login with demo accounts
5. **Customize Settings**: Configure organization and user settings
6. **Enable 2FA**: Set up two-factor authentication for admin accounts
7. **Production Setup**: Configure SSL, backups, and monitoring

## 🆘 Support

- **Documentation**: Check the `/docs` directory for detailed guides
- **Issues**: Report problems at https://github.com/mlpipes/hardy/issues
- **Email**: Contact support@mlpipes.ai for assistance
- **Logs**: Always check Docker logs when troubleshooting

---

🏥 **Hardy Auth** - Healthcare Authentication Made Simple and Secure