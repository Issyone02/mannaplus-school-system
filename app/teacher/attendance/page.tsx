'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Save, CheckCircle, XCircle, Clock, AlertCircle, Circle, Info } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { auditActions } from '@/lib/auditLog'
import StudentAttendanceSummary from '@/components/StudentAttendanceSummary'

interface AttendanceRecord {
  id: string
  student_id: string
  date: string
  status: 'present' | 'absent' | 'late' | 'excused'
  note?: string
  marked_by: string
  created_at: string
  is_locked?: boolean
}

interface Student {
  id: string
  full_name: string
  admission_number: string
  class_id: string
}

interface ClassItem {
  id: string
  class_name: string
  arm: string | null
  department: string | null
}

// ✅ Wrapper component with Suspense boundary
export default function TeacherAttendancePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-900">Loading attendance...</div>}>
      <TeacherAttendanceContent />
    </Suspense>
  )
}

// ✅ Actual content component that uses useSearchParams
function TeacherAttendanceContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoaded } = useUser()
  
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([]) // ✅ NEW: Dynamic classes
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({})
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [lockReason, setLockReason] = useState('')
  const [summaryStudent, setSummaryStudent] = useState<any>(null)
  const [isSummaryOpen, setIsSummaryOpen] = useState(false)

  // ✅ Fetch classes and attendance on mount
  useEffect(() => {
    if (isLoaded && user) {
      fetchTeacherClasses()
    }
  }, [isLoaded, user])

  // ✅ Fetch students when class changes
  useEffect(() => {
    if (selectedClass) {
      fetchStudentsAndAttendance()
    }
  }, [selectedClass, selectedDate])

  // ✅ NEW: Fetch teacher's assigned classes
  const fetchTeacherClasses = async () => {
    try {
      const email = user?.emailAddresses[0]?.emailAddress
      if (!email) return

      // 1. Get teacher info
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id, form_class_id, subjects')
        .eq('email', email)
        .single()

      if (!teacher) {
        toast.error('Teacher account not found')
        return
      }

      // 2. Get class IDs from both form_class_id and teacher_assignments
      const classIds = new Set<string>()
      if (teacher.form_class_id) {
        classIds.add(teacher.form_class_id)
      }

      // Fetch assignments
      const { data: assignments } = await supabase
        .from('teacher_assignments')
        .select('class_id')
        .eq('teacher_id', teacher.id)

      if (assignments) {
        assignments.forEach(a => {
          if (a.class_id) classIds.add(a.class_id)
        })
      }

      // 3. Fetch class details
      if (classIds.size > 0) {
        const { data: classesData } = await supabase
          .from('classes')
          .select('id, class_name, arm, department')
          .in('id', Array.from(classIds))
          .order('class_name')

        setClasses(classesData || [])
        
        // Auto-select first class if available
        if (classesData && classesData.length > 0) {
          setSelectedClass(classesData[0].id)
        }
      }

    } catch (error: any) {
      console.error('Error fetching classes:', error)
      toast.error('Failed to load classes')
    }
  }

  const fetchStudentsAndAttendance = async () => {
    if (!selectedClass) return
    setLoading(true)
    try {
      // 1. Fetch students in selected class
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, full_name, admission_number, class_id')
        .eq('class_id', selectedClass)
        .order('full_name')

      setStudents(studentsData || [])

      // 2. Fetch existing attendance for selected date
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .eq('class_id', selectedClass)
        .eq('date', selectedDate)

      const attendanceMap: Record<string, AttendanceRecord> = {}
      ;(attendanceData || []).forEach((a: any) => {
        attendanceMap[a.student_id] = a
      })
      setAttendance(attendanceMap)

      // 3. Check if attendance is locked (24 hours policy)
      checkIfLocked(attendanceData || [])

    } catch (error: any) {
      toast.error('Failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const checkIfLocked = (attendanceData: any[]) => {
    if (attendanceData.length === 0) {
      setIsLocked(false)
      setLockReason('')
      return
    }

    const earliestRecord = attendanceData.reduce((earliest, current) => {
      return new Date(current.created_at) < new Date(earliest.created_at) ? current : earliest
    })

    const createdAt = new Date(earliestRecord.created_at)
    const now = new Date()
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

    if (hoursDiff > 24) {
      setIsLocked(true)
      const lockedAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000)
      setLockReason(`Attendance was locked on ${lockedAt.toLocaleString()} (24 hours after first entry)`)
    } else {
      setIsLocked(false)
      setLockReason('')
    }
  }

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    if (isLocked) {
      toast.error('Attendance is locked and cannot be modified')
      return
    }

    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        student_id: studentId,
        date: selectedDate,
        status,
        marked_by: 'teacher'
      }
    }))
  }

  const handleNoteChange = (studentId: string, note: string) => {
    if (isLocked) {
      toast.error('Attendance is locked and cannot be modified')
      return
    }

    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        student_id: studentId,
        date: selectedDate,
        note,
        marked_by: 'teacher'
      }
    }))
  }

  const saveAllAttendance = async () => {
    if (isLocked) {
      toast.error('Attendance is locked and cannot be saved')
      return
    }

    // ✅ ADD THIS: Double-check 24-hour policy right before saving
    const now = new Date()
    const existingRecords = Object.values(attendance).filter(r => r.created_at)
    
    if (existingRecords.length > 0) {
      const earliestRecord = existingRecords.reduce((earliest, current) => {
        return new Date(current.created_at) < new Date(earliest.created_at) ? current : earliest
      })
      
      const hoursSinceFirstEntry = (now.getTime() - new Date(earliestRecord.created_at).getTime()) / (1000 * 60 * 60)
      
      if (hoursSinceFirstEntry >= 24) {
        toast.error('Attendance has been locked (24 hours policy). Contact admin for changes.')
        setIsLocked(true)
        const lockedAt = new Date(new Date(earliestRecord.created_at).getTime() + 24 * 60 * 60 * 1000)
        setLockReason(`Attendance was locked on ${lockedAt.toLocaleString()}`)
        return
      }
    }

    setSaving(true)
    try {
      const records = Object.values(attendance).filter(r => r.status)
      
      if (records.length === 0) {
        toast('No attendance records to save')
        setSaving(false)
        return
      }

      for (const record of records) {
        const { error } = await supabase.from('attendance').upsert({
          id: record.id,
          student_id: record.student_id,
          class_id: selectedClass,
          date: record.date,
          status: record.status,
          note: record.note || null,
          marked_by: 'teacher',
          updated_at: new Date().toISOString()
        }, { onConflict: 'student_id,date' })

        if (error) throw error
      }

      const email = user?.emailAddresses[0]?.emailAddress || ''
      await auditActions.teacherMarkAttendance(email, selectedClass, selectedDate, records.length)

      toast.success('Attendance saved successfully!')
      fetchStudentsAndAttendance()
    } catch (error: any) {
      toast.error('Failed: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const getStatusButtonClass = (studentId: string, status: string) => {
    const currentStatus = attendance[studentId]?.status
    const baseClass = "px-3 py-1 rounded-full text-sm font-bold transition-all "
    
    if (currentStatus === status) {
      switch (status) {
        case 'present': return baseClass + "bg-green-500 text-white"
        case 'absent': return baseClass + "bg-red-500 text-white"
        case 'late': return baseClass + "bg-yellow-500 text-white"
        case 'excused': return baseClass + "bg-blue-500 text-white"
      }
    }
    
    return baseClass + "bg-gray-200 text-gray-700 hover:bg-gray-300"
  }

  // ✅ Helper to format class name
  const formatClassName = (cls: ClassItem) => {
    return `${cls.class_name} ${cls.arm ? `(${cls.arm})` : ''} ${cls.department ? `- ${cls.department}` : ''}`
  }

  if (!isLoaded || loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-900">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button 
            onClick={() => router.back()} 
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft size={20}/> Back to Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mark Attendance</h1>
            <p className="text-gray-600">For your assigned classes</p>
          </div>
          <button 
            onClick={saveAllAttendance}
            disabled={saving || isLocked}
            className={`flex items-center gap-2 px-4 py-2 rounded font-bold ${
              isLocked 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700'
            } text-white`}
          >
            <Save size={16}/> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Lock Policy Warning */}
        <div className={`rounded-lg p-4 mb-6 border-2 ${
          isLocked 
            ? 'bg-red-50 border-red-300' 
            : 'bg-yellow-50 border-yellow-300'
        }`}>
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className={isLocked ? 'text-red-600' : 'text-yellow-600'}/>
            <div>
              <h3 className={`font-bold ${isLocked ? 'text-red-900' : 'text-yellow-900'}`}>
                Attendance Lock Policy
              </h3>
              <p className={`text-sm ${isLocked ? 'text-red-700' : 'text-yellow-700'}`}>
                {isLocked 
                  ? `${lockReason}. Contact admin for corrections.`
                  : 'Records are locked after 24 hours. Contact admin for corrections.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Class & Date Selector */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-4 flex-wrap">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <select 
              value={selectedClass} 
              onChange={(e) => setSelectedClass(e.target.value)}
              className="p-2 border rounded text-gray-900 bg-white min-w-[200px]"
            >
              <option value="">Select your class...</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {formatClassName(cls)}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject (Optional)</label>
            <select 
              value={selectedSubject || ''} 
              onChange={(e) => setSelectedSubject(e.target.value || null)}
              className="p-2 border rounded text-gray-900 bg-white"
            >
              <option value="">All Subjects</option>
              <option value="Mathematics">Mathematics</option>
              <option value="English">English</option>
              <option value="Science">Science</option>
              <option value="Computer Studies">Computer Studies</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="p-2 border rounded text-gray-900 bg-white"
            />
          </div>
        </div>

        {/* Attendance Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left text-gray-900 font-bold">Admission No</th>
                  <th className="text-gray-900 font-bold">Student Name</th>
                  <th className="text-gray-900 font-bold text-center">Status</th>
                  <th className="text-gray-900 font-bold text-center">Actions</th>
                  <th className="text-gray-900 font-bold">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {students.map(student => (
                  <tr key={student.id} className={isLocked ? 'bg-gray-100' : 'hover:bg-gray-50'}>
                    <td className="p-3 text-gray-900 font-medium">{student.admission_number}</td>
                    <td className="text-gray-900 font-bold">{student.full_name}</td>
                    <td className="p-3">
                      <div className="flex gap-2 justify-center flex-wrap">
                        <button
                          onClick={() => handleStatusChange(student.id, 'present')}
                          disabled={isLocked}
                          className={getStatusButtonClass(student.id, 'present')}
                        >
                          <CheckCircle size={14} className="inline mr-1"/> Present
                        </button>
                        <button
                          onClick={() => handleStatusChange(student.id, 'absent')}
                          disabled={isLocked}
                          className={getStatusButtonClass(student.id, 'absent')}
                        >
                          <XCircle size={14} className="inline mr-1"/> Absent
                        </button>
                        <button
                          onClick={() => handleStatusChange(student.id, 'late')}
                          disabled={isLocked}
                          className={getStatusButtonClass(student.id, 'late')}
                        >
                          <Clock size={14} className="inline mr-1"/> Late
                        </button>
                        <button
                          onClick={() => handleStatusChange(student.id, 'excused')}
                          disabled={isLocked}
                          className={getStatusButtonClass(student.id, 'excused')}
                        >
                          <AlertCircle size={14} className="inline mr-1"/> Excused
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => {
                          setSummaryStudent(student)
                          setIsSummaryOpen(true)
                        }}
                        className="text-blue-600 hover:text-blue-800 font-bold text-sm border border-blue-600 px-3 py-1 rounded hover:bg-blue-50"
                      >
                        View Summary
                      </button>
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={attendance[student.id]?.note || ''}
                        onChange={(e) => handleNoteChange(student.id, e.target.value)}
                        disabled={isLocked}
                        placeholder={isLocked ? 'Locked' : 'Add note...'}
                        className={`w-full p-2 border rounded text-sm ${
                          isLocked 
                            ? 'bg-gray-200 cursor-not-allowed text-gray-500' 
                            : 'bg-white text-gray-900'
                        }`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {students.length === 0 && selectedClass && (
            <div className="p-8 text-center text-gray-600">
              <p className="font-bold">No students found in this class</p>
            </div>
          )}
          
          {!selectedClass && (
            <div className="p-8 text-center text-gray-600">
              <p className="font-bold">Please select a class to view students</p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Info size={18}/> Attendance Status Legend
          </h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle size={14} className="text-white"/>
              </div>
              <span className="text-sm text-gray-700 font-medium">Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                <XCircle size={14} className="text-white"/>
              </div>
              <span className="text-sm text-gray-700 font-medium">Absent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center">
                <Clock size={14} className="text-white"/>
              </div>
              <span className="text-sm text-gray-700 font-medium">Late</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                <AlertCircle size={14} className="text-white"/>
              </div>
              <span className="text-sm text-gray-700 font-medium">Excused</span>
            </div>
          </div>
        </div>

        {/* Student Attendance Summary Modal */}
        <StudentAttendanceSummary 
          isOpen={isSummaryOpen}
          onClose={() => setIsSummaryOpen(false)}
          student={summaryStudent}
        />
      </main>
    </div>
  )
}