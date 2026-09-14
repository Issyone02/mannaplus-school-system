import Link from 'next/link'
import { Baby, School, GraduationCap, Trophy, Users, CalendarDays, Monitor, Shield, Heart, BookOpen, ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'Mannaplus Group of Schools | Grooming the Future Leaders',
  description: "Ogun State's premier private school group (Nursery, Primary & College) — world-class academics, moral formation and digital reporting since 1998.",
}

const stats = [
  { icon: Trophy, value: '98%', label: 'WAEC/NECO Pass Rate' },
  { icon: Users, value: '1,200+', label: 'Students Enrolled' },
  { icon: School, value: '3', label: 'School Sections' },
  { icon: CalendarDays, value: '25+', label: 'Years of Excellence' },
]

const programs = [
  { icon: Baby, color: 'bg-pink-600', title: 'Nursery (Early Years)', text: 'Play-based foundational learning — phonics, numeracy, rhymes and social skills in a warm, safe environment.', chips: ['Nursery 1', 'Nursery 2', 'Nursery 3'] },
  { icon: School, color: 'bg-green-600', title: 'Primary School', text: 'Strong literacy, numeracy, science and civic education with computer training and moral formation.', chips: ['Primary 1 – 6'] },
  { icon: GraduationCap, color: 'bg-blue-600', title: 'College (Secondary)', text: 'JSS & SS with Science, Arts and Commercial departments — full preparation for BECE, WAEC, NECO & JAMB.', chips: ['JSS 1 – 3', 'SS 1 – 3'] },
]

const why = [
  { icon: BookOpen, title: 'Rich Curriculum', text: 'National curriculum enriched with STEM, ICT and moral instruction.' },
  { icon: Monitor, title: 'Digital Campus', text: 'Online results, attendance and report cards for parents & students.' },
  { icon: Shield, title: 'Safe & Disciplined', text: 'A secure, structured and caring environment in Sango Ota.' },
  { icon: Heart, title: 'Character First', text: 'Values and leadership woven into everyday school life.' },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-green-600 to-green-900 text-white py-24">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="uppercase tracking-widest text-green-200 text-sm font-bold mb-4">Motto: Grooming the Future Leaders • Since 1998</p>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Where <span className="text-yellow-300">excellence</span> meets character
          </h1>
          <p className="text-xl md:text-2xl mb-10 text-green-100 max-w-3xl mx-auto">
            Mannaplus Group of Schools raises Nigeria's next generation of leaders through
            world-class academics, holistic development, and a culture of discipline and innovation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/admissions" className="bg-yellow-400 text-gray-900 px-8 py-4 rounded-lg font-bold text-lg hover:bg-yellow-300 transition-colors">
              Apply for Admission
            </Link>
            <Link href="/academics" className="bg-white text-green-700 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors">
              Explore Academics
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <stat.icon className="w-12 h-12 mx-auto mb-4 text-green-600" />
                <div className="text-4xl font-bold text-gray-900 mb-2">{stat.value}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Programs */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">One Group, Three Schools</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">A seamless academic journey from a child's first day in Nursery to SS3 graduation.</p>
          <div className="grid md:grid-cols-3 gap-8">
            {programs.map((p, i) => (
              <div key={i} className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className={`h-40 ${p.color} flex items-center justify-center`}>
                  <p.icon className="w-16 h-16 text-white" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-3 text-gray-900">{p.title}</h3>
                  <p className="text-gray-600 mb-4">{p.text}</p>
                  <div className="flex flex-wrap gap-2">
                    {p.chips.map(c => <span key={c} className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">{c}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Mannaplus */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">Why Mannaplus?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {why.map((w, i) => (
              <div key={i} className="rounded-xl border border-gray-200 p-6 text-center hover:shadow-md transition-shadow">
                <div className="w-12 h-12 mx-auto rounded-lg bg-green-100 flex items-center justify-center mb-4"><w.icon className="text-green-700" size={24} /></div>
                <h3 className="font-bold text-gray-900 mb-2">{w.title}</h3>
                <p className="text-sm text-gray-600">{w.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Digital campus */}
      <section className="py-20 bg-green-50">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">A Fully Digital Campus</h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">Parents follow results, attendance and fees online; teachers enter results seamlessly; students access their own report cards — all in real time.</p>
          <Link href="/sign-in" className="inline-flex items-center gap-2 bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700">
            Sign in to your portal <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-green-700 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Join the Mannaplus Family?</h2>
          <p className="text-xl mb-8 text-green-100">Admissions are now open for the 2026/2027 academic session. Speak with our admissions team today.</p>
          <Link href="/admissions" className="bg-yellow-400 text-gray-900 px-8 py-4 rounded-lg font-bold text-lg hover:bg-yellow-300 transition-colors inline-block">
            Apply Now
          </Link>
        </div>
      </section>
    </div>
  )
}