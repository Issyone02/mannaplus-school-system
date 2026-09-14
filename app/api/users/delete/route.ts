import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'

export async function DELETE(request: NextRequest) {
  try {
    // 1. Verify the current user is authenticated
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 })
    }

    const { userId: targetUserId } = await request.json()

    if (!targetUserId) {
      return NextResponse.json({ error: 'Missing target user ID' }, { status: 400 })
    }

    // 2. Get current user's email directly from Clerk to verify admin status
    const clerk = await clerkClient()
    const currentUser = await clerk.users.getUser(userId)
    const adminEmail = currentUser.emailAddresses[0]?.emailAddress

    if (!adminEmail) {
      return NextResponse.json({ error: 'Could not verify admin email' }, { status: 403 })
    }

    // 3. Check if this email belongs to an admin in our database
    const { data: adminRecord } = await supabase
      .from('users')
      .select('role')
      .eq('email', adminEmail)
      .single()

    if (!adminRecord || adminRecord.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // 4. Get target user details
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('role, email, full_name')
      .eq('id', targetUserId)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 5. Prevent deletion of admin accounts
    if (targetUser.role === 'admin') {
      return NextResponse.json({ error: 'Cannot delete admin accounts' }, { status: 403 })
    }

    // 6. Delete from Supabase
    const { error: supabaseError } = await supabase
      .from('users')
      .delete()
      .eq('id', targetUserId)

    if (supabaseError) {
      console.error('Supabase delete error:', supabaseError)
      return NextResponse.json({ error: 'Failed to delete user from database' }, { status: 500 })
            }

    // 7. Delete from Clerk using the target user's email
    try {
      const clerkUsers = await clerk.users.getUserList({ emailAddress: [targetUser.email] })
      if (clerkUsers.data.length > 0) {
        await clerk.users.deleteUser(clerkUsers.data[0].id)
      }
    } catch (clerkError) {
      console.error('Clerk delete error:', clerkError)
      // We continue anyway because the Supabase deletion succeeded
    }

    return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 })

  } catch (error: any) {
    console.error('=== ERROR DELETING USER ===')
    console.error('Error:', error.message)
    return NextResponse.json({ error: error.message || 'Failed to delete user' }, { status: 500 })
  }
}