'use client';

import { useUser, UserButton } from '@clerk/nextjs';
import { Menu } from 'lucide-react';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import StudentSidebar from '@/components/StudentSidebar';
import IdleTimeout from '@/components/IdleTimeout';
import NoticePopup from '@/components/NoticePopup';
import { fetchUserRowByClerkId } from '@/lib/fetchUserRow';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded, user } = useUser();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [studentInfo, setStudentInfo] = useState<{ id: string; class_id: string | null } | null>(null);

  useEffect(() => {
    const checkRoleAndFetchData = async () => {
      if (!isLoaded || !user) {
        setChecking(false);
        return;
      }

      // 1. Check role and get Supabase user ID
      const { data: userData } = await fetchUserRowByClerkId(user.id, 'id, role', user.emailAddresses[0]?.emailAddress)

      if (userData?.role === 'student') {
        setIsAuthorized(true);
        
        // 2. Fetch student ID and class_id for the NoticePopup
        const { data: student } = await supabase
          .from('students')
          .select('id, class_id')
          .eq('user_id', userData.id)
          .single();
          
        if (student) {
          setStudentInfo({ id: student.id, class_id: student.class_id });
        }
      } else {
        setIsAuthorized(false);
      }
      setChecking(false);
    };

    checkRoleAndFetchData();
  }, [isLoaded, user]);

  if (!isLoaded || checking) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
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
      {/* ✅ Mobile Top Bar — visible only on mobile inside the student portal */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-orange-600 text-white h-14 flex items-center justify-between px-4 shadow-md">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-student-sidebar'))}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
        <h1 className="font-bold text-lg">Student Portal</h1>
        <UserButton />
      </div>

      <StudentSidebar />
      <IdleTimeout />
      
      {/* Show Notice Popup if student data is loaded */}
      {studentInfo && (
        <NoticePopup 
          userRole="student"
          userId={studentInfo.id}
          classId={studentInfo.class_id || undefined}
        />
      )}

      <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-20 md:pt-8">
        {children}
      </main>
    </div>
  )
}