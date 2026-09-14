import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await request.json()
    const { purpose } = body
    const userEmail = body.userEmail

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      )
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // Store in database
    const { error } = await supabase
      .from('verification_codes')
      .insert({
        user_email: userEmail,
        code: otp,
        purpose: purpose || 'attendance_override',
        expires_at: expiresAt,
      })

    if (error) {
      console.error('Failed to store OTP:', error)
      return NextResponse.json(
        { error: 'Failed to generate OTP' },
        { status: 500 }
      )
    }

    // ✅ LOG OTP TO CONSOLE FOR TESTING
    console.log('='.repeat(50))
    console.log('🔐 OTP GENERATED')
    console.log('Email:', userEmail)
    console.log('Code:', otp)
    console.log('Purpose:', purpose)
    console.log('Expires:', expiresAt)
    console.log('='.repeat(50))

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      // Show OTP in response for testing (remove in production)
      debug_otp: otp,
    })
  } catch (error: any) {
    console.error('Error in send-otp API:', error)
    return NextResponse.json(
      { 
        error: 'Failed to send OTP',
        details: error.message 
      },
      { status: 500 }
    )
  }
}