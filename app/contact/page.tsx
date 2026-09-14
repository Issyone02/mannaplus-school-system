'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2, ArrowRight } from 'lucide-react'
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

  const inputCls = 'w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent'
  const labelCls = 'block text-sm font-bold uppercase tracking-wider text-amber-200 mb-2'

  return (
    <div className="min-h-screen text-white" style={{ background: 'linear-gradient(135deg, #062b1f 0%, #14532d 55%, #062b1f 100%)' }}>
      <Toaster position="top-right" />

      {/* Header */}
      <section className="max-w-4xl mx-auto px-4 pt-16 pb-8 text-center">
        <span className="inline-block px-6 py-2 rounded-full border border-amber-400/60 text-amber-300 text-sm font-bold uppercase tracking-widest mb-6">
          Start a Conversation
        </span>
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-amber-400 mb-4">Contact Us</h1>
        <p className="text-green-100 text-lg max-w-2xl mx-auto">
          Have a question about admissions, fees or academics? Send us an enquiry —
          our team replies within <strong>2 working days</strong>.
        </p>
      </section>

      {/* Main card */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6 md:p-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Info side */}
          <div className="space-y-5">
            <h2 className="font-serif text-2xl font-bold text-amber-400 mb-2">Reach the School Office</h2>
            {infoCards.map((c, i) => (
              <div key={i} className="flex gap-4 rounded-2xl bg-white/5 border border-white/10 p-4">
                <div className="w-11 h-11 shrink-0 rounded-full bg-amber-400/20 flex items-center justify-center">
                  <c.icon className="text-amber-300" size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-amber-200 mb-1">{c.title}</h3>
                  {c.lines.map((l, j) => <p key={j} className="text-sm text-green-100">{l}</p>)}
                </div>
              </div>
            ))}
            <div className="rounded-2xl bg-amber-400/10 border border-amber-400/30 p-4 text-sm text-amber-100">
              🎓 Ready to join us instead?{' '}
              <Link href="/admissions" className="font-bold text-amber-300 underline inline-flex items-center gap-1">
                Apply for Admission <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Form side */}
          <div>
            {submitted ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16">
                <CheckCircle2 className="text-amber-400 mb-4" size={64} />
                <h2 className="font-serif text-3xl font-bold text-amber-400 mb-3">Thank You!</h2>
                <p className="text-green-100 mb-8 max-w-sm">
                  Your enquiry has been received. Our admissions team will contact you within 2 working days.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ full_name: '', email: '', phone: '', enquiry_type: enquiryTypes[0], message: '' }) }}
                  className="px-6 py-3 rounded-full border border-amber-400/60 text-amber-300 font-bold hover:bg-amber-400/10"
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
                    {enquiryTypes.map(t => <option key={t} value={t} className="text-gray-900">{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Your Message *</label>
                  <textarea rows={5} className={inputCls} placeholder="Tell us how we can help you..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-gray-900 py-4 rounded-full font-bold text-lg hover:opacity-90 disabled:opacity-50"
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