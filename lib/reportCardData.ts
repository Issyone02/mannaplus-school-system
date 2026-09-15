import { supabase } from '@/lib/supabase'

/**
 * ✅ AUTO CARRY-OVER: For any student + session, look up each subject's
 * First Term and Second Term totals from the results table and inject them
 * as first_term_total / second_term_total into the CURRENT term's rows.
 *
 * This fixes ALL existing data instantly (no migration, no manual entry):
 *  - 2nd Term cards show the real First Term totals
 *  - 3rd Term cards show the real First + Second Term totals
 *  - If a previous term truly has no result for a subject → null → printed as "-"
 */
export async function enrichResultsWithPreviousTerms(
  currentResults: any[],
  studentId: string,
  session: string
): Promise<any[]> {
  if (!currentResults || currentResults.length === 0) return currentResults || []

  const { data } = await supabase
    .from('results')
    .select('subject_id, term, total_score')
    .eq('student_id', studentId)
    .eq('session', session)

  if (!data) return currentResults

  const totalsBySubject: Record<string, { first?: number; second?: number }> = {}
  data.forEach((r: any) => {
    const entry = totalsBySubject[r.subject_id] || (totalsBySubject[r.subject_id] = {})
    if (r.term === 'First Term') entry.first = r.total_score
    else if (r.term === 'Second Term') entry.second = r.total_score
  })

  return currentResults.map((r) => {
    const t = totalsBySubject[r.subject_id] || {}
    return {
      ...r,
      first_term_total: t.first !== undefined ? t.first : null,
      second_term_total: t.second !== undefined ? t.second : null,
    }
  })
}