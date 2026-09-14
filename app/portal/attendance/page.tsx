'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, AlertCircle, Circle } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

interface AttendanceRecord {
  id: string
  student_id: string
  date: string
  status: 'present' | 'absent' | 'late' | 'excused'
  note?: string
  student_name: string
  admission_number: string
  class_id: string
}

interface Student {
  id: string
  full_name: string
  admission_number: string
  class_id: string
}

export default function ParentAttendancePage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [students, setStudents] = useState<Student[]>([])
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()) // 0-11
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const statusConfig: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
    present: { label: 'Present', icon: CheckCircle, color: 'text-green-700', bgColor: 'bg-green-500' },
    absent: { label: 'Absent', icon: XCircle, color: 'text-red-700', bgColor: 'bg-red-500' },
    late: { label: 'Late', icon: Clock, color: 'text-yellow-700', bgColor: 'bg-yellow-500' },
    excused: { label: 'Excused', icon: AlertCircle, color: 'text-blue-700', bgColor: 'bg-blue-500' },
    none: { label: 'Not Marked', icon: Circle, color: 'text-gray-400', bgColor: 'bg-gray-200' },
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  useEffect(() => {
    if (isLoaded && user) {
      fetchStudentsAndAttendance()
    }
  }, [user, isLoaded, selectedStudent, selectedYear, selectedMonth])

  const fetchStudentsAndAttendance = async () => {
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
        setSelectedStudent(studentsData[0].id)
        return
      }

      // Calculate date range for selected month
      const firstDay = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0]

      const { data: attendanceData, error } = await supabase
        .from('attendance')
        .select(`
          *,
          student:students(full_name, admission_number, class_id)
        `)
        .in('student_id', selectedStudent ? [selectedStudent] : studentIds)
        .gte('date', firstDay)
        .lte('date', lastDay)
        .in('marked_by', ['admin', 'teacher', null])
        .order('date', { ascending: false })

      if (error) throw error

      const enriched = (attendanceData || []).map((a: any) => ({
        ...a,
        student_name: a.student?.full_name || 'Unknown',
        admission_number: a.student?.admission_number || 'N/A',
        class_id: a.student?.class_id || 'N/A'
      }))

      setRecords(enriched)
    } catch (error: any) {
      console.error('Attendance error:', error)
      toast.error('Failed to load attendance: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Get attendance record for a specific date
  const getRecordForDate = (date: string) => {
    return records.find(r => r.date === date)
  }

  // Generate calendar days
  const generateCalendarDays = () => {
    const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1)
    const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0)
    const startingDay = firstDayOfMonth.getDay() // 0-6 (Sun-Sat)
    const totalDays = lastDayOfMonth.getDate()

    const days = []

    // Empty cells for days before the 1st
    for (let i = 0; i < startingDay; i++) {
      days.push({ type: 'empty', key: `empty-${i}` })
    }

    // Actual days of the month
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const record = getRecordForDate(dateStr)
      const isToday = dateStr === new Date().toISOString().split('T')[0]
      
      days.push({
        type: 'day',
        day,
        date: dateStr,
        record,
        isToday,
        key: `day-${day}`
      })
    }

    return days
  }

  // Calculate summary
  const summary = records.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const totalDays = Object.values(summary).reduce((a, b) => a + b, 0)
  const presentDays = summary['present'] || 0
  const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11)
      setSelectedYear(selectedYear - 1)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0)
      setSelectedYear(selectedYear + 1)
    } else {
      setSelectedMonth(selectedMonth + 1)
    }
  }

  if (!isLoaded || loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-900">Loading...</div>
  }

  const calendarDays = generateCalendarDays()
  const selectedStudentData = students.find(s => s.id === selectedStudent)

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
            <ArrowLeft size={20}/> Back to Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Attendance Calendar</h1>

        {/* Student Selector */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
              <select 
                value={selectedStudent} 
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="p-2 border rounded text-gray-900 min-w-[250px]"
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.admission_number})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Month Navigation */}
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrevMonth}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft size={24}/>
              </button>
              <div className="text-center min-w-[200px]">
                <p className="text-lg font-bold text-gray-900">{monthNames[selectedMonth]} {selectedYear}</p>
              </div>
              <button 
                onClick={handleNextMonth}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronRight size={24}/>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  <div className="bg-white rounded-lg shadow p-3 text-center">
    <p className="text-xs text-gray-600">Total Days</p>
    <p className="text-xl font-bold text-gray-900">{totalDays}</p>
  </div>
  <div className="bg-green-50 rounded-lg shadow p-3 text-center border border-green-200">
    <p className="text-xs text-green-700">Present</p>
    <p className="text-xl font-bold text-green-900">{presentDays}</p>
  </div>
  <div className="bg-red-50 rounded-lg shadow p-3 text-center border border-red-200">
    <p className="text-xs text-red-700">Absent</p>
    <p className="text-xl font-bold text-red-900">{summary['absent'] || 0}</p>
  </div>
  <div className="bg-yellow-50 rounded-lg shadow p-3 text-center border border-yellow-200">
    <p className="text-xs text-yellow-700">Late</p>
    <p className="text-xl font-bold text-yellow-900">{summary['late'] || 0}</p>
  </div>
  <div className="bg-purple-50 rounded-lg shadow p-3 text-center border border-purple-200">
    <p className="text-xs text-purple-700">Attendance Rate</p>
    <p className="text-xl font-bold text-purple-900">{percentage}%</p>
  </div>
