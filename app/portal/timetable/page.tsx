'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Calendar, Clock, MapPin, User, Printer } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { Suspense } from 'react'

interface TimetableEntry {
  id: string
  day_of_week: string
  period_number: number
  start_time: string
  end_time: string
  subject_name: string
  teacher_name?: string
  room_number?: string
  class_id?: string
}

interface Student {
  id: string
  full_name: string
  admission_number: string
  class_id: string
}

// ✅ Wrapper component with Suspense boundary
export default function ParentTimetablePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-900">Loading timetable...</div>}>
      <ParentTimetableContent />
    </Suspense>
  )
}

// ✅ Actual content component that uses useSearchParams
function ParentTimetableContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoaded } = useUser()
  const [students, setStudents] = useState<Student[]>([])
  const [timetable, setTimetable] = useState<TimetableEntry[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const dayLabels: Record<string, string> = {
    monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
    thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday'
  }

  const periodTimes: Record<number, string> = {
    1: '08:00 - 09:00',
    2: '09:00 - 10:00',
    3: '10:00 - 11:00',
    4: '11:00 - 12:00',
    5: '12:00 - 01:00',
    6: '01:00 - 02:00',
  }

  useEffect(() => {
    if (isLoaded && user) {
      fetchStudentsAndTimetable()
    }
  }, [user, isLoaded, selectedStudent])

  const fetchStudentsAndTimetable = async () => {
    setLoading(true)
    try {
      const email = user?.emailAddresses[0]?.emailAddress
      if (!email) return

      const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('email', email)
        .single()

      if (!parent) return

      const { data: links } = await supabase
        .from('parent_students')
        .select('student_id')
        .eq('parent_id', parent.id)

      if (!links || links.length === 0) return

      const studentIds = links.map(l => l.student_id)
      
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, full_name, admission_number, class_id')
        .in('id', studentIds)

      setStudents(studentsData || [])

      if (!selectedStudent && studentsData && studentsData.length > 0) {
        const urlStudentId = searchParams.get('student')
        setSelectedStudent(urlStudentId || studentsData[0].id)
        return
      }

      const student = studentsData?.find(s => s.id === selectedStudent)
      if (!student) return

      const { data: timetableData } = await supabase
        .from('timetables')
        .select('*')
        .eq('class_id', student.class_id)
        .eq('term', 'First Term')
        .eq('session', '2024/2025')
        .eq('is_active', true)
        .order('day_of_week')
        .order('period_number')

      setTimetable(timetableData || [])
    } catch (error: any) {
      toast.error('Failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  // Generate timetable grid
  const generateTimetableGrid = () => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const periods = [1, 2, 3, 4, 5, 6]
    
    const grid: Record<string, Record<number, TimetableEntry | null>> = {}
    days.forEach(day => {
      grid[day] = {}
      periods.forEach(period => {
        const entry = timetable.find(e => e.day_of_week === day && e.period_number === period)
        grid[day][period] = entry || null
      })
    })
    return grid
  }

  const timetableGrid = generateTimetableGrid()

  if (!isLoaded || loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-900">Loading...</div>
  }

  const selectedStudentData = students.find(s => s.id === selectedStudent)

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white shadow print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
            <ArrowLeft size={20}/> Back to Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📅 Class Timetable</h1>
            <p className="text-gray-600 text-sm">
              {selectedStudentData?.full_name} • {selectedStudentData?.class_id}
            </p>
          </div>
          <button onClick={handlePrint} className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded font-bold hover:bg-gray-700 print:hidden">
            <Printer size={16}/> Print
          </button>
        </div>

        {/* Student Selector */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 print:hidden">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
            <select 
              value={selectedStudent} 
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="p-2 border rounded text-gray-900 min-w-[300px]"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.full_name} - {s.class_id} ({s.admission_number})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Timetable Grid */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="p-3 text-left font-bold">Period</th>
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(day => (
                  <th key={day} className="p-3 text-center font-bold capitalize">{dayLabels[day]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6].map(period => (
                <tr key={period} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-bold text-gray-900 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-blue-600"/>
                      <div>
                        <p>Period {period}</p>
                        <p className="text-xs text-gray-500">{periodTimes[period]}</p>
                      </div>
                    </div>
                  </td>
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(day => {
                    const entry = timetableGrid[day]?.[period]
                    return (
                      <td key={`${day}-${period}`} className="p-2 border-l">
                        {entry ? (
                          <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs">
                            <p className="font-bold text-blue-900">{entry.subject_name}</p>
                            {entry.teacher_name && (
                              <p className="text-blue-700 flex items-center gap-1 mt-1">
                                <User size={10}/> {entry.teacher_name}
                              </p>
                            )}
                            {entry.room_number && (
                              <p className="text-blue-600 flex items-center gap-1">
                                <MapPin size={10}/> {entry.room_number}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="w-full h-full min-h-[80px] bg-gray-100 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-xs font-bold">
                            <div className="text-center">
                              <Clock size={16} className="mx-auto mb-1"/>
                              <p>Free Period</p>
                            </div>
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-lg shadow p-4 mt-6 print:hidden">
          <h3 className="font-bold text-gray-900 mb-3">Legend</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-50 border border-blue-200 rounded"></div>
              <span className="text-sm text-gray-700">Scheduled Class</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-100 border-2 border-dashed border-gray-300 rounded"></div>
              <span className="text-sm text-gray-700">Free Period</span>
            </div>
          </div>
        </div>

        {/* Print Styles */}
        <style jsx global>{`
          @media print {
            body { background: white; }
            .print\\:hidden { display: none !important; }
            .shadow { box-shadow: none !important; }
            @page { margin: 1cm; }
          }
        `}</style>
      </main>
    </div>
  )
}