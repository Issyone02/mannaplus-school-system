'use client'

import { useUser, SignOutButton } from '@clerk/nextjs'
import { redirect, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BookOpen, TrendingUp, Calendar, DollarSign, LogOut, Clock, AlertCircle, XCircle, FileText } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import StudentAttendanceCalendar from '@/components/StudentAttendanceCalendar'
import NewsHighlights from '@/components/NewsHighlights'
import UnifiedReportCard from '@/components/UnifiedReportCard'
import { calculateClassPositions } from '@/lib/classPositions'
import { getSchoolAssets, getClassTeacherSignature } from '@/lib/schoolAssets'
import { fetchUserRowByClerkId } from '@/lib/fetchUserRow'

export default function StudentDashboardPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [student, setStudent] = useState<any>(null)
  const [results, setResults] = useState<any[]>([])
  const [allResults, setAllResults] = useState<any[]>([])
  const [timetable, setTimetable] = useState<any[]>([])
  const [attendance, setAttendance] = useState<number>(0)
  const [attendanceStats, setAttendanceStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'results'>('overview')
  const [positionInfo, setPositionInfo] = useState<any>(null)
  const [ signUrls, setSignUrls ] = useState<{ teacher?: string | null; principal?: string | null; stamp?: string |null }>({})

  useEffect(() => {
    if (isLoaded && !user) {
      redirect('/sign-in')
    }
    if (user) {
      fetchStudentData()
    }
  }, [user, isLoaded])

  const fetchStudentData = async () => {
    if (!user) return

    try {
      const { data: userData, error: userError } = await fetchUserRowByClerkId(user.id, 'id, role, clerk_id')

      if (userError || !userData) {
        toast.error('Student account not found in database.')
        setLoading(false)
        return
      }

      if (userData.role !== 'student') {
        toast.error('This account is not a student account.')
        redirect('/dashboard')
        return
      }

      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id, full_name, admission_number, class_id')
        .eq('user_id', userData.id)
        .single()

      if (studentError || !studentData) {
        toast.error('No student profile linked to this account. Contact admin.')
        setLoading(false)
        return
      }

      let className = 'Unassigned'
      let department = null
      
      if (studentData.class_id) {
        const { data: classData } = await supabase
          .from('classes')
          .select('class_name, department')
          .eq('id', studentData.class_id)
          .single()
        
        if (classData) {
          className = classData.class_name
          department = classData.department
        }
      }

      const enrichedStudent = {
        ...studentData,
        class: { class_name: className, department }
      }

      setStudent(enrichedStudent)

      const { data: resultsData } = await supabase
        .from('results')
        .select(`total_score, grade, term, subject:subjects(name)`)
        .eq('student_id', studentData.id)
        .order('created_at', { ascending: false })
        .limit(4)

      setResults(resultsData || [])

      const { data: allResultsData } = await supabase
        .from('results')
        .select(`id, total_score, grade, term, session, ca_score, exam_score, first_term_total, second_term_total, teacher_comment, principal_comment, remark, subject:subjects(name)`)
        .eq('student_id', studentData.id)
        .order('term', { ascending: false })

      const enrichedAllResults = (allResultsData || []).map(r => ({
        ...r,
        subject_name: (r as any).subject?.name || 'Unknown Subject',
        ca_score: r.ca_score || 0,
        exam_score: r.exam_score || 0,
        first_term_total: r.first_term_total || 0,
        second_term_total: r.second_term_total || 0,
        teacher_comment: r.teacher_comment || 'Good performance',
        principal_comment: r.principal_comment || 'Keep it up',
        remark: r.remark || 'Excellent'
      }))
      setAllResults(enrichedAllResults)

      if (allResultsData && allResultsData.length > 0 && studentData.class_id) {
        const positions = await calculateClassPositions(
          studentData.class_id,
          allResultsData[0].term || 'Third Term',
          allResultsData[0].session || '2025/2026'
        )
        setPositionInfo(positions.get(studentData.id) || null)
      }

      // ✅ Fetch signatures & stamp for the report card
      const assets = await getSchoolAssets()
      setSignUrls({
        teacher: studentData.class_id ? await getClassTeacherSignature(studentData.class_id) : null,
        principal: assets.principal_signature?.url || null,
        stamp: assets.school_stamp?.url || null,
      })

      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', studentData.id)

      if (attendanceData && attendanceData.length > 0) {
        const presentCount = attendanceData.filter((a: any) => a.status === 'present').length
        const absentCount = attendanceData.filter((a: any) => a.status === 'absent').length
        const lateCount = attendanceData.filter((a: any) => a.status === 'late').length
        
        setAttendance(Math.round((presentCount / attendanceData.length) * 100))
        setAttendanceStats({
          total: attendanceData.length,
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          excused: attendanceData.filter((a: any) => a.status === 'excused').length,
          percentage: Math.round((presentCount / attendanceData.length) * 100)
        })
      }

      const { data: timetableData } = await supabase
        .from('timetables') 
        .select(`day_of_week, start_time, end_time, room_number, subject:subjects(name)`)
        .eq('class_id', studentData.class_id)

      setTimetable(timetableData || [])

    } catch (error) {
      console.error('Error fetching student data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const calculateAverage = () => {
    if (results.length === 0) return 0
    const total = results.reduce((sum, r) => sum + (r.total_score || 0), 0)
    return (total / results.length).toFixed(1)
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 mb-4">Please contact the school administrator.</p>
          <SignOutButton>
            <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">Log Out</button>
          </SignOutButton>
        </div>
      </div>
    )
  }

  const average = calculateAverage()
  const today = getDayName().toLowerCase()

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      <header className="bg-white shadow border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Student Portal</h1>
            <p className="text-sm text-gray-600">Mannaplus Group of Schools</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="font-bold text-gray-900">{student.full_name}</p>
              <p className="text-sm text-gray-600">{student.admission_number}</p>
            </div>
            <SignOutButton>
              <button className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                <LogOut size={16}/> Logout
              </button>
            </SignOutButton>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-br from-orange-600 to-orange-800 rounded-xl shadow-lg p-8 text-white mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold mb-2">{student.full_name}</h2>
              <p className="text-orange-100">{student.class?.class_name || 'Unassigned'} {student.class?.department ? `(${student.class.department})` : ''}</p>
              <p className="text-orange-100">Admission: {student.admission_number}</p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold mb-2">{average}%</div>
              <p className="text-orange-100 font-medium">Current Average</p>
            </div>
          </div>
        </div>

        <NewsHighlights />
        
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-1 font-bold text-sm transition-colors ${
              activeTab === 'overview' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('results')}
            className={`pb-3 px-1 font-bold text-sm transition-colors ${
              activeTab === 'results' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            My Results
          </button>
          <button 
            onClick={() => setActiveTab('attendance')}
            className={`pb-3 px-1 font-bold text-sm transition-colors ${
              activeTab === 'attendance' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            My Attendance
          </button>
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <BookOpen className="w-10 h-10 text-blue-500 mb-4" />
                <h3 className="text-sm text-gray-600 font-medium mb-1">Average Score</h3>
                <p className="text-2xl font-bold text-gray-900">{average}%</p>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <TrendingUp className="w-10 h-10 text-green-500 mb-4" />
                <h3 className="text-sm text-gray-600 font-medium mb-1">Attendance</h3>
                <p className="text-2xl font-bold text-gray-900">{attendance}%</p>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <Calendar className="w-10 h-10 text-purple-500 mb-4" />
                <h3 className="text-sm text-gray-600 font-medium mb-1">Classes Today</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {timetable.filter((t: any) => t.day_of_week?.toLowerCase() === today).length || 0}
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <DollarSign className="w-10 h-10 text-orange-500 mb-4" />
                <h3 className="text-sm text-gray-600 font-medium mb-1">Fees Status</h3>
                <p className="text-2xl font-bold text-gray-900">View Details</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Results</h2>
                <div className="space-y-3">
                  {results.length === 0 ? (
                    <p className="text-gray-600 text-center py-4">No results available yet</p>
                  ) : (
                    results.map((result, index) => (
                      <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                          <p className="font-bold text-gray-900">{result.subject?.name || 'Unknown'}</p>
                          <p className="text-sm text-gray-600">{result.term || 'Recent Term'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">{result.total_score}%</p>
                          <p className="text-sm text-gray-600">Grade: <span className="font-bold">{result.grade || '-'}</span></p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Today's Schedule</h2>
                <div className="space-y-3">
                  {timetable.filter((t: any) => t.day_of_week?.toLowerCase() === today).length === 0 ? (
                    <p className="text-gray-600 text-center py-4">No classes scheduled for today</p>
                  ) : (
                    timetable
                      .filter((t: any) => t.day_of_week?.toLowerCase() === today)
                      .map((slot, index) => (
                        <div key={index} className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                          <p className="font-bold text-gray-900">{slot.subject?.name || 'Unknown Subject'}</p>
                          <p className="text-sm text-gray-700">
                            {slot.start_time} - {slot.end_time} | {slot.room_number || 'TBA'}
                          </p>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'results' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">My Academic Results</h2>
            
            {positionInfo && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>Class Position:</strong> {positionInfo.position_text} of {positionInfo.total_students} students
                </p>
              </div>
            )}

            <UnifiedReportCard 
              student={{
                full_name: student.full_name,
                admission_number: student.admission_number,
                class_name: student.class?.class_name || 'Unknown',
                position: positionInfo ? `${positionInfo.position_text} of ${positionInfo.total_students}` : '-',
                no_in_class: positionInfo?.total_students || '-'
              }}
              results={allResults}
              session={allResults[0]?.session || '2025/2026'}
              term={allResults[0]?.term || 'Third Term'}
              attendance={{
                opened: attendanceStats?.total || 0,
                present: attendanceStats?.present || 0,
                punctual: (attendanceStats?.total || 0) - (attendanceStats?.late || 0),
                beg_term: '6th April 2026',
                end_term: '6th July 2026',
                next_term: ''
              }}
              conductRatings={{
                'Attentiveness': 'Excellent',
                'Cleanliness': 'Good',
                'Emotional Balance': 'Good',
                'Honesty': 'Excellent',
                'Leadership': 'Good',
                'Maturity': 'Good',
                'Politeness': 'Excellent',
                'Punctuality': 'Excellent'
              }}
              physicalSkills={{
                'Handwriting': 'Good',
                'Verbal Fluency': 'Good',
                'Debate/Quiz': 'Good',
                'Sports': 'Excellent',
                'Drawing & Painting': 'Good',
                'Musical Skills': 'Fair',
                'Handling Tools': 'Good'
              }}
              healthComment="Student is fit and healthy"
              teacherComment={allResults[0]?.teacher_comment || 'Good performance'}
              principalComment={allResults[0]?.principal_comment || 'Keep it up'}
              teacherSignatureUrl={signUrls.teacher}
              principalSignatureUrl={signUrls.principal}
              stampUrl={signUrls.stamp}
            />

            {allResults.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                <FileText size={48} className="mx-auto text-gray-300 mb-2"/>
                <p>No results available yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto mt-6">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b-2 border-gray-200">
                    <tr>
                      <th className="p-3 text-left font-bold text-gray-900">Subject</th>
                      <th className="p-3 text-center font-bold text-gray-900">Term</th>
                      <th className="p-3 text-center font-bold text-gray-900">Score</th>
                      <th className="p-3 text-center font-bold text-gray-900">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allResults.map((result, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-bold text-gray-900">{result.subject_name}</td>
                        <td className="p-3 text-center text-gray-700">{result.term}</td>
                        <td className="p-3 text-center font-bold text-blue-600">{result.total_score}%</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            result.grade.startsWith('A') ? 'bg-green-100 text-green-800' :
                            result.grade.startsWith('B') ? 'bg-blue-100 text-blue-800' :
                            result.grade.startsWith('C') ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                          }`}>{result.grade}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">My Attendance Record</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg text-center border-2 border-blue-200">
                <Calendar size={28} className="mx-auto text-blue-600 mb-2"/>
                <p className="text-xs text-blue-600 mb-1">Total Days</p>
                <p className="text-2xl font-bold text-blue-900">{attendanceStats?.total ?? '--'}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center border-2 border-green-200">
                <TrendingUp size={28} className="mx-auto text-green-600 mb-2"/>
                <p className="text-xs text-green-600 mb-1">Days Present</p>
                <p className="text-2xl font-bold text-green-900">{attendanceStats?.present ?? '--'}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center border-2 border-red-200">
                <XCircle size={28} className="mx-auto text-red-600 mb-2"/>
                <p className="text-xs text-red-600 mb-1">Days Absent</p>
                <p className="text-2xl font-bold text-red-900">{attendanceStats?.absent ?? '--'}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center border-2 border-yellow-200">
                <Clock size={28} className="mx-auto text-yellow-600 mb-2"/>
                <p className="text-xs text-yellow-600 mb-1">Days Late</p>
                <p className="text-2xl font-bold text-yellow-900">{attendanceStats?.late ?? '--'}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-center border-2 border-blue-200">
                <AlertCircle size={28} className="mx-auto text-blue-600 mb-2"/>
                <p className="text-xs text-blue-600 mb-1">Days Excused</p>
                <p className="text-2xl font-bold text-blue-900">{attendanceStats?.excused ?? '--'}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center border-2 border-purple-200">
                <p className="text-xs text-purple-600 mb-1">Attendance Rate</p>
                <p className="text-2xl font-bold text-purple-900">{attendance}%</p>
              </div>
            </div>

            <StudentAttendanceCalendar studentId={student.id} compact={true} />
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm font-bold text-gray-700 mb-3">Legend:</p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <span className="text-sm text-gray-700">Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <span className="text-sm text-gray-700">Absent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-yellow-500 rounded flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <span className="text-sm text-gray-700">Late</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <span className="text-sm text-gray-700">Excused</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function AttendanceCounter({ studentId, metric }: { 
  studentId: string, 
  metric: 'total' | 'present' | 'absent' | 'late' | 'excused' 
}) {
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

function getDayName(): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[new Date().getDay()]
}