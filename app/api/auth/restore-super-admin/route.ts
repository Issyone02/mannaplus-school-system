import { NextResponse } from 'next/server';
import { auth, clerkClient as clerkClientFromNext } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/backend';
import { createClient } from '@supabase/supabase-js';

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SUPER_ADMIN_EMAIL = 'olalereisaiah68@gmail.com';

export async function POST() {
  try {
    // 1. Verify the caller is authenticated
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // 2. Verify the caller is the super admin
    const clerk = await clerkClientFromNext();
    const user = await clerk.users.getUser(userId);
    const email = user.emailAddresses[0]?.emailAddress?.toLowerCase();

    if (email !== SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden: only the super admin can use this endpoint' }, { status: 403 });
    }

    // 3. Restore role to admin in Supabase
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('email', SUPER_ADMIN_EMAIL);

    if (updateError) throw updateError;

    // 4. Mirror into Clerk publicMetadata
    await clerkClient.users.updateUser(userId, { publicMetadata: { role: 'admin' } })
      .catch(err => console.error('Clerk metadata sync failed:', err));

    return NextResponse.json({ 
      success: true, 
      message: 'Super admin role restored. Refresh the page to access admin portal.' 
    });
  } catch (error: any) {
    console.error('Restore super admin failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}