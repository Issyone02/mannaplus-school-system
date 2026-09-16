import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient as clerkClientFromNext } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/backend';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Only these roles may ever be assigned. Keeps a bad/forged request body
// from self-granting 'admin' or any role we didn't anticipate.
const ALLOWED_ROLES = ['admin', 'teacher', 'parent', 'student'] as const;

export async function POST(request: NextRequest) {
  try {
    // 1. Verify the caller is authenticated
    const { userId: callerId } = await auth();
    if (!callerId) {
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 });
    }

    // 2. Verify the caller is an admin in our database
    const clerk = await clerkClientFromNext();
    const callerUser = await clerk.users.getUser(callerId);
    const callerEmail = callerUser.emailAddresses[0]?.emailAddress;

    if (!callerEmail) {
      return NextResponse.json({ error: 'Could not verify caller email' }, { status: 403 });
    }

    const { data: callerRecord } = await supabase
      .from('users')
      .select('role')
      .eq('email', callerEmail)
      .single();

    if (!callerRecord || callerRecord.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { email, fullName, role, phone } = body;

    if (!email || !fullName || !role) {
      return NextResponse.json(
        { error: 'Email, full name, and role are required' },
        { status: 400 }
      );
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${ALLOWED_ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    // 1. Check if user already exists in our Supabase database
    const { data: existingUser } = await supabase
      .from('users')
      .select('clerk_id, id, role, full_name')
      .eq('email', email)
      .single();

    if (existingUser) {
      // ✅ ONE EMAIL = ONE PERSON: never link a student request to a parent account (or vice versa)
      if (existingUser.role !== role) {
        return NextResponse.json({
          error: `This email already belongs to ${existingUser.full_name || 'another person'} (${existingUser.role} account). One email can identify only one person. Use a different email (e.g. an alias like name+student@gmail.com).`,
        }, { status: 409 });
      }
      if (existingUser.clerk_id) {
        return NextResponse.json({
          success: true,
          userId: existingUser.id,
          clerkId: existingUser.clerk_id,
          message: 'User already exists and is linked.',
        });
      }
    }

    // ✅ Cross-person guard: the email may not be owned by another student/parent/teacher record
    const clean = email.trim().toLowerCase();
    if (role !== 'student') {
      const { data: stuHit } = await supabase.from('students').select('full_name').ilike('user_email', clean).limit(1);
      if (stuHit && stuHit.length > 0) {
        return NextResponse.json({ error: `This email already belongs to student ${stuHit[0].full_name}. One email can identify only one person.` }, { status: 409 });
      }
    }
    if (role !== 'parent') {
      const { data: parHit } = await supabase.from('parents').select('full_name').ilike('email', clean).limit(1);
      if (parHit && parHit.length > 0) {
        return NextResponse.json({ error: `This email already belongs to parent ${parHit[0].full_name}. One email can identify only one person.` }, { status: 409 });
      }
    }
    if (role !== 'teacher') {
      const { data: teaHit } = await supabase.from('teachers').select('*').ilike('email', clean).limit(1);
      if (teaHit && teaHit.length > 0) {
        const t: any = teaHit[0];
        return NextResponse.json({ error: `This email already belongs to teacher ${t.full_name || t.name || ''}. One email can identify only one person.` }, { status: 409 });
      }
    }

    // crypto.randomBytes instead of Math.random(): this becomes a real,
    // if temporary, account password, so it needs to be unguessable.
    const tempPassword = `TempPass${randomBytes(6).toString('hex')}!`;

    // 2. Try to create the user in Clerk
    let clerkUser;
    try {
      clerkUser = await clerkClient.users.createUser({
        emailAddress: [email],
        password: tempPassword,
        firstName: fullName.split(' ')[0],
        lastName: fullName.split(' ').slice(1).join(' ') || '',
        publicMetadata: { role: role },
      });
    } catch (clerkError: any) {
      // 3. If Clerk says "email exists", check if we can find them in Supabase by email alone
      if (clerkError.errors?.[0]?.code === 'form_identifier_exists') {
        const { data: fallbackUser } = await supabase
          .from('users')
          .select('id, clerk_id')
          .eq('email', email)
          .single();
          
        if (fallbackUser) {
          return NextResponse.json({
            success: true,
            userId: fallbackUser.id,
            clerkId: fallbackUser.clerk_id,
            message: 'Linked to existing account.',
          });
        }
        
        // If they exist in Clerk but NOT in our DB, return a friendly error
        return NextResponse.json(
          { error: 'This email is already registered in the system. Please use a different email or contact the admin.' },
          { status: 409 }
        );
      }
      // If it's a different Clerk error, throw it
      throw clerkError;
    }

    // 4. Save the new user to Supabase
    const { data, error } = await supabase
      .from('users')
      .insert([{
        clerk_id: clerkUser.id,
        email: email,
        full_name: fullName,
        role: role,
        phone: phone || null,
        active: true,
        created_at: new Date().toISOString(),
      }])
      .select('id')
      .single();

    if (error) {
      // Rollback: Delete the Clerk user if Supabase insert fails to prevent orphaned accounts
      await clerkClient.users.deleteUser(clerkUser.id).catch(console.error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      userId: data.id,
      clerkId: clerkUser.id,
      message: 'User created successfully!',
    });

  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
}