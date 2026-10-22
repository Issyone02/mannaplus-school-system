import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(request: Request) {
  try {
    const { to, subject, html } = await request.json()

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // ✅ SAFE INITIALIZATION: Only create the client inside the handler
    // This prevents the Next.js build from crashing if the env var is missing
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️ RESEND_API_KEY is missing. Email not sent.')
      return NextResponse.json(
        { success: false, error: 'Email service not configured' }, 
        { status: 200 } // Return 200 so it doesn't trigger an alert on the client
      )
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    const { data, error } = await resend.emails.send({
      from: 'Mannaplus Portal <onboarding@resend.dev>', // Replace with your verified domain later
      to: [to],
      subject,
      html,
    })

    if (error) {
      console.error('Resend Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Send email error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}