// This file defines the "Academics" page for the Mannaplus Group of Schools website.
// It is a Next.js App Router Server Component that renders static content 
// detailing the school's academic structure, curriculum, departments, and assessment methods.

import Link from 'next/link'
// We import specific, lightweight SVG icons from lucide-react. 
// This ensures consistent visual branding without unnecessarily increasing the bundle size.
import { 
  BookOpen, GraduationCap, Baby, School, FlaskConical, 
  Palette, Briefcase, Award, CalendarDays, ClipboardCheck, Users, ArrowRight 
} from 'lucide-react'

// The metadata object is automatically read by Next.js to inject 
// SEO-friendly <title> and <meta name="description"> tags into the document head.
export const metadata = {
  title: 'Academics | Mannaplus Group of Schools',
  description: 'Our curriculum, classes, departments and assessment system.',
}

// We extract static data into arrays outside the component. 
// This keeps the JSX return statement clean, readable, and easy to maintain.
// If the school updates its curriculum later, we only need to modify this array.
const primarySubjects = [
  'English Language', 'Mathematics', 'Basic Science', 'Social Studies',
  'Civic Education', 'Agricultural Science', 'Computer Studies',
  'Physical & Health Education', 'Cultural & Creative Arts', 'CRS / IRS', 'Yoruba Language',
]

// Each object represents a secondary school department. 
// We store the pre-defined Tailwind color classes in the `color` property so we can 
// dynamically apply distinct, theme-appropriate styling to each department card.
const departments = [
  { 
    name: 'Science', 
    icon: FlaskConical, 
    color: 'bg-blue-50 text-blue-700 border-blue-200', 
    subjects: ['Mathematics', 'Biology', 'Chemistry', 'Physics', 'Further Mathematics', 'Computer Studies', 'Agricultural Science'] 
  },
  { 
    name: 'Arts', 
    icon: Palette, 
    color: 'bg-purple-50 text-purple-700 border-purple-200', 
    subjects: ['Literature in English', 'Government', 'History', 'CRS / IRS', 'Yoruba Language', 'Economics', 'Geography'] 
  },
  { 
    name: 'Commercial', 
    icon: Briefcase, 
    color: 'bg-orange-50 text-orange-700 border-orange-200', 
    subjects: ['Accounting', 'Business Studies', 'Commerce', 'Economics', 'Marketing', 'Office Practice'] 
  },
]

// This array drives the "How We Assess & Report" grid. 
// Separating this data ensures the component remains focused on layout, not content.
const assessmentSteps = [
  { icon: ClipboardCheck, title: 'Continuous Assessment', text: 'Regular class tests, homework and projects (CA) throughout the term to track steady progress.' },
  { icon: BookOpen, title: 'Term Examinations', text: 'Standardized end-of-term exams (CA + Exam = 100) graded with the national A1–F9 scale.' },
  { icon: Award, title: 'Report Cards', text: 'Detailed continuous-assessment report cards with subject totals, class position, conduct and attendance.' },
  { icon: CalendarDays, title: 'Three Terms Per Session', text: 'First, Second and Third terms with cumulative scoring that builds the final session result.' },
]

