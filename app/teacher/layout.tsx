'use client';

import { useUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import TeacherSidebar from '@/components/teacher/TeacherSidebar' // adjust part if needed
import IdleTimeout from '@/components/IdleTimeout'
import { fetchUserRowByClerkId } from '@/lib/fetchUserRow'
import { Menu } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';

export default function TeacherLayout({ children }: { children: React.ReactNode}) {
  const { isSignedIn, isLoaded, user } = useUser();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      if (!isLoaded || !user) {
        setChecking(false);
        return;
      }

      const { data } = await fetchUserRowByClerkId(user.id, '*', user.emailAddresses[0]?.emailAddress)

      setIsAuthorized(data?.role === 'teacher');
      setChecking(false);
    };

    checkRole();
  }, [isLoaded, user]);

  if (!isLoaded || checking) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
      {/* ✅ Mobile Top Bar — visible only on mobile inside the teacher portal */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-blue-800 text-white h-14 flex items-center justify-between px-4 shadow-md">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-teacher-sidebar'))}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
        <h1 className="font-bold text-lg">Teacher Portal</h1>
        <UserButton />
      </div>

      {/* Sidebar takes its own space*/}
      <TeacherSidebar/>
      <IdleTimeout />

      {/* Main content takes the rest of the space. NO margin needed! */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-20 md:pt-8">
        {children}
      </main>
    </div>
  )
}
