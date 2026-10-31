import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient as clerkClientFromNext } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/backend';
import { createClient } from '@supabase/supabase-js';

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALLOWED_ROLES = ['admin', 'teacher', 'parent', 'student'] as const;

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId: callerId } = await auth();
    if (!callerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const clerk = await clerkClientFromNext();
    const callerEmail = (await clerk.users.getUser(callerId)).emailAddresses[0]?.emailAddress;
    const { data: callerRec } = await supabase.from('users').select('role').eq('email', callerEmail).single();
    if (!callerRec || callerRec.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { id } = await params;
    const { role } = await request.json();
    if (!ALLOWED_ROLES.includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });

    // 1. Update Supabase (source of truth)
    const { data: updated, error } = await supabase
      .from('users').update({ role }).eq('id', id).select('clerk_id').single();
    if (error) throw error;

    // 2. Mirror into Clerk publicMetadata (best-effort; don't fail the whole op if Clerk rejects)
    if (updated?.clerk_id) {
      await clerkClient.users.updateUser(updated.clerk_id, { publicMetadata: { role } })
        .catch(err => console.error('Clerk metadata sync failed:', err));
    }

    return NextResponse.json({ success: true, role });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 });
  }
}