export default function AcademicsPage() {
  return (
    // The outer wrapper ensures the page takes up at least the full viewport height 
    // and applies a base class for consistent public-facing page styling.
    <div className="public-page min-h-screen">
      
      {/* 
        HERO SECTION 
        This section grabs the user's attention immediately. 
        We use a green gradient to align with the school's primary branding. 
        The text is centered and uses responsive typography (text-4xl on mobile, text-5xl on desktop).
      */}
      <section className="bg-gradient-to-br from-green-700 to-green-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <p className="uppercase tracking-widest text-green-200 text-sm font-bold mb-3">
            Motto: Grooming the Future Leaders
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Academics</h1>
          <p className="max-w-3xl mx-auto text-green-100 text-lg">
            A blend of the Nigerian National Curriculum with modern STEM, ICT and moral instruction —
            delivered from Nursery through Secondary School in a caring, disciplined environment.
          </p>
        </div>
      </section>

      {/* 
        ACADEMIC STRUCTURE SECTION 
        This displays the three stages of education in a responsive grid (1 column on mobile, 3 on desktop).
        Each card contains a mapped array of class badges to clearly show the progression within that stage.
      */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">Our Academic Structure</h2>
        <p className="text-gray-600 text-center mb-10 max-w-2xl mx-auto">
          Three carefully staged schools under one group, each with its own curriculum focus.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Nursery Card: Uses pink accents to denote early childhood education. */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="w-12 h-12 rounded-lg bg-pink-100 flex items-center justify-center mb-4">
              <Baby className="text-pink-600" size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Nursery (Early Years)</h3>
            <p className="text-gray-600 text-sm mb-4">
              Play-based foundational learning: phonics, numeracy, rhymes, motor skills and social habits for ages 2–5.
            </p>
            <div className="flex flex-wrap gap-2">
              {/* We map over a static array to generate consistent, styled badges for each class level. */}
              {['Nursery 1', 'Nursery 2'].map(c => (
                <span key={c} className="px-3 py-1 bg-pink-50 text-pink-700 text-xs font-bold rounded-full border border-pink-200">
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Primary Card: Uses green accents to align with the core brand identity. */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mb-4">
              <School className="text-green-600" size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Primary School</h3>
            <p className="text-gray-600 text-sm mb-4">
              Core literacy, numeracy, science and civic education with strong moral and computer training.
            </p>
            <div className="flex flex-wrap gap-2">
              {['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'].map(c => (
                <span key={c} className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-200">
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* College Card: Uses blue accents to denote advanced, secondary-level education. */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
              <GraduationCap className="text-blue-600" size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">College (Secondary)</h3>
            <p className="text-gray-600 text-sm mb-4">
              JSS &amp; SS with departmental specialization, preparing students for BECE, WAEC, NECO and JAMB.
            </p>
            <div className="flex flex-wrap gap-2">
              {['JSS 1–3', 'SS 1–3'].map(c => (
                <span key={c} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 
        PRIMARY CURRICULUM SECTION 
        This section uses a flex-wrap layout to display subjects as clean, readable tags.
        Flex-wrap ensures the tags gracefully flow to the next line on smaller screens without overflowing.
      */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">Primary School Curriculum</h2>
          <p className="text-gray-600 text-center mb-10 max-w-2xl mx-auto">
            Broad-based subjects that build knowledge, character and practical skills.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {primarySubjects.map(s => (
              <span key={s} className="px-4 py-2 bg-green-50 text-green-800 font-bold text-sm rounded-lg border border-green-200">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 
        SECONDARY DEPARTMENTS SECTION 
        We dynamically apply Tailwind classes using template literals (`${d.color}`).
        This allows each department card to have a unique, cohesive color theme (background, text, and border) 
        defined cleanly in the data array above, avoiding repetitive inline styling.
      */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">Secondary School Departments</h2>
        <p className="text-gray-600 text-center mb-10 max-w-2xl mx-auto">
          From SS1, students specialize into one of three departments guided by their strengths.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {departments.map(d => (
            // We use d.name as the key because department names are unique and static.
            <div key={d.name} className={`rounded-xl border p-6 ${d.color}`}>
              <div className="flex items-center gap-3 mb-4">
                <d.icon size={24} />
                <h3 className="text-xl font-bold">{d.name}</h3>
              </div>
              <ul className="space-y-2 text-sm font-medium">
                {d.subjects.map(s => (
                  <li key={s} className="flex items-center gap-2">
                    <ArrowRight size={14} /> {s}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* 
        ASSESSMENT SECTION 
        This section outlines the grading and reporting system. 
        It uses a light green background (bg-green-50) to visually separate it from the white sections 
        while maintaining the overall brand palette.
      */}
      <section className="bg-green-50 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">How We Assess &amp; Report</h2>
          <p className="text-gray-600 text-center mb-10 max-w-2xl mx-auto">
            A transparent continuous-assessment system parents can follow online in real time.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {assessmentSteps.map((s, i) => (
              // We use the array index 'i' as the key here because the assessment steps array 
              // is static and will never be reordered, filtered, or modified at runtime.
              <div key={i} className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mb-4">
                  <s.icon className="text-green-700" size={24} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-600">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 
        CALL TO ACTION (CTA) SECTION 
        This section drives user conversion. It uses high-contrast, readable dark text 
        on a light background to ensure accessibility and clarity. 
        It offers two distinct paths: a primary action (Apply) and a secondary action (Contact).
      */}
      <section className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to join us?</h2>
        <p className="text-gray-600 mb-8">
          Begin your child's journey toward academic excellence today.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          
          {/* Primary Button: Solid green background to draw the eye as the main action. */}
          <Link 
            href="/admissions" 
            className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 transition-colors"
          >
            Apply for Admission
          </Link>
          
          {/* Secondary Button: Outline style to indicate it is an alternative, lower-friction action. */}
          <Link 
            href="/contact" 
            className="bg-white text-green-700 border-2 border-green-600 px-8 py-3 rounded-lg font-bold hover:bg-green-50 transition-colors"
          >
            Contact Us
          </Link>
          
        </div>
      </section>
    </div>
  )
}