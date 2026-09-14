import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await request.json()
    const { otp, purpose, userEmail } = body

    if (!otp || !userEmail) {
      return NextResponse.json(
        { error: 'OTP and user email are required' },
        { status: 400 }
      )
    }

    // Find the OTP in database
    const { data, error } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('user_email', userEmail)
      .eq('code', otp)
      .eq('purpose', purpose || 'attendance_override')
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      console.error('OTP verification failed:', error)
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      )
    }

    // Mark as used
    await supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('id', data.id)

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully',
    })
  } catch (error: any) {
    console.error('Error in verify-otp API:', error)
    return NextResponse.json(
      { 
        error: 'Failed to verify OTP',
        details: error.message 
      },
      { status: 500 }
    )
  }
}