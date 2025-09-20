/**
 * Hardy Auth Service - Database Seed Script
 * Seeds initial data for healthcare authentication system
 */

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

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
      domain: 'hardy-demo-hospital.com',
      organizationType: 'hospital',
      npiNumber: '1234567890',
      website: 'https://hardy-demo-hospital.com',
      phone: '+1 (555) 123-4567',
      addressLine1: '123 Healthcare Avenue',
      city: 'Medical City',
      state: 'CA',
      zipCode: '90210',
      country: 'US',
      maxUsers: 500,
      isActive: true,
      settings: {
        hipaaCompliant: true,
        enableAuditLogging: true,
        requireTwoFactor: true,
        sessionTimeout: 1800,
        auditRetentionDays: 2557
      }
    }
  });

  console.log(`✅ Created organization: ${defaultOrg.name}`);

  // Create system administrator
  const adminPassword = await hash('HardyAuth2024!', 12);
  const systemAdmin = await prisma.user.upsert({
    where: { email: 'admin@mlpipes.com' },
    update: {},
    create: {
      email: 'admin@mlpipes.com',
      emailVerified: true,
      name: 'System Administrator',
      licenseNumber: null,
      npiNumber: null,
      specialties: []
    }
  });

  console.log(`✅ Created system admin: ${systemAdmin.email}`);

  // Create demo clinician
  const clinicianPassword = await hash('Clinician2024!', 12);
  const demoClinician = await prisma.user.upsert({
    where: { email: 'dr.johnson@hardy-demo-hospital.com' },
    update: {},
    create: {
      email: 'dr.johnson@hardy-demo-hospital.com',
      emailVerified: true,
      name: 'Dr. Sarah Johnson',
      licenseNumber: 'MD-CA-12345',
      npiNumber: '9876543210',
      specialties: ['Cardiology', 'Internal Medicine']
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
      name: 'Michael Chen',
      licenseNumber: null,
      npiNumber: null,
      specialties: []
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
      name: 'Jennifer Wilson',
      licenseNumber: null,
      npiNumber: null,
      specialties: []
    }
  });

  console.log(`✅ Created demo staff: ${demoStaff.email}`);

  // Create accounts with passwords for authentication
  const accounts = await Promise.all([
    prisma.account.upsert({
      where: {
        providerId_accountId: {
          providerId: 'credential',
          accountId: systemAdmin.email
        }
      },
      update: {
        password: adminPassword
      },
      create: {
        userId: systemAdmin.id,
        accountId: systemAdmin.email,
        providerId: 'credential',
        password: adminPassword
      }
    }),
    prisma.account.upsert({
      where: {
        providerId_accountId: {
          providerId: 'credential',
          accountId: demoClinician.email
        }
      },
      update: {
        password: clinicianPassword
      },
      create: {
        userId: demoClinician.id,
        organizationId: defaultOrg.id,
        accountId: demoClinician.email,
        providerId: 'credential',
        password: clinicianPassword
      }
    }),
    prisma.account.upsert({
      where: {
        providerId_accountId: {
          providerId: 'credential',
          accountId: demoAdmin.email
        }
      },
      update: {
        password: adminUserPassword
      },
      create: {
        userId: demoAdmin.id,
        organizationId: defaultOrg.id,
        accountId: demoAdmin.email,
        providerId: 'credential',
        password: adminUserPassword
      }
    }),
    prisma.account.upsert({
      where: {
        providerId_accountId: {
          providerId: 'credential',
          accountId: demoStaff.email
        }
      },
      update: {
        password: staffPassword
      },
      create: {
        userId: demoStaff.id,
        organizationId: defaultOrg.id,
        accountId: demoStaff.email,
        providerId: 'credential',
        password: staffPassword
      }
    })
  ]);

  console.log(`✅ Created ${accounts.length} authentication accounts`);

  // Create organization member records
  const members = await Promise.all([
    prisma.organizationMember.upsert({
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
        department: 'Cardiology'
      }
    }),
    prisma.organizationMember.upsert({
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
        role: 'admin',
        department: 'Administration'
      }
    }),
    prisma.organizationMember.upsert({
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
        department: 'Administration'
      }
    })
  ]);

  console.log(`✅ Created ${members.length} organization member records`);

  console.log('\n🎉 Hardy Auth database seeded successfully!');
  console.log('\n📋 Demo Accounts Created:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🔐 System Admin: admin@mlpipes.com / HardyAuth2024!`);
  console.log(`👨‍⚕️ Clinician: dr.johnson@hardy-demo-hospital.com / Clinician2024!`);
  console.log(`👨‍💼 Tenant Admin: admin@hardy-demo-hospital.com / Admin2024!`);
  console.log(`👤 Staff: staff@hardy-demo-hospital.com / Staff2024!`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n⚠️  Security Notice:');
  console.log('   • Change these passwords immediately in production');
  console.log('   • Enable 2FA for all administrative accounts');
  console.log('   • Review and customize permissions as needed');
  console.log('\n🏥 Organization: Hardy Demo Hospital (hardy-demo-hospital)');
  console.log('   • Domain: hardy-demo-hospital.com');
  console.log('   • NPI: 1234567890');
  console.log('   • Max Users: 500');
  console.log('   • Status: Active');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });