import { NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { logAuditEvent } from '@/lib/auditLog'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // ✅ Next 16: params is a Promise
) {
  try {
    // ✅ Next 16: await params
    const { id } = await params

    // ✅ getAuth reads the Bearer token we sent from the client
    const { userId } = getAuth(request)
    console.log('🔐 Auth userId:', userId)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - No Clerk session' }, { status: 401 })
    }

    // ✅ Verify user is admin
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('role, email')
      .eq('clerk_id', userId)
      .single()

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // ✅ Delete the enquiry
    const { error } = await supabaseAdmin
      .from('contact_enquiries')
      .delete()
      .eq('id', id)

    if (error) throw error

    // ✅ AUDIT: Log the deletion
    await logAuditEvent({
      userEmail: user.email || 'unknown@admin.com',
      userRole: 'admin',
      action: 'delete_enquiry',
      description: `Deleted enquiry ID ${id}`,
      entityType: 'enquiry',
      entityId: id,
      severity: 'MEDIUM',
    })

    // ✅ Clean up the notification
    await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('link', '/admin/enquiries')
      .ilike('message', `%sent a message regarding%`)

    console.log('✅ Enquiry deleted:', id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('❌ Delete error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}