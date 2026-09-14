'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserRole, UserRole } from './useUserRole';

interface WithRoleProtectionProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectPath?: string;
}

export function withRoleProtection({
  children,
  allowedRoles,
  redirectPath = '/dashboard',
}: WithRoleProtectionProps) {
  return function ProtectedRoute() {
    const { role, loading, isAuthorized } = useUserRole();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !isAuthorized(allowedRoles)) {
        router.push(redirectPath);
      }
    }, [loading, role, allowedRoles, redirectPath, isAuthorized, router]);

    if (loading) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      );
    }

    if (!isAuthorized(allowedRoles)) {
      return null;
    }

    return <>{children}</>;
  };
}