</div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          {/* Day Names Header */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {dayNames.map(day => (
              <div key={day} className="text-center font-bold text-gray-700 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  {calendarDays.map((cell: any) => {
    if (cell.type === 'empty') {
      return <div key={cell.key} className="h-10"></div>
    }

    const status = cell.record?.status || 'none'
    const config = statusConfig[status]
    const Icon = config.icon

    return (
      <button
        key={cell.key}
        onClick={() => setSelectedDate(cell.date)}
        className={`h-10 rounded-md flex flex-col items-center justify-center relative transition-all hover:scale-105 ${
          cell.isToday ? 'ring-2 ring-blue-500 ring-offset-1' : ''
        } ${
          status === 'none' 
            ? 'bg-gray-100 hover:bg-gray-200' 
            : `${config.bgColor} text-white hover:opacity-90`
        }`}
        title={cell.record?.note || config.label}
      >
        <span className="text-xs font-bold">{cell.day}</span>
        {cell.record && (
          <Icon size={10} className="mt-0.5"/>
        )}
        {cell.isToday && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full border border-white"></span>
        )}
      </button>
    )
  })}
</div>

          {/* Today Indicator */}
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
            <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>
            <span>Today</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6">
  <h2 className="text-base font-bold text-gray-900 mb-3">Legend</h2>
  <div className="flex flex-wrap gap-3">
    {Object.entries(statusConfig).map(([key, config]) => {
      const Icon = config.icon
      return (
        <div key={key} className="flex items-center gap-1.5">
          <div className={`w-6 h-6 rounded-md flex items-center justify-center ${config.bgColor}`}>
            <Icon size={12} className="text-white"/>
          </div>
          <span className="text-xs font-medium text-gray-700">{config.label}</span>
        </div>
      )
    })}
  </div>
</div>

        {/* Selected Date Details */}
        {selectedDate && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                Details for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h2>
              <button 
                onClick={() => setSelectedDate(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {(() => {
              const record = getRecordForDate(selectedDate)
              if (!record) {
                return (
                  <div className="text-center py-8 text-gray-600">
                    <Circle size={48} className="mx-auto text-gray-300 mb-2"/>
                    <p className="font-bold">No attendance marked</p>
                    <p className="text-sm">Attendance for this date hasn't been recorded yet</p>
                  </div>
                )
              }

              const config = statusConfig[record.status]
              const Icon = config.icon

              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-full ${config.bgColor}`}>
                      <Icon size={32} className="text-white"/>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{config.label}</p>
                      <p className="text-sm text-gray-600">{selectedStudentData?.full_name}</p>
                    </div>
                  </div>
                  
                  {record.note && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-bold text-gray-700 mb-1">Note:</p>
                      <p className="text-gray-900">{record.note}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Admission Number</p>
                      <p className="font-bold text-gray-900">{record.admission_number}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Class</p>
                      <p className="font-bold text-gray-900 capitalize">{record.class_id}</p>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </main>
    </div>
  )
}