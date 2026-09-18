// This file defines the "About" page for the Mannaplus Group of Schools website.
// It is a Next.js App Router Server Component that renders static content 
// regarding the school's history, mission, vision, values, and reasons to choose them.

import Link from 'next/link'
// We import specific, lightweight SVG icons from lucide-react to maintain 
// a consistent visual language without bloating the bundle size.
import { 
  Target, Eye, Heart, Award, Users, Shield, 
  BookOpen, Monitor, Trophy, MapPin, Phone, Mail, ArrowRight 
} from 'lucide-react'

// The metadata object is automatically read by Next.js to inject 
// SEO-friendly <title> and <meta name="description"> tags into the document head.
export const metadata = {
  title: 'About | Mannaplus Group of Schools',
  description: 'Our story, mission, vision and core values — Mannaplus Group of Schools, Sango Ota, Ogun State.',
}

// We extract static data into arrays outside the component. 
// This keeps the JSX return statement clean, readable, and easy to maintain.
// If the school adds a new value or stat later, we only update this array.
const stats = [
  { value: '25+', label: 'Years of Excellence' },
  { value: '3', label: 'School Sections' },
  { value: '20+', label: 'Subjects Offered' },
  { value: '3', label: 'SS Departments' },
]

// Each object in this array represents a core value. 
// We store the icon component itself (not an instance of it) so we can 
// dynamically render it inside the loop as <v.icon />.
const values = [
  { icon: Award, title: 'Excellence', text: 'We pursue the highest standards in academics, character and service.' },
  { icon: Shield, title: 'Discipline', text: 'A structured, caring environment that builds self-control and responsibility.' },
  { icon: Heart, title: 'Integrity', text: 'Honesty and fairness are modeled by staff and expected of every student.' },
  { icon: Users, title: 'Leadership', text: 'Every child is groomed to lead with confidence and compassion.' },
]

// Similar to the values array, this data drives the "Why Parents Choose Us" grid.
// Separating this data ensures the component remains focused on layout, not content.
const whyUs = [
  { icon: BookOpen, title: 'Strong Curriculum', text: 'Nigerian National Curriculum enriched with STEM, ICT and moral instruction.' },
  { icon: Users, title: 'Qualified Teachers', text: 'Trained, passionate educators with manageable class sizes for personal attention.' },
  { icon: Monitor, title: 'Digital Learning & Reporting', text: 'Computer training from early years, plus online results, attendance and report cards.' },
  { icon: Trophy, title: 'Co-Curricular Activities', text: 'Sports, debate, quiz, music and arts to develop every child’s talents.' },
  { icon: Shield, title: 'Safe & Caring Environment', text: 'A secure, disciplined and nurturing campus in Sango Ota, Ogun State.' },
  { icon: Heart, title: 'Moral & Civic Education', text: 'Character formation woven into daily school life, not just textbooks.' },
]

