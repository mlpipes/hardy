/**
 * Hardy Auth Service - Database Seed Script
 * Seeds initial data for healthcare authentication system
 */

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🏥 Seeding Hardy Auth database...');

  // Create default healthcare organization
  const defaultOrg = await prisma.organization.upsert({
    where: { slug: 'hardy-demo-hospital' },
    update: {},
    create: {
      name: 'Hardy Demo Hospital',
      slug: 'hardy-demo-hospital',
      organizationType: 'hospital',
      address: {
        street: '123 Healthcare Avenue',
        city: 'Medical City',
        state: 'CA',
        zipCode: '90210',
        country: 'United States'
      },
      phoneNumber: '+1 (555) 123-4567',
      website: 'https://hardy-demo-hospital.com',
      practiceNpi: '1234567890',
      complianceSettings: {
        hipaaCompliant: true,
        enableAuditLogging: true,
        requireTwoFactor: true,
        sessionTimeout: 1800,
        auditRetentionDays: 2557
      },
      mfaRequired: true,
      passwordPolicy: {
        minLength: 12,
        requireSpecialChars: true,
        requireNumbers: true,
        requireUppercase: true,
        maxAge: 90
      },
      sessionTimeout: 1800, // 30 minutes
      auditRetentionDays: 2557 // 7 years for HIPAA
    }
  });

  console.log(`✅ Created organization: ${defaultOrg.name}`);

  // Create system administrator
  const adminPassword = await hash('HardyAuth2024!', 12);
  const systemAdmin = await prisma.user.upsert({
    where: { email: 'admin@mlpipes.ai' },
    update: {},
    create: {
      email: 'admin@mlpipes.ai',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      firstName: 'System',
      lastName: 'Administrator',
      role: 'system_admin',
      organizationId: defaultOrg.id,
      twoFactorEnabled: false, // Will be prompted to enable on first login
      permissions: {
        all: true,
        scopes: [
          'organization:*',
          'user:*',
          'audit:*',
          'settings:*',
          'system:*'
        ]
      }
    }
  });

  console.log(`✅ Created system admin: ${systemAdmin.email}`);

  // Create demo clinician
  const clinicianPassword = await hash('Clinician2024!', 12);
  const demoClinician = await prisma.user.upsert({
    where: { email: 'dr.johnson@mlpipes.ai' },
    update: {},
    create: {
      email: 'dr.johnson@mlpipes.ai',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: 'clinician',
      organizationId: defaultOrg.id,
      licenseNumber: 'MD-CA-12345',
      npiNumber: '1234567890',
      specialties: ['Cardiology', 'Internal Medicine'],
      twoFactorEnabled: false,
      permissions: {
        scopes: [
          'patient:read',
          'patient:write',
          'member:read'
        ]
      }
    }
  });

  console.log(`✅ Created demo clinician: ${demoClinician.email}`);

  // Create demo admin
  const adminUserPassword = await hash('Admin2024!', 12);
  const demoAdmin = await prisma.user.upsert({
    where: { email: 'admin@hardy-demo-hospital.com' },
    update: {},
    create: {
      email: 'admin@hardy-demo-hospital.com',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      firstName: 'Michael',
      lastName: 'Chen',
      role: 'tenant_admin',
      organizationId: defaultOrg.id,
      twoFactorEnabled: false,
      permissions: {
        scopes: [
          'member:*',
          'organization:read',
          'organization:update',
          'audit:read',
          'settings:read',
          'settings:update'
        ]
      }
    }
  });

  console.log(`✅ Created demo admin: ${demoAdmin.email}`);

  // Create demo staff member
  const staffPassword = await hash('Staff2024!', 12);
  const demoStaff = await prisma.user.upsert({
    where: { email: 'staff@hardy-demo-hospital.com' },
    update: {},
    create: {
      email: 'staff@hardy-demo-hospital.com',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      firstName: 'Jennifer',
      lastName: 'Wilson',
      role: 'staff',
      organizationId: defaultOrg.id,
      twoFactorEnabled: false,
      permissions: {
        scopes: [
          'member:read'
        ]
      }
    }
  });

  console.log(`✅ Created demo staff: ${demoStaff.email}`);

  // Create member records for organization users
  const members = await Promise.all([
    prisma.member.upsert({
      where: {
        userId_organizationId: {
          userId: systemAdmin.id,
          organizationId: defaultOrg.id
        }
      },
      update: {},
      create: {
        userId: systemAdmin.id,
        organizationId: defaultOrg.id,
        role: 'system_admin',
        status: 'active',
        joinedAt: new Date(),
        departmentId: 'administration'
      }
    }),
    prisma.member.upsert({
      where: {
        userId_organizationId: {
          userId: demoClinician.id,
          organizationId: defaultOrg.id
        }
      },
      update: {},
      create: {
        userId: demoClinician.id,
        organizationId: defaultOrg.id,
        role: 'clinician',
        status: 'active',
        joinedAt: new Date(),
        departmentId: 'cardiology',
        licenseNumber: 'MD-CA-12345',
        specialties: ['Cardiology', 'Internal Medicine']
      }
    }),
    prisma.member.upsert({
      where: {
        userId_organizationId: {
          userId: demoAdmin.id,
          organizationId: defaultOrg.id
        }
      },
      update: {},
      create: {
        userId: demoAdmin.id,
        organizationId: defaultOrg.id,
        role: 'tenant_admin',
        status: 'active',
        joinedAt: new Date(),
        departmentId: 'administration'
      }
    }),
    prisma.member.upsert({
      where: {
        userId_organizationId: {
          userId: demoStaff.id,
          organizationId: defaultOrg.id
        }
      },
      update: {},
      create: {
        userId: demoStaff.id,
        organizationId: defaultOrg.id,
        role: 'staff',
        status: 'active',
        joinedAt: new Date(),
        departmentId: 'administration'
      }
    })
  ]);

  console.log(`✅ Created ${members.length} member records`);

  // Create initial audit log entries
  const auditLogs = await Promise.all([
    prisma.auditLog.create({
      data: {
        action: 'SYSTEM_INIT',
        resource: 'SYSTEM',
        details: {
          message: 'Hardy Auth system initialized',
          version: '1.0.0',
          timestamp: new Date()
        },
        timestamp: new Date(),
        severity: 'info',
        category: 'system'
      }
    }),
    prisma.auditLog.create({
      data: {
        userId: systemAdmin.id,
        organizationId: defaultOrg.id,
        action: 'ORG_CREATED',
        resource: 'ORGANIZATION',
        resourceId: defaultOrg.id,
        details: {
          organizationName: defaultOrg.name,
          organizationType: defaultOrg.organizationType,
          initialSetup: true
        },
        timestamp: new Date(),
        severity: 'info',
        category: 'authentication'
      }
    })
  ]);

  console.log(`✅ Created ${auditLogs.length} initial audit log entries`);

  console.log('✅ System configuration completed');

  console.log('\n🎉 Hardy Auth database seeded successfully!');
  console.log('\n📋 Demo Accounts Created:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🔐 System Admin: admin@mlpipes.ai / HardyAuth2024!`);
  console.log(`👨‍⚕️ Clinician: dr.johnson@mlpipes.ai / Clinician2024!`);
  console.log(`👨‍💼 Tenant Admin: admin@hardy-demo-hospital.com / Admin2024!`);
  console.log(`👤 Staff: staff@hardy-demo-hospital.com / Staff2024!`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n⚠️  Security Notice:');
  console.log('   • Change these passwords immediately in production');
  console.log('   • Enable 2FA for all administrative accounts');
  console.log('   • Review and customize permissions as needed');
  console.log('\n🏥 Organization: Hardy Demo Hospital (hardy-demo-hospital)');
  console.log('   • HIPAA Compliance: Enabled');
  console.log('   • 2FA Required: Yes');
  console.log('   • Session Timeout: 30 minutes');
  console.log('   • Audit Retention: 7 years');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });