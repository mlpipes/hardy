/**
 * Test Better Auth Signup Endpoint Directly
 * Make a direct HTTP request to the Better Auth signup endpoint to capture the exact error
 */

async function testBetterAuthEndpoint() {
  try {
    console.log("🔍 Testing Better Auth signup endpoint directly...");

    const testEmail = `test-better-auth-direct-${Date.now()}@example.com`;
    const testPassword = "Test123456!@";
    const testName = "Test Better Auth Direct";

    const response = await fetch("http://localhost:3001/api/auth/sign-up/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        name: testName,
      }),
    });

    console.log("Response status:", response.status);
    console.log("Response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Better Auth signup endpoint failed:");
      console.error("Status:", response.status, response.statusText);
      console.error("Error response:", errorText);

      try {
        const errorJson = JSON.parse(errorText);
        console.error("Parsed error:", errorJson);
      } catch (e) {
        console.error("Could not parse error as JSON");
      }
    } else {
      const result = await response.json();
      console.log("✅ Better Auth signup endpoint successful:", result);
    }

  } catch (error) {
    console.error("Request error:", error);
  }
}

testBetterAuthEndpoint();