export default function AboutPage() {
  return (
    // The outer wrapper ensures the page takes up at least the full viewport height 
    // and applies a base class for consistent public-facing page styling.
    <div className="public-page min-h-screen">
      
      {/* 
        HERO SECTION 
        This section grabs the user's attention immediately. 
        We use a green gradient to align with the school's branding. 
        The text is centered and uses responsive typography (text-4xl on mobile, text-5xl on desktop).
      */}
      <section className="bg-gradient-to-br from-green-700 to-green-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <p className="uppercase tracking-widest text-green-200 text-sm font-bold mb-3">
            Since 1998 • Sango Ota, Ogun State
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            About Mannaplus Group of Schools
          </h1>
          <p className="max-w-3xl mx-auto text-green-100 text-lg">
            Ogun's premier private school group — grooming future leaders through
            world-class academics, sound morals and holistic development.
          </p>
        </div>
      </section>

      {/* 
        STATS SECTION 
        We apply a negative top margin (-mt-8) to pull this section up, 
        creating a modern overlapping card effect over the hero section's bottom edge.
        The grid adapts from 2 columns on mobile to 4 columns on desktop (md:grid-cols-4).
      */}
      <section className="max-w-7xl mx-auto px-4 -mt-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            // We use the array index 'i' as the key here because the stats array 
            // is static and will never be reordered, filtered, or modified at runtime.
            <div key={i} className="bg-white rounded-xl shadow-md border border-gray-200 p-6 text-center">
              <p className="text-3xl font-bold text-green-700">{s.value}</p>
              <p className="text-sm text-gray-600 font-medium mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 
        STORY, MISSION, AND VISION SECTION 
        This uses a two-column layout on large screens (lg:grid-cols-2). 
        The left column contains the narrative history and contact details.
        The right column contains distinct, card-based highlights for Mission, Vision, and Motto.
      */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          
          {/* Left Column: Narrative and Contact Info */}
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Story</h2>
            <p className="text-gray-700 mb-4">
              Founded in 1998, Mannaplus Group of Schools began with a simple conviction:
              that every child deserves an education that builds both the <strong>mind</strong> and the <strong>character</strong>.
              From a modest nursery in Sango Ota, we have grown into a complete group of schools —
              Nursery, Primary and College — serving families across Ogun State.
            </p>
            <p className="text-gray-700 mb-4">
              Today, our students consistently excel in internal and external examinations
              (WAEC, NECO and JAMB), while distinguishing themselves in sports, debate,
              music and leadership — living out our motto, <em>"Grooming the Future Leaders."</em>
            </p>
            
            {/* Contact details are grouped semantically with matching icons for quick visual scanning. */}
            <div className="space-y-2 text-sm text-gray-600">
              <p className="flex items-center gap-2">
                <MapPin size={16} className="text-green-600" /> 
                34, Orisun Ibukun Avenue, Arinko Sango Ota, Ogun State
              </p>
              <p className="flex items-center gap-2">
                <Phone size={16} className="text-green-600" /> 
                +234 342 872 28, +234 803 496 7499
              </p>
              <p className="flex items-center gap-2">
                <Mail size={16} className="text-green-600" /> 
                mannapluscollege@school.com
              </p>
            </div>
          </div>

          {/* Right Column: Mission, Vision, and Motto Cards */}
          <div className="space-y-6">
            
            {/* Mission Card: Uses green accents to align with primary brand identity. */}
            <div className="bg-white rounded-xl shadow-md border-l-4 border-green-600 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Target className="text-green-700" size={20} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Our Mission</h3>
              </div>
              <p className="text-gray-700">
                To provide an environment where students excel academically, develop strong
                moral values, and become future leaders of Nigeria and the world.
              </p>
            </div>

            {/* Vision Card: Uses blue accents to visually distinguish it from the Mission card. */}
            <div className="bg-white rounded-xl shadow-md border-l-4 border-blue-600 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Eye className="text-blue-700" size={20} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Our Vision</h3>
              </div>
              <p className="text-gray-700">
                To be a leading group of schools raising well-taught, godly and confident
                children who transform their generation.
              </p>
            </div>

            {/* Motto Block: A simple, centered, high-contrast block to make the motto stand out. */}
            <div className="bg-green-50 rounded-xl border border-green-200 p-6 text-center">
              <p className="text-sm uppercase tracking-widest text-green-700 font-bold mb-1">Our Motto</p>
              <p className="text-2xl font-bold text-green-800">"Grooming the Future Leaders"</p>
            </div>
          </div>
        </div>
      </section>

      {/* 
        CORE VALUES SECTION 
        This section displays the school's core values in a responsive grid.
        We apply a subtle hover effect (hover:shadow-md transition-shadow) to make 
        the cards feel interactive and engaging without being distracting.
      */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">Our Core Values</h2>
          <p className="text-gray-600 text-center mb-10 max-w-2xl mx-auto">
            The pillars that shape every lesson, assembly and interaction at Mannaplus.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v, i) => (
              <div key={i} className="rounded-xl border border-gray-200 p-6 text-center hover:shadow-md transition-shadow">
                {/* We render the icon dynamically using <v.icon />. Tailwind classes center it and apply brand colors. */}
                <div className="w-12 h-12 mx-auto rounded-lg bg-green-100 flex items-center justify-center mb-4">
                  <v.icon className="text-green-700" size={24} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{v.title}</h3>
                <p className="text-sm text-gray-600">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 
        WHY CHOOSE US SECTION 
        This grid uses a flex layout (flex gap-4) for each card to align the icon 
        to the left of the text, creating a different visual rhythm than the centered Core Values.
      */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">Why Parents Choose Mannaplus</h2>
        <p className="text-gray-600 text-center mb-10 max-w-2xl mx-auto">
          A complete education that prepares children for examinations — and for life.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {whyUs.map((w, i) => (
            <div key={i} className="bg-white rounded-xl shadow-md border border-gray-200 p-6 flex gap-4">
              {/* The shrink-0 class prevents the icon container from squishing on smaller screens. */}
              <div className="w-11 h-11 shrink-0 rounded-lg bg-green-100 flex items-center justify-center">
                <w.icon className="text-green-700" size={22} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">{w.title}</h3>
                <p className="text-sm text-gray-600">{w.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 
        CALL TO ACTION (CTA) SECTION 
        This section drives user conversion. It uses high-contrast, readable dark text 
        on a light background to ensure accessibility and clarity. 
        It offers two distinct paths: a primary action (Apply) and a secondary action (Visit).
      */}
      <section className="py-14">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Come and see what we're building</h2>
          <p className="text-gray-700 mb-8">
            Visit our campus in Sango Ota or begin your child's admission today.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            
            {/* Primary Button: Solid green background to draw the eye as the main action. */}
            <Link 
              href="/admissions" 
              className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 flex items-center gap-2 transition-colors"
            >
              Apply for Admission <ArrowRight size={18} />
            </Link>
            
            {/* Secondary Button: Outline style to indicate it is an alternative, lower-friction action. */}
            <Link 
              href="/contact" 
              className="bg-white border-2 border-green-600 text-green-700 px-8 py-3 rounded-lg font-bold hover:bg-green-50 transition-colors"
            >
              Book a Campus Visit
            </Link>
            
          </div>
        </div>
      </section>
    </div>
  )
}