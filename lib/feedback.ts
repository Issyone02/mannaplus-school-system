import { supabase } from '@/lib/supabase'

// ✅ UPLOAD FILE VIA SECURE API ROUTE (Bypasses Client-Side RLS Issues)
export async function uploadFeedbackAttachment(file: File, _userId: string): Promise<string | null> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/upload-feedback', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Upload failed')
  }

  const data = await response.json()
  return data.path // Returns the storage path (e.g., "user_123/179348...png")
}

// ✅ GET SIGNED URL VIA SECURE API (Clerk users have no Supabase session, so browser-side signing fails)
export async function getSignedUrl(path: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/feedback-file?path=${encodeURIComponent(path)}`)
    if (!res.ok) return null
    const data = await res.json()
    return data.url || null
  } catch {
    return null
  }
}

// ✅ CREATE NEW THREAD
export async function createThread(data: {
  subject: string
  message: string
  senderId: string
  senderRole: 'teacher' | 'parent'
  senderName: string
  file?: File
}) {
  try {
    let attachmentUrl: string | null = null
    let attachmentType: string | null = null

    if (data.file) {
      attachmentUrl = await uploadFeedbackAttachment(data.file, data.senderId)
      attachmentType = data.file.type
    }

    // 1. Insert Thread
    const { data: thread, error: threadError } = await supabase
      .from('feedback_threads')
      .insert({
        subject: data.subject,
        sender_id: data.senderId,
        sender_role: data.senderRole,
        sender_name: data.senderName,
        status: 'open'
      })
      .select()
      .single()

    if (threadError) throw threadError

    // 2. Insert First Message
    const { error: msgError } = await supabase
      .from('feedback_messages')
      .insert({
        thread_id: thread.id,
        sender_id: data.senderId,
        sender_role: data.senderRole,
        sender_name: data.senderName,
        message_text: data.message,
        attachment_url: attachmentUrl,
        attachment_type: attachmentType
      })

    if (msgError) throw msgError

    return thread
  } catch (error) {
    console.error('Create thread error:', error)
    throw error
  }
}

// ✅ POST REPLY MESSAGE
export async function postReply(data: {
  threadId: string
  message: string
  senderId: string
  senderRole: 'teacher' | 'parent' | 'admin'
  senderName: string
  file?: File
}) {
  try {
    let attachmentUrl: string | null = null
    let attachmentType: string | null = null

    if (data.file) {
      attachmentUrl = await uploadFeedbackAttachment(data.file, data.senderId)
      attachmentType = data.file.type
    }

    const { error } = await supabase
      .from('feedback_messages')
      .insert({
        thread_id: data.threadId,
        sender_id: data.senderId,
        sender_role: data.senderRole,
        sender_name: data.senderName,
        message_text: data.message,
        attachment_url: attachmentUrl,
        attachment_type: attachmentType
      })

    if (error) throw error
    
    // Update thread timestamp
    await supabase.from('feedback_threads').update({ updated_at: new Date().toISOString() }).eq('id', data.threadId)
    
    return true
  } catch (error) {
    console.error('Post reply error:', error)
    throw error
  }
}

// ✅ GET THREADS LIST (Filtered by Role for Security/Efficiency)
export async function getThreads(filterRole?: 'teacher' | 'parent' | 'all') {
  let query = supabase
    .from('feedback_threads')
    .select(`
      *,
      latest_message:feedback_messages(message_text, created_at, sender_role, sender_name)
    `)
    .order('updated_at', { ascending: false })

  // If filtering by role, apply it in the query
  if (filterRole && filterRole !== 'all') {
    query = query.eq('sender_role', filterRole)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

// ✅ GET SINGLE THREAD DETAILS + MESSAGES
export async function getThreadDetails(threadId: string) {
  const { data: thread, error: threadError } = await supabase
    .from('feedback_threads')
    .select('*')
    .eq('id', threadId)
    .single()

  if (threadError) throw threadError

  const { data: messages, error: msgError } = await supabase
    .from('feedback_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (msgError) throw msgError

  return { thread, messages: messages || [] }
}

// ✅ UPDATE STATUS
export async function updateThreadStatus(threadId: string, status: 'open' | 'resolved') {
  const { error } = await supabase
    .from('feedback_threads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', threadId)
  
  if (error) throw error
  return true
}