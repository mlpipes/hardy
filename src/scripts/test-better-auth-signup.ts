/**
 * Test Better Auth Sign Up
 * Debug script to understand why Better Auth signup is failing with 500 error
 */

import { auth } from "../lib/auth";

async function testBetterAuthSignup() {
  try {
    console.log("🔍 Testing Better Auth signup...");

    const testEmail = `test-better-auth-${Date.now()}@example.com`;
    const testPassword = "Test123456!@";
    const testName = "Test Better Auth User";

    try {
      // This simulates what the Better Auth signup endpoint would do
      const result = await auth.api.signUpEmail({
        body: {
          email: testEmail,
          password: testPassword,
          name: testName
        },
        asResponse: false
      });

      console.log("✅ Better Auth signup successful:", result);
    } catch (error) {
      console.error("❌ Better Auth signup failed:");
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      console.error("Full error:", error);
    }

  } catch (error) {
    console.error("Script error:", error);
  }
}

testBetterAuthSignup();