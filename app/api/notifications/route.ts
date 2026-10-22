import { NextResponse, NextRequest } from 'next/server' // ✅ Added NextRequest
import { getAuth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: NextRequest) { // ✅ Changed Request to NextRequest
  // ✅ Disable caching for real-time updates
  const headers = new Headers()
  headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate')
 
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ notifications: [], unreadCount: 0 }, { headers })
    }

    // 1. Get User Role (Bypasses RLS)
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .single()
    
    if (!user) {
      return NextResponse.json({ notifications: [], unreadCount: 0 }, { headers })
    }

    // 2. Fetch PERSONAL notifications
    const { data: personal } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    // 3. Fetch GLOBAL notifications
    const { data: global } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .is('user_id', null)
      .eq('role', user.role)
      .order('created_at', { ascending: false })
      .limit(50)

    // 4. Combine, deduplicate, and sort
    const allNotifications = [...(personal || []), ...(global || [])]
    const uniqueMap = new Map(allNotifications.map(n => [n.id, n]))
    const uniqueNotifications = Array.from(uniqueMap.values())
    uniqueNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const unreadCount = uniqueNotifications.filter(n => !n.is_read).length

    return NextResponse.json({ notifications: uniqueNotifications, unreadCount }, { headers })
  } catch (error: any) {
    console.error('Notifications API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500, headers })
  }
}

export async function PATCH(request: NextRequest) { // ✅ Changed Request to NextRequest
  try {
    const { userId } = getAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await request.json()

    // Mark as read
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}