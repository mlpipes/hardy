/**
 * Test Better Auth Sign In
 * Test sign-in with a known user that was created via Better Auth
 */

import { auth } from "../lib/auth";

async function testBetterAuthSignin() {
  try {
    console.log("🔍 Testing Better Auth sign-in...");

    // Test admin user sign-in
    const testEmail = "admin@mlpipes.ai";
    const testPassword = "!Alfeo123456";

    console.log(`Attempting to sign in with: ${testEmail}`);

    try {
      const result = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: testPassword
        },
        asResponse: false
      });

      console.log("✅ Better Auth sign-in successful:", result);
    } catch (error) {
      console.error("❌ Better Auth sign-in failed:");
      console.error("Error message:", error.message);
      console.error("Error status:", error.status);
      console.error("Error body:", error.body);
      console.error("Full error:", error);
    }

  } catch (error) {
    console.error("Script error:", error);
  }
}

testBetterAuthSignin();