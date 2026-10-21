import { supabase } from './supabase'

interface NotificationPayload {
  userId?: string // Clerk ID
  email?: string
  role: 'admin' | 'teacher' | 'parent' | 'student'
  title: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'urgent'
  link?: string
}

export async function sendNotification(payload: NotificationPayload) {
  try {
    // 1. Save to Database (In-App Bell)
    const { error: dbError } = await supabase.from('notifications').insert({
      user_id: payload.userId || null,
      email: payload.email || null,
      role: payload.role,
      title: payload.title,
      message: payload.message,
      type: payload.type || 'info',
      link: payload.link || null,
    })

    if (dbError) {
      console.error('DB Notification Error:', dbError)
      return { success: false, error: dbError.message }
    }

    // 2. Send Email (Layer 2) - Fire and forget
    if (payload.email) {
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: payload.email,
          subject: `[Mannaplus] ${payload.title}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2 style="color: #16a34a;">${payload.title}</h2>
              <p>${payload.message}</p>
              ${payload.link ? `<a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://my-school-management-system.vercel.app'}${payload.link}" style="background: #16a34a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Details</a>` : ''}
            </div>
          `,
        }),
      }).catch(err => console.error('Email trigger failed:', err))
    }

    return { success: true }
  } catch (error: any) {
    console.error('Notification System Error:', error)
    return { success: false, error: error.message }
  }
}

// Helper to get all admins (for broadcasting)
export async function getAdminEmails(): Promise<string[]> {
  const { data } = await supabase.from('users').select('email').eq('role', 'admin')
  return (data || []).map((u: any) => u.email)
}