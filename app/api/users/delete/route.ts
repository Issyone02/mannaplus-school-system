import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

// ✅ SERVICE-ROLE client: bypasses RLS so unlinks & deletes ACTUALLY execute.
// (The anon client silently deletes 0 rows when RLS blocks it — no error thrown!)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function deleteClerkByEmail(clerk: any, email: string) {
  try {
    const list = await clerk.users.getUserList({ emailAddress: [email] })
    for (const u of list.data) {
      await clerk.users.deleteUser(u.id)
      console.log(`[DELETE] Clerk user ${u.id} deleted (found by email)`)
    }
  } catch (e: any) {
    console.warn('[DELETE] Clerk email-fallback warning:', e.message)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // 1. Verify caller is authenticated
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 })
    }

    const { userId: targetUserId } = await request.json()
    if (!targetUserId) {
      return NextResponse.json({ error: 'Missing target user ID' }, { status: 400 })
    }

    // 2. Verify caller is an admin
    const clerk = await clerkClient()
    const currentUser = await clerk.users.getUser(userId)
    const adminEmail = currentUser.emailAddresses[0]?.emailAddress
    if (!adminEmail) {
      return NextResponse.json({ error: 'Could not verify admin email' }, { status: 403 })
    }

    const { data: adminRecord } = await supabase
      .from('users')
      .select('role')
      .eq('email', adminEmail)
      .single()

    if (!adminRecord || adminRecord.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // 3. Load target user
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('clerk_id, role, email, full_name')
      .eq('id', targetUserId)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (targetUser.role === 'admin') {
      return NextResponse.json({ error: 'Cannot delete admin accounts' }, { status: 403 })
    }

    // 4. ✅ UNLINK from every referencing table (FK safety)
    console.log(`[DELETE] Unlinking ${targetUser.full_name} (${targetUserId}) from referencing tables...`)
    const links = [
      { table: 'students', column: 'user_id' },
      { table: 'students', column: 'parent_id' },
      { table: 'timetable', column: 'teacher_id' },
      { table: 'fee_payments', column: 'created_by' },
      { table: 'parents', column: 'user_id' },
    ]
    for (const { table, column } of links) {
      const { error } = await supabase
        .from(table)
        .update({ [column]: null })
        .eq(column, targetUserId)
      if (error) console.error(`[DELETE] Unlink warning ${table}.${column}:`, error.message)
    }

    // 5. ✅ DELETE the users row
    const { error: delError } = await supabase
      .from('users')
      .delete()
      .eq('id', targetUserId)

    if (delError) {
      console.error('[DELETE] Supabase delete error:', delError)
      return NextResponse.json({ error: `Database delete failed: ${delError.message}` }, { status: 500 })
    }

    // 6. ✅ VERIFY the row is truly gone (guards against silent RLS no-ops)
    const { count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('id', targetUserId)

    if ((count || 0) > 0) {
      console.error('[DELETE] Row STILL present after delete — database policy blocked it')
      return NextResponse.json({ error: 'Delete failed: row still exists (database policy blocked it)' }, { status: 500 })
    }

    // 7. ✅ Clean up Clerk (by id, with email fallback when id is stale)
    if (targetUser.clerk_id) {
      try {
        await clerk.users.deleteUser(targetUser.clerk_id)
        console.log(`[DELETE] Clerk user ${targetUser.clerk_id} deleted`)
      } catch (e: any) {
        console.warn('[DELETE] Clerk delete-by-id warning:', e.message)
        await deleteClerkByEmail(clerk, targetUser.email)
      }
    } else {
      await deleteClerkByEmail(clerk, targetUser.email)
    }

    console.log(`[DELETE] ✅ Complete: ${targetUser.full_name} (${targetUser.email}) removed from app and Clerk`)
    return NextResponse.json({ message: `User "${targetUser.full_name}" deleted successfully` }, { status: 200 })

  } catch (error: any) {
    console.error('=== ERROR DELETING USER ===', error)
    return NextResponse.json({ error: error.message || 'Failed to delete user' }, { status: 500 })
  }
}