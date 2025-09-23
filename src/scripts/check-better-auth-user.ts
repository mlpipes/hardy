/**
 * Check Better Auth User Creation
 * Examine what was created in the database during Better Auth signup
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkBetterAuthUser() {
  try {
    console.log("🔍 Checking Better Auth users in database...");

    // Find the most recent user (likely our test user)
    const recentUsers = await prisma.user.findMany({
      where: {
        email: {
          contains: "test-better-auth-1758566505600"
        }
      },
      include: {
        accounts: true,
        sessions: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 3
    });

    console.log(`Found ${recentUsers.length} Better Auth test users:`);

    recentUsers.forEach((user, index) => {
      console.log(`\n--- User ${index + 1} ---`);
      console.log(`ID: ${user.id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${user.name}`);
      console.log(`Role: ${user.role}`);
      console.log(`Email Verified: ${user.emailVerified}`);
      console.log(`Created: ${user.createdAt}`);
      console.log(`Accounts: ${user.accounts.length}`);

      user.accounts.forEach((account, i) => {
        console.log(`  Account ${i + 1}:`);
        console.log(`    Provider ID: ${account.providerId}`);
        console.log(`    Account ID: ${account.accountId}`);
        console.log(`    Has Password: ${!!account.password}`);
        console.log(`    Password Hash: ${account.password ? account.password.substring(0, 20) + '...' : 'NULL'}`);
        console.log(`    Organization ID: ${account.organizationId || 'NULL'}`);
      });

      console.log(`Sessions: ${user.sessions.length}`);
    });

    // Also check if there are any accounts without associated users
    console.log("\n🔍 Checking for orphaned accounts...");
    const orphanedAccounts = await prisma.account.findMany({
      where: {
        user: null
      }
    });

    console.log(`Found ${orphanedAccounts.length} orphaned accounts`);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBetterAuthUser();