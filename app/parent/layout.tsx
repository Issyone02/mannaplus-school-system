'use client';

import { useUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ParentSidebar from '@/components/ParentSidebar';
import IdleTimeout from '@/components/IdleTimeout';
import NoticePopup from '@/components/NoticePopup';

interface ChildInfo {
  id: string;
  class_id: string | null;
}

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded, user } = useUser();
  const [childrenInfo, setChildrenInfo] = useState<ChildInfo[]>([]);
  const [activePopupIndex, setActivePopupIndex] = useState(0);
  const [authState, setAuthState] = useState<'resolving' | 'parent' | 'denied'>('resolving');

  const userEmail = user?.emailAddresses?.[0]?.emailAddress || '';

  // ✅ Role-based authorization (NO hardcoded emails) + children via parents.students_ids
  useEffect(() => {
    const resolve = async () => {
      if (!isLoaded) return;
      if (!isSignedIn || !userEmail) { setAuthState('denied'); return; }
      try {
        const { data: u } = await supabase.from('users').select('id, role').eq('email', userEmail).single();
        if (u?.role !== 'parent') { setAuthState('denied'); return; }
        setAuthState('parent');

        let ids: string[] = [];
        const { data: byUser } = await supabase.from('parents').select('id, students_ids').eq('user_id', u.id).single();
        ids = byUser?.students_ids || [];
        if (ids.length === 0) {
          const { data: byEmail } = await supabase.from('parents').select('id, students_ids').ilike('email', userEmail).single();
          ids = byEmail?.students_ids || [];
        }
        if (ids.length > 0) {
          const { data: kids } = await supabase.from('students').select('id, class_id').in('id', ids);
          setChildrenInfo((kids || []) as ChildInfo[]);
        } else {
          const { data: legacy } = await supabase.from('students').select('id, class_id').eq('user_id', u.id);
          setChildrenInfo((legacy || []) as ChildInfo[]);
        }
      } catch {
        setAuthState('denied');
      }
    };
    resolve();
  }, [isLoaded, isSignedIn, userEmail]);

  const handlePopupClose = () => setActivePopupIndex(prev => prev + 1);

  if (!isLoaded || authState === 'resolving') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!isSignedIn) redirect('/sign-in');
  if (authState === 'denied') redirect('/dashboard');

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <ParentSidebar />
      <IdleTimeout />

      {childrenInfo.length > 0 && activePopupIndex < childrenInfo.length && (
        <NoticePopup
          key={childrenInfo[activePopupIndex].id}
          userRole="parent"
          userId={childrenInfo[activePopupIndex].id}
          classId={childrenInfo[activePopupIndex].class_id || undefined}
          onClose={handlePopupClose}
        />
      )}

      <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-16 md:pt-8">
        {children}
      </main>
    </div>
  );
}