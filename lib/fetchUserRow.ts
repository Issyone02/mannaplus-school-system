import { supabase } from '@/lib/supabase'

export interface UserRow {
  id?: string
  role: string
  clerk_id?: string
}

/**
 * ✅ Fetch a user row by clerk_id with automatic retries.
 * A flaky network no longer logs users out or bounces them to /dashboard.
 */
export async function fetchUserRowByClerkId(
  clerkId: string,
  columns = 'role',
  attempts = 4
): Promise<{ data: UserRow | null; error: any }> {
  let lastError: any = null
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const { data, error } = await supabase
      .from('users')
      .select(columns)
      .eq('clerk_id', clerkId)
      .single()

    if (!error && data) {
      return { data: data as unknown as UserRow, error: null }
    }

    lastError = error
    await new Promise(r => setTimeout(r, 1200 * attempt))
  }
  return { data: null, error: lastError }
}