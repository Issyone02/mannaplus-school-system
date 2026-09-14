import { supabase } from '@/lib/supabase'

export interface ClassPosition {
  student_id: string
  overall_percentage: number
  position: number
  position_text: string // e.g. "1st", "2nd", "3rd"
  total_students: number // number of students ranked
}

// Converts 1 → "1st", 2 → "2nd", 3 → "3rd", 4 → "4th", 11 → "11th", etc.
export function getOrdinal(n: number): string {
  const v = n % 100
  if (v >= 11 && v <= 13) return `${n}th`
  switch (n % 10) {
    case 1: return `${n}st`
    case 2: return `${n}nd`
    case 3: return `${n}rd`
    default: return `${n}th`
  }
}

/**
 * Calculates class positions for a given class, term and session.
 * Ranks students by overall percentage (highest first).
 * Ties share the same position (1st, 1st, then 3rd).
 */
export async function calculateClassPositions(
  classId: string,
  term: string,
  session: string
): Promise<Map<string, ClassPosition>> {
  const positions = new Map<string, ClassPosition>()

  try {
    // 1. Fetch ALL results for this class + term + session
    const { data: results, error } = await supabase
      .from('results')
      .select('student_id, ca_score, exam_score')
      .eq('class_id', classId)
      .eq('term', term)
      .eq('session', session)

    if (error || !results || results.length === 0) return positions

    // 2. Group by student and sum their scores
    const perStudent = new Map<string, { total: number; subjects: number }>()
    results.forEach((r: any) => {
      const entry = perStudent.get(r.student_id) || { total: 0, subjects: 0 }
      entry.total += (r.ca_score || 0) + (r.exam_score || 0)
      entry.subjects += 1
      perStudent.set(r.student_id, entry)
    })

    // 3. Compute overall percentage (rounded to 1 decimal, same as report card)
    const ranked: { student_id: string; pct: number }[] = []
    perStudent.forEach((val, student_id) => {
      const max = val.subjects * 100
      const pct = max > 0 ? Math.round((val.total / max) * 100 * 10) / 10 : 0
      ranked.push({ student_id, pct })
    })

    // 4. Sort highest → lowest
    ranked.sort((a, b) => b.pct - a.pct)

    // 5. Assign positions (ties share the same position)
    const total = ranked.length
    ranked.forEach((entry, index) => {
      let position: number
      if (index > 0 && ranked[index - 1].pct === entry.pct) {
        position = positions.get(ranked[index - 1].student_id)!.position
      } else {
        position = index + 1
      }
      positions.set(entry.student_id, {
        student_id: entry.student_id,
        overall_percentage: entry.pct,
        position,
        position_text: getOrdinal(position),
        total_students: total,
      })
    })
  } catch (error) {
    console.error('Error calculating class positions:', error)
  }

  return positions
}