/**
 * Breadcrumb Navigation Component
 * Provides consistent navigation breadcrumbs across dashboard pages
 */

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav className={`flex ${className}`} aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        {/* Home/Dashboard link */}
        <li className="inline-flex items-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
          >
            <Home className="w-4 h-4 mr-2" />
            Dashboard
          </Link>
        </li>

        {/* Breadcrumb items */}
        {items.map((item, index) => (
          <li key={index}>
            <div className="flex items-center">
              <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />
              {item.href && !item.current ? (
                <Link
                  href={item.href}
                  className="ml-1 text-sm font-medium text-gray-700 hover:text-blue-600 md:ml-2 transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={`ml-1 text-sm font-medium md:ml-2 ${
                    item.current
                      ? 'text-gray-500 cursor-default'
                      : 'text-gray-700'
                  }`}
                  aria-current={item.current ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Common breadcrumb configurations for dashboard pages
 */
export const breadcrumbConfigs = {
  settings: [
    { label: 'Settings', current: true }
  ],
  users: [
    { label: 'User Management', current: true }
  ],
  organizations: [
    { label: 'Organizations', current: true }
  ],
  userDetail: (userId: string) => [
    { label: 'User Management', href: '/dashboard/users' },
    { label: `User ${userId}`, current: true }
  ],
  organizationDetail: (orgId: string) => [
    { label: 'Organizations', href: '/dashboard/organizations' },
    { label: `Organization ${orgId}`, current: true }
  ]
};