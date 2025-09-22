/**
 * Test Better Auth Sign In
 * Debug script to understand why sign-in is failing
 */

import { auth } from "../lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testBetterAuth() {
  try {
    console.log("🔍 Checking existing users...");

    // Check existing users
    const users = await prisma.user.findMany({
      include: {
        accounts: true,
        sessions: true
      }
    });

    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`- ${user.email} (ID: ${user.id})`);
      console.log(`  Accounts: ${user.accounts.length}`);
      console.log(`  Sessions: ${user.sessions.length}`);
      user.accounts.forEach(acc => {
        console.log(`    Account: provider=${acc.providerId}, hasPassword=${!!acc.password}`);
      });
    });

    // Try to sign in with Better Auth API
    console.log("\n🔐 Testing Better Auth sign-in...");

    const testEmail = "sabaysmu@gmail.com";
    const testPassword = "Test123456!@";

    try {
      // This simulates what the client would do
      const result = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: testPassword
        },
        asResponse: false
      });

      console.log("✅ Sign-in successful:", result);
    } catch (error) {
      console.error("❌ Sign-in failed:", error);

      // Try to create a new user with Better Auth
      console.log("\n🆕 Creating user with Better Auth...");

      try {
        const signUpResult = await auth.api.signUpEmail({
          body: {
            email: testEmail,
            password: testPassword,
            name: "Test User"
          },
          asResponse: false
        });

        console.log("✅ User created:", signUpResult);
      } catch (signUpError) {
        console.error("❌ Sign-up failed:", signUpError);
      }
    }

    // Check accounts table structure
    console.log("\n📊 Account table structure:");
    const accounts = await prisma.account.findMany({
      take: 1
    });

    if (accounts.length > 0) {
      console.log("Sample account fields:", Object.keys(accounts[0]));
    }

  } catch (error) {
    console.error("Script error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testBetterAuth();