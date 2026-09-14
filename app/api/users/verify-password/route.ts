import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // 1. Verify the caller is authenticated
    const { userId: callerId } = await auth()
    if (!callerId) {
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 })
    }

    const { userId, password } = await request.json()

    if (!userId || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 2. Only allow verifying your OWN password, unless the caller is an admin.
    // Without this, any signed-in user could brute-force any other account's
    // password by passing a different userId.
    if (userId !== callerId) {
      const clerk = await clerkClient()
      const callerUser = await clerk.users.getUser(callerId)
      const callerEmail = callerUser.emailAddresses[0]?.emailAddress

      const { data: callerRecord } = callerEmail
        ? await supabase.from('users').select('role').eq('email', callerEmail).single()
        : { data: null }

      if (!callerRecord || callerRecord.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden: you may only verify your own password' },
          { status: 403 }
        )
      }
    }

    // Verify password using Clerk API
    const clerk = await clerkClient()
    const { verified } = await clerk.users.verifyPassword({
      userId,
      password,
    })

    if (!verified) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { verified: true },
      { status: 200 }
    )

  } catch (error: any) {
    console.error('=== ERROR VERIFYING PASSWORD ===')
    console.error('Error:', error.message)

    return NextResponse.json(
      { error: error.message || 'Failed to verify password' },
      { status: 500 }
    )
  }
}