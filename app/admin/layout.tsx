'use client';

import { useUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import IdleTimeout from '@/components/IdleTimeout';
import { Menu } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';

/**
 * ✅ Admin access list — single source of truth (same pattern as app/dashboard/page.tsx).
 * Instant & network-free: no Supabase query, so no timeouts or flaky redirects.
 * Data-level security remains enforced by Supabase RLS policies.
 */
const ADMIN_EMAILS = [
  'olalereisaiah68@gmail.com',
  // Add more admin emails here as needed
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded, user } = useUser();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isLoaded) return; // keep spinner until Clerk finishes loading

    if (!user) {
      setIsAuthorized(false);
      setChecking(false);
      return;
    }

    const userEmail = user.emailAddresses[0]?.emailAddress || '';
    setIsAuthorized(ADMIN_EMAILS.includes(userEmail));
    setChecking(false);
  }, [isLoaded, user]);

  if (!isLoaded || checking) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    redirect('/sign-in');
  }

  if (!isAuthorized) {
    redirect('/dashboard');
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ✅ Mobile Top Bar - visible only on mobile inside admin portal */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-green-800 text-white h-14 flex items-center justify-between px-4 shadow-md">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-admin-sidebar'))}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
        <h1 className="font-bold text-lg">Admin Portal</h1>
        <UserButton />
      </div>

      <AdminSidebar />
      <IdleTimeout />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-20 md:pt-8">
        {children}
      </main>
    </div>
  );
}