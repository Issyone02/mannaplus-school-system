'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Calendar, TrendingUp, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import StudentAttendanceCalendar from '@/components/StudentAttendanceCalendar'
import toast, { Toaster } from 'react-hot-toast'

export default function StudentAttendancePage() {
  const router = useRouter()
  const { user } = useUser()
  const [student, setStudent] = useState<any>(null)
  const [attendance, setAttendance] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchStudentData()
    }
  }, [user])

  const fetchStudentData = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', user?.id)
        .single()

      if (!userData) return

      const { data: studentData } = await supabase
        .from('students')
        .select('id, full_name, admission_number')
        .eq('user_id', userData.id)
        .single()

      if (!studentData) return
      setStudent(studentData)

      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', studentData.id)

      if (attendanceData && attendanceData.length > 0) {
        const presentCount = attendanceData.filter((a: any) => a.status === 'present').length
        setAttendance(Math.round((presentCount / attendanceData.length) * 100))
      }

    } catch (error) {
      console.error('Error fetching attendance data:', error)
      toast.error('Failed to load attendance')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      <div className="bg-white shadow border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft size={20}/> Back to Dashboard
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Attendance Record</h1>
          <p className="text-gray-600">{student?.full_name} - {student?.admission_number}</p>
        </div>

        {/* Summary Stats - Unified 6-Card Layout */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-blue-50 p-4 rounded-lg text-center border-2 border-blue-200">
            <Calendar size={28} className="mx-auto text-blue-600 mb-2"/>
            <p className="text-xs text-blue-600 mb-1">Total Days</p>
            <p className="text-2xl font-bold text-blue-900">
              <AttendanceCounter studentId={student.id} metric="total" />
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center border-2 border-green-200">
            <TrendingUp size={28} className="mx-auto text-green-600 mb-2"/>
            <p className="text-xs text-green-600 mb-1">Days Present</p>
            <p className="text-2xl font-bold text-green-900">
              <AttendanceCounter studentId={student.id} metric="present" />
            </p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg text-center border-2 border-red-200">
            <XCircle size={28} className="mx-auto text-red-600 mb-2"/>
            <p className="text-xs text-red-600 mb-1">Days Absent</p>
            <p className="text-2xl font-bold text-red-900">
              <AttendanceCounter studentId={student.id} metric="absent" />
            </p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg text-center border-2 border-yellow-200">
            <Clock size={28} className="mx-auto text-yellow-600 mb-2"/>
            <p className="text-xs text-yellow-600 mb-1">Days Late</p>
            <p className="text-2xl font-bold text-yellow-900">
              <AttendanceCounter studentId={student.id} metric="late" />
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg text-center border-2 border-blue-200">
            <AlertCircle size={28} className="mx-auto text-blue-600 mb-2"/>
            <p className="text-xs text-blue-600 mb-1">Days Excused</p>
            <p className="text-2xl font-bold text-blue-900">
              <AttendanceCounter studentId={student.id} metric="excused" />
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg text-center border-2 border-purple-200">
            <p className="text-xs text-purple-600 mb-1">Attendance Rate</p>
            <p className="text-2xl font-bold text-purple-900">{attendance}%</p>
          </div>
        </div>

        {/* Calendar View */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <StudentAttendanceCalendar studentId={student.id} compact={true} />
          
          {/* Legend */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm font-bold text-gray-700 mb-3">Legend:</p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
                  <CheckCircle size={12} className="text-white"/>
                </div>
                <span className="text-sm text-gray-700">Present</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center">
                  <XCircle size={12} className="text-white"/>
                </div>
                <span className="text-sm text-gray-700">Absent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-yellow-500 rounded flex items-center justify-center">
                  <Clock size={12} className="text-white"/>
                </div>
                <span className="text-sm text-gray-700">Late</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                  <AlertCircle size={12} className="text-white"/>
                </div>
                <span className="text-sm text-gray-700">Excused</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// Helper component
function AttendanceCounter({ studentId, metric }: { studentId: string, metric: 'total' | 'present' | 'absent' | 'late' | 'excused' }) {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    const fetchCount = async () => {
      const { data } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', studentId)
      
      if (data) {
        if (metric === 'total') setCount(data.length)
        else if (metric === 'present') setCount(data.filter((a: any) => a.status === 'present').length)
        else if (metric === 'absent') setCount(data.filter((a: any) => a.status === 'absent').length)
        else if (metric === 'late') setCount(data.filter((a: any) => a.status === 'late').length)
        else if (metric === 'excused') setCount(data.filter((a: any) => a.status === 'excused').length)
      }
    }
    fetchCount()
  }, [studentId, metric])

  return <>{count !== null ? count : '--'}</>
}