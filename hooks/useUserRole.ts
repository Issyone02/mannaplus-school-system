'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase';
import { fetchUserRowByClerkId } from '@/lib/fetchUserRow';

export type UserRole = 'admin' | 'teacher' | 'parent' | 'student' | null;

export function useUserRole() {
  const { user, isLoaded } = useUser();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!isLoaded || !user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch user role from Supabase
        const { data, error } = await fetchUserRowByClerkId(user.id)

        console.log('🔍 Fetch role result:', { data, error })

        if (error) {
          console.error('Error fetching role:', error);
          setRole(null);
        } else {
          setRole(data?.role as UserRole || null);
        }
      } catch (err) {
        console.error('Error:', err);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [isLoaded, user]);

  return { role, loading, isAuthorized: (allowedRoles: UserRole[]) => allowedRoles.includes(role) };
}