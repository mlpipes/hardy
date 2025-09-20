/**
 * Script to create a user in Better Auth's format
 */

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "postgresql://auth_service:auth_password@localhost:5434/hardy_auth?sslmode=prefer",
});

async function main() {
  console.log('Creating Better Auth user...');

  // Hash the password
  const hashedPassword = await hash('HardyAuth2024!', 12);

  // Create user in Better Auth format
  const user = await prisma.user.upsert({
    where: { email: 'admin@mlpipes.ai' },
    update: {
      emailVerified: true,
    },
    create: {
      id: 'admin-user-id',
      email: 'admin@mlpipes.ai',
      emailVerified: true,
      name: 'System Administrator',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  });

  // Create account (for password authentication)
  await prisma.account.upsert({
    where: {
      providerId_userId: {
        providerId: 'email',
        userId: user.id,
      }
    },
    update: {},
    create: {
      id: 'admin-account-id',
      providerId: 'email',
      userId: user.id,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  });

  console.log('✅ Created Better Auth user: admin@mlpipes.ai');
  console.log('Password: HardyAuth2024!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });