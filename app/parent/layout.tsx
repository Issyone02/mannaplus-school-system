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

const PARENT_EMAILS = [
  'toluwaniisaiah01@gmail.com',
  process.env.PARENT_TEST_EMAIL || '',
];

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded, user } = useUser();
  const [childrenInfo, setChildrenInfo] = useState<ChildInfo[]>([]);
  const [activePopupIndex, setActivePopupIndex] = useState(0);

  // ✅ Synchronous authorization — no useEffect, no race condition
  const userEmail = user?.emailAddresses?.[0]?.emailAddress || '';
  const isParent = PARENT_EMAILS.includes(userEmail);

  // Fetch children data (non-blocking, for NoticePopup only)
  useEffect(() => {
    const fetchChildren = async () => {
      if (!isLoaded || !isParent || !userEmail) return;

      try {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('email', userEmail)
          .single();

        if (userData?.id) {
          const { data: students } = await supabase
            .from('students')
            .select('id, class_id')
            .eq('user_id', userData.id);

          if (students) {
            setChildrenInfo(students as ChildInfo[]);
          }
        }
      } catch (err) {
        console.log('⚠️ NoticePopup data fetch failed (non-critical):', err);
      }
    };

    fetchChildren();
  }, [isLoaded, isParent, userEmail]);

  const handlePopupClose = () => {
    setActivePopupIndex(prev => prev + 1);
  };

  // Loading state
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Not signed in
  if (!isSignedIn) {
    redirect('/sign-in');
  }

  // Not authorized
  if (!isParent) {
    redirect('/dashboard');
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <ParentSidebar />
      <IdleTimeout />
      
      {/* Show NoticePopups one at a time (not stacked) */}
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