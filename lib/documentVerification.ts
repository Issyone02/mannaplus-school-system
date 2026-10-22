import { supabase } from './supabase'

export interface VerificationData {
  document_type: 'report_card' | 'receipt' | 'certificate'
  student_id: string
  term: string
  session: string
  metadata?: Record<string, any>
}

/**
 * Returns the existing token for this document, or creates one if none exists.
 * Stable: reprinting the same report card reuses the same QR code.
 */
export async function generateVerificationToken(data: VerificationData): Promise<string> {
  // 1. Reuse existing token if present
  const { data: existing } = await supabase
    .from('document_verifications')
    .select('token')
    .eq('student_id', data.student_id)
    .eq('term', data.term)
    .eq('session', data.session)
    .eq('document_type', data.document_type)
    .maybeSingle()

  if (existing?.token) return existing.token

  // 2. Create a new unguessable token using Web Crypto (works in browser)
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')

  const { error } = await supabase.from('document_verifications').insert({
    token,
    document_type: data.document_type,
    student_id: data.student_id,
    term: data.term,
    session: data.session,
    metadata: data.metadata || {},
  })

  if (error) throw error
  return token
}