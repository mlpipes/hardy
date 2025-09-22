/**
 * Migrate existing users to Better Auth format
 * Updates provider from 'email' to 'credential' for Better Auth compatibility
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateUsers() {
  try {
    console.log("🔄 Migrating users to Better Auth format...");

    // Update all accounts with provider 'email' to 'credential'
    const result = await prisma.account.updateMany({
      where: {
        providerId: 'email'
      },
      data: {
        providerId: 'credential'
      }
    });

    console.log(`✅ Updated ${result.count} accounts from 'email' to 'credential' provider`);

    // Verify the changes
    const accounts = await prisma.account.findMany({
      select: {
        userId: true,
        providerId: true,
        user: {
          select: {
            email: true
          }
        }
      }
    });

    console.log("\n📊 Current account providers:");
    accounts.forEach(account => {
      console.log(`  - ${account.user.email}: ${account.providerId}`);
    });

    console.log("\n✨ Migration complete! Users can now sign in with Better Auth.");

  } catch (error) {
    console.error("❌ Migration error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateUsers();