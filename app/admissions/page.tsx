import Link from 'next/link'
import { FileText, ClipboardList, UserCheck, School, ArrowRight, CheckCircle2 } from 'lucide-react'

export const metadata = {
  title: 'Admissions | Mannaplus Group of Schools',
  description: 'Admissions open for the 2026/2027 session — Nursery 1 to SS3. Join Mannaplus Group of Schools, Sango Ota.',
}

const steps = [
  { icon: FileText, title: '1. Obtain an Application', text: 'Buy the application form online or at the school office — ₦5,000 (non-refundable).' },
  { icon: ClipboardList, title: '2. Entrance Assessment', text: 'Your child sits the entrance examination in English & Mathematics — held monthly.' },
  { icon: UserCheck, title: '3. Offer & Registration', text: 'Successful candidates receive an offer letter and complete registration with the documents below.' },
  { icon: School, title: '4. Resumption', text: 'Your child joins the Mannaplus family and begins the journey to leadership!' },
]

const documents = [
  'Birth certificate (photocopy)',
  'Most recent term report card',
  '2 recent passport photographs',
  'Transfer/withdrawal letter (for SS transfers)',
]

export default function AdmissionsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-green-700 to-green-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <p className="uppercase tracking-widest text-green-200 text-sm font-bold mb-3">Nursery 1 → SS 3</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Admissions</h1>
          <p className="max-w-2xl mx-auto text-green-100 text-lg">Admissions are open for the 2026/2027 academic session. We welcome applications all year round.</p>
        </div>
      </section>

      {/* Steps */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">How Admission Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div key={i} className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mb-4"><s.icon className="text-green-700" size={24} /></div>
              <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
              <p className="text-sm text-gray-600">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Documents + classes */}
      <section className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-4 grid md:grid-cols-2 gap-8">
          <div className="bg-green-50 rounded-xl border border-green-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Required Documents</h3>
            <ul className="space-y-3">
              {documents.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-700">
                  <CheckCircle2 className="text-green-600 shrink-0 mt-0.5" size={18} /> {d}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Entry Points</h3>
            <ul className="space-y-3 text-gray-700">
              <li>• <strong>Nursery 1 – Primary 6:</strong> open entry, age-appropriate placement.</li>
              <li>• <strong>JSS 1 – JSS 3:</strong> entrance assessment in English & Maths.</li>
              <li>• <strong>SS 1 – SS 2:</strong> transfer students with strong academic records.</li>
              <li>• Entrance examinations hold <strong>monthly</strong>.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Have questions?</h2>
        <p className="text-gray-600 mb-8">Our admissions team is available Mon–Fri, 7:30am – 4:00pm.</p>
        <Link href="/contact" className="inline-flex items-center gap-2 bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700">
          Contact Admissions <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  )
}