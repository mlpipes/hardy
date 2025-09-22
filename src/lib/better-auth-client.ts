/**
 * Better Auth Client
 * Client-side authentication using Better Auth SDK
 */

import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";
import { organizationClient } from "better-auth/client/plugins";
import { passkeyClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001",
  plugins: [
    twoFactorClient(),
    organizationClient(),
    passkeyClient()
  ]
});

// Export convenience methods
export const signIn = authClient.signIn;
export const signUp = authClient.signUp;
export const signOut = authClient.signOut;
export const useSession = authClient.useSession;