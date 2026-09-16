import { supabase } from '@/lib/supabase'

export interface EmailConflict {
  person: string
  role: string
}

/**
 * ✅ ONE EMAIL = ONE PERSON.
 * Checks the email against student portal emails, parent emails and teacher
 * emails. Returns the conflicting person, or null when the email is free.
 */
export async function findEmailConflict(
  email: string,
  opts: { ignoreStudentId?: string; ignoreParentId?: string } = {}
): Promise<EmailConflict | null> {
  const clean = (email || '').trim().toLowerCase()
  if (!clean) return null

  // 1. Students (portal email)
  let sq = supabase.from('students').select('id, full_name').ilike('user_email', clean)
  if (opts.ignoreStudentId) sq = sq.neq('id', opts.ignoreStudentId)
  const { data: stu } = await sq.limit(1)
  if (stu && stu.length > 0) return { person: stu[0].full_name, role: 'Student' }

  // 2. Parents (contact / portal email)
  let pq = supabase.from('parents').select('id, full_name').ilike('email', clean)
  if (opts.ignoreParentId) pq = pq.neq('id', opts.ignoreParentId)
  const { data: par } = await pq.limit(1)
  if (par && par.length > 0) return { person: par[0].full_name, role: 'Parent' }

  // 3. Teachers
  const { data: tea } = await supabase.from('teachers').select('*').ilike('email', clean).limit(1)
  if (tea && tea.length > 0) {
    const t: any = tea[0]
    return { person: t.full_name || t.name || 'A teacher', role: 'Teacher' }
  }

  return null
}