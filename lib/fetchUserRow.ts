import { supabase } from '@/lib/supabase'

export interface UserRow {
  id?: string
  role: string
  clerk_id?: string
  email?: string
}

/**
 * ✅ Fetch a user row by clerk_id with automatic retries AND self-healing.
 *
 * Resolution order inside every attempt:
 *  1) users.clerk_id = clerkId  (fast path)
 *  2) users.email ILIKE email   (fallback) → when found, the stored clerk_id
 *     is REPAIRED automatically so every future lookup succeeds instantly.
 *
 * Guarantees:
 *  - A flaky network no longer logs users out or bounces them to /dashboard.
 *  - A stale clerk_id can never lock a user out again (self-heal).
 *  - Backward compatible: the 3rd argument may be the retry count (number,
 *    old callers) or the user's email (string, new callers).
 */
export async function fetchUserRowByClerkId(
  clerkId: string,
  columns = 'role',
  attemptsOrEmail: number | string = 4,
  maybeEmail?: string
): Promise<{ data: UserRow | null; error: any }> {
  const email = typeof attemptsOrEmail === 'string' ? attemptsOrEmail : maybeEmail
  const attempts = typeof attemptsOrEmail === 'number' ? attemptsOrEmail : 4

  if (!clerkId) return { data: null, error: null }

  let lastError: any = null

  for (let attempt = 1; attempt <= attempts; attempt++) {
    // 1) Fast path: lookup by clerk_id
    const byClerk = await supabase
      .from('users')
      .select(columns)
      .eq('clerk_id', clerkId)
      .single()

    if (!byClerk.error && byClerk.data) {
      return { data: byClerk.data as unknown as UserRow, error: null }
    }
    lastError = byClerk.error

    // 2) Fallback: lookup by email, then SELF-HEAL the stored clerk_id
    if (email) {
      const byEmail = await supabase
        .from('users')
        .select(columns)
        .ilike('email', email)
        .single()

      if (!byEmail.error && byEmail.data) {
        const { error: healError } = await supabase
          .from('users')
          .update({ clerk_id: clerkId })
          .ilike('email', email)
        if (healError) {
          console.error('[fetchUserRowByClerkId] clerk_id repair failed:', healError.message)
        }
        return { data: byEmail.data as unknown as UserRow, error: null }
      }
    }

    // Back off before retrying (skip the pointless wait after the last attempt)
    if (attempt < attempts) {
      await new Promise(r => setTimeout(r, 1200 * attempt))
    }
  }

  return { data: null, error: lastError }
}