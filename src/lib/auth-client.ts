/**
 * Hardy Auth Service - Client-side Authentication
 * tRPC client setup with authentication context
 */

import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import superjson from 'superjson';
import type { AppRouter } from '../server/routers';

// React tRPC client
export const trpc = createTRPCReact<AppRouter>();

// Vanilla tRPC client for server-side usage
export const trpcClient = createTRPCProxyClient<AppRouter>({
  transformer: superjson,
  links: [
    httpBatchLink({
      url: '/api/trpc',
      headers() {
        const token = getAuthToken();
        const tenantId = getTenantId();

        return {
          ...(token && { authorization: `Bearer ${token}` }),
          ...(tenantId && { 'x-tenant-id': tenantId }),
        };
      },
    }),
  ],
});

// Auth token management
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('auth_token', token);
}

export function removeAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
}

// Tenant context management
export function getTenantId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tenant_id');
}

export function setTenantId(tenantId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('tenant_id', tenantId);
}

export function removeTenantId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('tenant_id');
}

// Auth state helpers
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

export function clearAuthState(): void {
  removeAuthToken();
  removeTenantId();
}