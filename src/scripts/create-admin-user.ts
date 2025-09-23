/**
 * Create Default Admin User
 * Creates a default admin account using Better Auth for initial system access
 *
 * SECURITY NOTE: This script requires environment variables for credentials.
 * Never hardcode passwords in source code.
 *
 * Usage:
 *   ADMIN_EMAIL="admin@company.com" ADMIN_PASSWORD="SecurePassword123!" npm run create-admin
 */

import { auth } from "../lib/auth";

async function createAdminUser() {
  try {
    console.log("🔧 Creating default admin user...");

    // Require environment variables - no defaults for security
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || "System Administrator";

    // Validate required environment variables
    if (!adminEmail || !adminPassword) {
      console.error("❌ Missing required environment variables:");
      console.error("   ADMIN_EMAIL - Email address for admin user");
      console.error("   ADMIN_PASSWORD - Secure password for admin user");
      console.error("   ADMIN_NAME - (Optional) Display name for admin user");
      console.error("");
      console.error("Example usage:");
      console.error('   ADMIN_EMAIL="admin@company.com" ADMIN_PASSWORD="SecurePassword123!" npm run create-admin');
      console.error("");
      console.error("🔒 PRODUCTION: Use secrets manager instead of environment variables");
      process.exit(1);
    }

    // Basic password strength validation
    if (adminPassword.length < 12) {
      console.error("❌ Password must be at least 12 characters long");
      process.exit(1);
    }

    console.log(`Creating admin user: ${adminEmail}`);

    try {
      // Create admin user using Better Auth
      const result = await auth.api.signUpEmail({
        body: {
          email: adminEmail,
          password: adminPassword,
          name: adminName,
          callbackURL: `${process.env.BETTER_AUTH_URL || "http://localhost:3001"}/verify-email`
        },
        asResponse: false
      });

      console.log("✅ Admin user created successfully:");
      console.log(`   ID: ${result.user.id}`);
      console.log(`   Email: ${result.user.email}`);
      console.log(`   Name: ${result.user.name}`);
      console.log(`   Email Verified: ${result.user.emailVerified}`);

      // Check if verification email should be sent
      if (process.env.NODE_ENV === 'production' && !result.user.emailVerified) {
        console.log("\n📧 VERIFICATION EMAIL:");
        console.log("- Verification email sent to admin");
        console.log("- Admin must verify email before first login");
        console.log("- Check spam folder if email not received");
      } else if (process.env.NODE_ENV !== 'production') {
        console.log("\n🔧 DEVELOPMENT MODE:");
        console.log("- Email verification disabled for development");
        console.log("- Admin can sign in immediately");
        console.log("- In production, verification will be required");
      }

      // TODO: Set admin role - requires role management implementation
      console.log("\n📝 Next steps:");
      console.log("1. Admin user created with default 'user' role");
      console.log("2. Update role to 'admin' or 'tenant_admin' as needed");
      console.log("3. Configure role-based permissions");
      console.log("4. Enable 2FA for admin accounts");

      console.log("\n⚠️  SECURITY REMINDERS:");
      console.log("- Change admin password after first login");
      console.log("- Enable 2FA for admin accounts");
      console.log("- Use secrets manager in production");
      console.log("- Audit admin access regularly");
      console.log("- Email verification required in production");

    } catch (error) {
      if (error.body?.code === 'USER_ALREADY_EXISTS') {
        console.log("ℹ️  Admin user already exists with email:", adminEmail);
        console.log("If you need to reset the password, please delete the user first.");
      } else {
        console.error("❌ Failed to create admin user:");
        console.error("   Error:", error.message);
        if (error.body) {
          console.error("   Details:", error.body);
        }
        throw error;
      }
    }

  } catch (error) {
    console.error("Script execution failed:", error);
    process.exit(1);
  }
}

createAdminUser();