import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const { to, subject, html } = await request.json()

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}