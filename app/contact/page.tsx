'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2, ArrowRight, MessageSquare } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const enquiryTypes = ['Admissions & Enrollment', 'Fees & Payments', 'Academics & Curriculum', 'Partnerships & Other']

const infoCards = [
  { icon: MapPin, title: 'Visit Us', lines: ['34, Orisun Ibukun Avenue,', 'Arinko Sango Ota, Ogun State'] },
  { icon: Phone, title: 'Call Us', lines: ['+234 342 872 28', '+234 803 496 7499'] },
  { icon: Mail, title: 'Email Us', lines: ['mannapluscollege@school.com', 'info@mannaplusgroupofschools.com'] },
  { icon: Clock, title: 'Office Hours', lines: ['Mon – Fri: 7:30am – 4:00pm', 'Sat: by appointment'] },
]

export default function ContactPage() {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', enquiry_type: enquiryTypes[0], message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.full_name || !form.email || !form.message) {
      toast.error('Please fill in your name, email and message')
      return
    }
    setSubmitting(true)
    try {
      const { error } = await supabase.from('contact_enquiries').insert([{ ...form }])
      if (error) throw error
      setSubmitted(true)
      toast.success('Enquiry sent successfully!')
    } catch (err: any) {
      toast.error('Failed to send: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = 'w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent'
  const labelCls = 'block text-sm font-bold uppercase tracking-wider text-gray-700 mb-2'

  return (
    <div className="public-page min-h-screen">
      <Toaster position="top-right" />

      {/* ✅ UNIFIED HERO: Matches Home, About, and News pages exactly */}
      <section className="bg-gradient-to-br from-green-700 to-green-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-600/40 rounded-full text-green-100 text-sm font-bold mb-4">
            <MessageSquare size={16} /> Start a Conversation
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Contact Us</h1>
          <p className="max-w-2xl mx-auto text-green-100 text-lg">
            Have a question about admissions, fees or academics? Send us an enquiry —
            our team replies within <strong>2 working days</strong>.
          </p>
        </div>
      </section>

      {/* Main Form Card: Solid white for perfect readability over the transparent background */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="rounded-3xl border border-gray-200 bg-white shadow-xl p-6 md:p-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          {/* Info side */}
          <div className="space-y-5">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Reach the School Office</h2>
            {infoCards.map((c, i) => (
              <div key={i} className="flex gap-4 rounded-xl bg-green-50 border border-green-100 p-4">
                <div className="w-11 h-11 shrink-0 rounded-full bg-green-100 flex items-center justify-center">
                  <c.icon className="text-green-700" size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{c.title}</h3>
                  {c.lines.map((l, j) => <p key={j} className="text-sm text-gray-600">{l}</p>)}
                </div>
              </div>
            ))}
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
              🎓 Ready to join us instead?{' '}
              <Link href="/admissions" className="font-bold text-amber-700 underline inline-flex items-center gap-1">
                Apply for Admission <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Form side */}
          <div>
            {submitted ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16">
                <CheckCircle2 className="text-green-600 mb-4" size={64} />
                <h2 className="text-3xl font-bold text-gray-900 mb-3">Thank You!</h2>
                <p className="text-gray-600 mb-8 max-w-sm">
                  Your enquiry has been received. Our admissions team will contact you within 2 working days.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ full_name: '', email: '', phone: '', enquiry_type: enquiryTypes[0], message: '' }) }}
                  className="px-6 py-3 rounded-full border-2 border-green-700 text-green-800 font-bold hover:bg-green-50"
                >
                  Send Another Enquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className={labelCls}>Full Name *</label>
                  <input className={inputCls} placeholder="e.g., Mrs. Funke Adele" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Email Address *</label>
                    <input type="email" className={inputCls} placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>
                  <div>
                    <label className={labelCls}>Phone (Optional)</label>
                    <input type="tel" className={inputCls} placeholder="+234 812 345 6789" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Enquiry Type</label>
                  <select className={inputCls} value={form.enquiry_type} onChange={(e) => setForm({ ...form, enquiry_type: e.target.value })}>
                    {enquiryTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Your Message *</label>
                  <textarea rows={5} className={inputCls} placeholder="Tell us how we can help you..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-xl font-bold text-lg hover:opacity-90 disabled:opacity-50 shadow-md"
                >
                  <Send size={20} /> {submitting ? 'Sending...' : 'Submit Enquiry'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}