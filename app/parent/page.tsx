'use client'

import PaymentRequestModal from '@/components/PaymentRequestModal'
import { useUser, SignOutButton } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LogOut, Users, FileText, DollarSign, Calendar, TrendingUp, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import StudentAttendanceCalendar from '@/components/StudentAttendanceCalendar'
import NewsHighlights from '@/components/NewsHighlights'
import UnifiedReportCard from '@/components/UnifiedReportCard'
import { calculateClassPositions } from '@/lib/classPositions'
import { getSchoolAssets, getClassTeacherSignature } from '@/lib/schoolAssets'
import { enrichResultsWithPreviousTerms } from '@/lib/reportCardData'


interface Student {
  id: string
  full_name: string
  admission_number: string
  class_id: string
  class_name: string
}

interface StudentResults {
  id: string
  subject_name: string
  total_score: number
  grade: string
  term: string
  session?: string
  ca_score?: number
  exam_score?: number
  first_term_total?: number
  second_term_total?: number
  teacher_comment?: string
  principal_comment?: string
  remark?: string
}

interface FeeStatus {
  total_expected: number
  total_paid: number
  balance: number
  status: 'Paid' | 'Partial' | 'Pending'
}

interface FeeItem {
  name: string
  amount: number
  term: string | null
  session: string | null
}

interface AttendanceRecord {
  total_days: number
  present_days: number
  percentage: number
}

interface AttendanceStats {
  total: number
  present: number
  absent: number
  late: number
  percentage: number
}

export default function ParentPortalPage() {
  const { user, isLoaded } = useUser()
  
  const [children, setChildren] = useState<Student[]>([])
  const [selectedChild, setSelectedChild] = useState<string | null>(null)
  const [results, setResults] = useState<StudentResults[]>([])
  const [fees, setFees] = useState<FeeStatus | null>(null)
  const [feeItems, setFeeItems] = useState<FeeItem[]>([])
  const [paymentHistory, setPaymentHistory] = useState<any[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null)
  const [attendanceCounts, setAttendanceCounts] = useState<any>(null)
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'list' | 'results' | 'fees' | 'attendance'>('list')
  const [positionInfo, setPositionInfo] = useState<any>(null)
  const [signUrls, setSignUrls] = useState<{ teacher?: string | null; principal?: string | null; stamp?: string | null }>({})
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [reportData, setReportData] = useState<any>(null)
  
  // ✅ NEW: Term/Session selector state
  const [selectedTerm, setSelectedTerm] = useState<string>('')
  const [selectedSession, setSelectedSession] = useState<string>('')
  const [availableTerms, setAvailableTerms] = useState<string[]>([])
  const [availableSessions, setAvailableSessions] = useState<string[]>([])

  useEffect(() => {
    if (isLoaded && !user) redirect('/sign-in')
    if (user) fetchChildren()
  }, [user, isLoaded])

  const fetchChildren = async () => {
    setLoading(true)
    try {
      const email = user?.emailAddresses[0]?.emailAddress
      if (!email) return

      const { data: userData, error: userError } = await supabase
        .from('users').select('id, role').eq('email', email).single()

      if (userError || !userData || userData.role !== 'parent') {
        toast.error('Parent account not found. Please contact administration.')
        setLoading(false)
        return
      }

      // ✅ Children resolved via parents.students_ids (single source of truth).
      // students.user_id is reserved for the student's OWN portal account.
      let ids: string[] = []
      const { data: byUser } = await supabase
        .from('parents').select('id, students_ids').eq('user_id', userData.id).single()
      ids = byUser?.students_ids || []
      if (ids.length === 0) {
        const { data: byEmail } = await supabase
          .from('parents').select('id, students_ids').ilike('email', email).single()
        ids = byEmail?.students_ids || []
      }

      let studentsData: any[] | null = null
      let studentsError: any = null
      if (ids.length > 0) {
        const res = await supabase
          .from('students').select('id, full_name, admission_number, class_id').in('id', ids)
        studentsData = res.data
        studentsError = res.error
      } else {
        // Legacy fallback (children linked before students_ids existed)
        const res = await supabase
          .from('students').select('id, full_name, admission_number, class_id').eq('user_id', userData.id)
        studentsData = res.data
        studentsError = res.error
      }

      if (studentsError) {
        toast.error('Failed to load children: ' + studentsError.message)
        setLoading(false)
        return
      }

      const studentsWithClasses = await Promise.all(
        (studentsData || []).map(async (student) => {
          if (student.class_id) {
            const { data: classData } = await supabase.from('classes').select('class_name').eq('id', student.class_id).single()
            return { ...student, class_name: classData?.class_name || 'Unknown' }
          }
          return { ...student, class_name: 'Unknown' }
        })
      )

      setChildren(studentsWithClasses)
      if (studentsWithClasses.length === 0) {
        toast.error('No children linked to your account. Please contact school administration.')
      }
    } catch (error: any) {
      toast.error('Failed to load children data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // ✅ NEW: Fetch available terms/sessions for the student
  const fetchAvailableTermsAndSessions = async (studentId: string) => {
    const { data } = await supabase
      .from('results')
      .select('term, session')
      .eq('student_id', studentId)
    
    if (data && data.length > 0) {
      const terms = Array.from(new Set(data.map(r => r.term))).sort((a, b) => {
        const order = ['First Term', 'Second Term', 'Third Term']
        return order.indexOf(b) - order.indexOf(a) // DESC: Third > Second > First
      })
      const sessions = Array.from(new Set(data.map(r => r.session))).sort((a, b) => {
        const [yearA] = a.split('/').map(Number)
        const [yearB] = b.split('/').map(Number)
        return yearB - yearA // DESC: 2026/2027 > 2025/2026
      })
      setAvailableTerms(terms)
      setAvailableSessions(sessions)
      
      // Default to latest session + latest term
      setSelectedSession(sessions[0])
      setSelectedTerm(terms[0])
    }
  }

  const fetchStudentResults = async (studentId: string, term: string, session: string) => {
    try {
      const { data, error } = await supabase
        .from('results')
        .select(`id, total_score, grade, term, session, ca_score, exam_score, first_term_total, second_term_total, teacher_comment, principal_comment, remark, subject:subjects(name)`)
        .eq('student_id', studentId)
        .eq('term', term)
        .eq('session', session)

      if (error) throw error
      
      const enrichedResults = (data || []).map(r => ({
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
      
      const withPreviousTerms = await enrichResultsWithPreviousTerms(enrichedResults, studentId, session) 
       setResults(withPreviousTerms as any)
      return withPreviousTerms as any
    } catch (error: any) {
      toast.error('Failed to load results')
      return []
    }
  }

  const fetchStudentReport = async (studentId: string, term: string, session: string) => {
    const { data } = await supabase
      .from('student_reports')
      .select('*')
      .eq('student_id', studentId)
      .eq('term', term)
      .eq('session', session)
      .single()
    setReportData(data || null)
  }

  const fetchStudentAttendanceForReport = async (studentId: string) => {
    try {
      const { data } = await supabase.from('attendance').select('status').eq('student_id', studentId)
      if (data && data.length > 0) {
        const presentCount = data.filter((a: any) => a.status === 'present').length
        const absentCount = data.filter((a: any) => a.status === 'absent').length
        const lateCount = data.filter((a: any) => a.status === 'late').length
        
        setAttendanceStats({
          total: data.length,
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          percentage: Math.round((presentCount / data.length) * 100)
        })
      } else {
        setAttendanceStats({ total: 0, present: 0, absent: 0, late: 0, percentage: 0 })
      }
    } catch (error) {
      console.error('Error fetching attendance for report:', error)
    }
  }

  const fetchStudentFees = async (studentId: string) => {
    try {
      const student = children.find(c => c.id === studentId)
      if (!student) return
      const { data: feeStructures } = await supabase
        .from('fee_structures')
        .select('name, amount, term, session')
        .eq('class_id', student.class_id)
      const totalExpected = feeStructures?.reduce((sum, f) => sum + f.amount, 0) || 0
      setFeeItems((feeStructures || []) as FeeItem[])
      const { data: payments } = await supabase
        .from('fee_payments')
        .select('amount_paid, receipt_number, payment_date, payment_method, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
      const totalPaid = payments?.reduce((sum, p) => sum + p.amount_paid, 0) || 0
      setPaymentHistory((payments || []) as any[])
      
      setFees({
        total_expected: totalExpected,
        total_paid: totalPaid,
        balance: totalExpected - totalPaid,
        status: (totalExpected - totalPaid) <= 0 ? 'Paid' : (totalExpected - totalPaid) < totalExpected ? 'Partial' : 'Pending'
      })

      const { data: reqs } = await supabase
        .from('payment_requests')
        .select('id, amount, status, payment_method, reference_number, notes, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
      setPendingRequests((reqs || []) as any[])
    } catch (error: any) {
      toast.error('Failed to load fee information')
    }
  }

  const fetchStudentAttendance = async (studentId: string) => {
    try {
      const { data } = await supabase.from('attendance').select('status').eq('student_id', studentId)
      if (data && data.length > 0) {
        const presentCount = data.filter((a: any) => a.status === 'present').length
        setAttendanceCounts({
          total: data.length,
          present: presentCount,
          absent: data.filter((a: any) => a.status === 'absent').length,
          late: data.filter((a: any) => a.status === 'late').length,
          excused: data.filter((a: any) => a.status === 'excused').length,
        })
        setAttendance({
          total_days: data.length,
          present_days: presentCount,
          percentage: Math.round((presentCount / data.length) * 100)
        })
      } else {
        setAttendanceCounts({ total: 0, present: 0, absent: 0, late: 0, excused: 0 })
        setAttendance({ total_days: 0, present_days: 0, percentage: 0 })
      }
    } catch (error: any) {
      toast.error('Failed to load attendance')
    }
  }

  const handleViewResults = async (childId: string) => {
    setSelectedChild(childId)
    setViewMode('results')
    
    // ✅ Fetch available terms/sessions first
    await fetchAvailableTermsAndSessions(childId)
  }

  // ✅ NEW: Re-fetch when term/session changes
  useEffect(() => {
    if (selectedChild && selectedTerm && selectedSession) {
      const loadResults = async () => {
        const child = children.find(c => c.id === selectedChild)
        const fetched = await fetchStudentResults(selectedChild, selectedTerm, selectedSession)
        await fetchStudentAttendanceForReport(selectedChild)

        if (child?.class_id && fetched && fetched.length > 0) {
          const positions = await calculateClassPositions(child.class_id, selectedTerm, selectedSession)
          setPositionInfo(positions.get(selectedChild) || null)
        } else {
          setPositionInfo(null)
        }

        await fetchStudentReport(selectedChild, selectedTerm, selectedSession)

        const assets = await getSchoolAssets()
        setSignUrls({
          teacher: child?.class_id ? await getClassTeacherSignature(child.class_id) : null,
          principal: assets.principal_signature?.url || null,
          stamp: assets.school_stamp?.url || null,
        })
      }
      loadResults()
    }
  }, [selectedChild, selectedTerm, selectedSession, children])

  const handleViewFees = (childId: string) => {
    setSelectedChild(childId)
    setViewMode('fees')
    fetchStudentFees(childId)
  }

  const handleViewAttendance = (childId: string) => {
    setSelectedChild(childId)
    setViewMode('attendance')
    fetchStudentAttendance(childId)
  }

  const handleBackToList = () => {
    setViewMode('list')
    setSelectedChild(null)
    setResults([])
    setFees(null)
    setFeeItems([])
    setPaymentHistory([])
    setAttendance(null)
    setAttendanceStats(null)
    setAttendanceCounts(null)
    setPositionInfo(null)
    setSignUrls({})
    setReportData(null)
    setPendingRequests([])
    setSelectedTerm('')
    setSelectedSession('')
    setAvailableTerms([])
    setAvailableSessions([])
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  const selectedStudent = children.find(c => c.id === selectedChild)

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Parent Portal</h1>
            <p className="text-sm text-gray-600">Mannaplus Group of Schools</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="font-bold text-gray-900">{user?.firstName || 'Parent'}</p>
              <p className="text-sm text-gray-600">{user?.emailAddresses[0]?.emailAddress}</p>
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
        {viewMode === 'list' && (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Welcome, {user?.firstName || 'Parent'}! 👋</h2>
              <p className="text-gray-600">Monitor your child's academic progress and school activities.</p>
            </div>
            <NewsHighlights />
            
            {children.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <Users size={48} className="mx-auto text-gray-300 mb-4"/>
                <h3 className="text-lg font-bold text-gray-900 mb-2">No Children Linked</h3>
                <p className="text-gray-600">Please contact the school administration to link your account to your child's record.</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {children.map(child => (
                  <div key={child.id} data-testid="child-card" className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{child.full_name}</h3>
                        <p className="text-sm text-gray-600">Admission No: {child.admission_number}</p>
                        <p className="text-sm text-gray-600">Class: {child.class_name}</p>
                      </div>
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-full">Active Student</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <button onClick={() => handleViewResults(child.id)} className="bg-blue-50 hover:bg-blue-100 p-4 rounded-lg flex items-center gap-3 transition-colors cursor-pointer text-left">
                        <div className="bg-blue-100 p-2 rounded-full"><FileText size={20} className="text-blue-600"/></div>
                        <div><p className="text-xs text-gray-600">Academic Results</p><p className="font-bold text-blue-900">View Results →</p></div>
                      </button>
                      <button onClick={() => handleViewFees(child.id)} data-testid="view-fees" className="bg-green-50 hover:bg-green-100 p-4 rounded-lg flex items-center gap-3 transition-colors cursor-pointer text-left">
                        <div className="bg-green-100 p-2 rounded-full"><DollarSign size={20} className="text-green-600"/></div>
                        <div><p className="text-xs text-gray-600">Fee Status</p><p className="font-bold text-green-900">View Fees →</p></div>
                      </button>
                      <button onClick={() => handleViewAttendance(child.id)} className="bg-orange-50 hover:bg-orange-100 p-4 rounded-lg flex items-center gap-3 transition-colors cursor-pointer text-left">
                        <div className="bg-orange-100 p-2 rounded-full"><Calendar size={20} className="text-orange-600"/></div>
                        <div><p className="text-xs text-gray-600">Attendance</p><p className="font-bold text-orange-900">View Record →</p></div>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {viewMode === 'results' && selectedStudent && (
          <div>
            <button onClick={handleBackToList} className="mb-4 text-gray-700 hover:text-gray-900 font-bold flex items-center gap-2">← Back to Children</button>
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedStudent.full_name}</h2>
              <p className="text-gray-600 mb-6">Academic Results - {selectedStudent.admission_number}</p>

              {/* ✅ NEW: Term/Session Selector */}
              {availableSessions.length > 0 && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Session</label>
                      <select 
                        value={selectedSession} 
                        onChange={(e) => setSelectedSession(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-gray-900 font-bold"
                      >
                        {availableSessions.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Term</label>
                      <select 
                        value={selectedTerm} 
                        onChange={(e) => setSelectedTerm(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-gray-900 font-bold"
                      >
                        {availableTerms.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {positionInfo && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-900">
                    <strong>Position:</strong> {positionInfo.position_text} of {positionInfo.total_students} students
                  </p>
                </div>
              )}

              <UnifiedReportCard 
                student={{
                  full_name: selectedStudent.full_name,
                  admission_number: selectedStudent.admission_number,
                  class_name: selectedStudent.class_name || 'Unknown',
                  position: positionInfo ? `${positionInfo.position_text} of ${positionInfo.total_students}` : '-',
                  no_in_class: positionInfo?.total_students || '-'
                }}
                results={results}
                session={selectedSession || '2025/2026'}
                term={selectedTerm || 'Third Term'}
                attendance={{
                  opened: attendanceStats?.total || 0,
                  present: attendanceStats?.present || 0,
                  punctual: (attendanceStats?.total || 0) - (attendanceStats?.late || 0),
                  beg_term: reportData?.term_begins || '6th April 2026',
                  end_term: reportData?.term_ends || '6th July 2026',
                  next_term: reportData?.next_term_begins || ''
                }}
                conductRatings={reportData?.conduct_ratings || {
                  'Attentiveness': 'Excellent',
                  'Cleanliness': 'Good',
                  'Emotional Balance': 'Good',
                  'Honesty': 'Excellent',
                  'Leadership': 'Good',
                  'Maturity': 'Good',
                  'Politeness': 'Excellent',
                  'Punctuality': 'Excellent'
                }}
                physicalSkills={reportData?.physical_skills || {
                  'Handwriting': 'Good',
                  'Verbal Fluency': 'Good',
                  'Debate/Quiz': 'Good',
                  'Sports': 'Excellent',
                  'Drawing & Painting': 'Good',
                  'Musical Skills': 'Fair',
                  'Handling Tools': 'Good'
                }}
                healthComment={reportData?.health_comment || 'Student is fit and healthy'}
                teacherComment={reportData?.teacher_comment || results[0]?.teacher_comment || 'Good performance'}
                principalComment={reportData?.principal_comment || results[0]?.principal_comment || 'Keep it up'}
                teacherSignatureUrl={signUrls.teacher}
                principalSignatureUrl={signUrls.principal}
                stampUrl={signUrls.stamp}
                teacherDate={reportData?.teacher_date || null}
                headTeacherDate={reportData?.head_teacher_date || null}
              />
              
              {results.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  <FileText size={48} className="mx-auto text-gray-300 mb-2"/>
                  <p>No results available for this term/session</p>
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
                      {results.map((result, idx) => (
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
          </div>
        )}

        {viewMode === 'fees' && selectedStudent && (
          <div>
            <button onClick={handleBackToList} className="mb-4 text-gray-700 hover:text-gray-900 font-bold flex items-center gap-2">← Back to Children</button>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedStudent.full_name}</h2>
                  <p className="text-gray-600">Fee Status - {selectedStudent.admission_number}</p>
                </div>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  disabled={!fees || fees.balance <= 0}
                  className="bg-green-600 text-white px-5 py-3 rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  💳 Make Payment
                </button>
              </div>
              {fees ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 p-6 rounded-lg text-center">
                      <p className="text-sm text-blue-600 mb-2">Total Expected</p>
                      <p className="text-3xl font-bold text-blue-900">₦{fees.total_expected.toLocaleString()}</p>
                    </div>
                    <div className="bg-green-50 p-6 rounded-lg text-center">
                      <p className="text-sm text-green-600 mb-2">Total Paid</p>
                      <p className="text-3xl font-bold text-green-900">₦{fees.total_paid.toLocaleString()}</p>
                    </div>
                    <div className={`p-6 rounded-lg text-center ${fees.balance <= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                      <p className={`text-sm mb-2 ${fees.balance <= 0 ? 'text-green-600' : 'text-red-600'}`}>Balance</p>
                      <p className={`text-3xl font-bold ${fees.balance <= 0 ? 'text-green-900' : 'text-red-900'}`}>{fees.balance.toLocaleString()}</p>
                      <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${
                        fees.status === 'Paid' ? 'bg-green-100 text-green-800' :
                        fees.status === 'Partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>{fees.status}</span>
                    </div>
                    <div className="bg-yellow-50 p-6 rounded-lg text-center">
                      <p className="text-sm text-yellow-600 mb-2">Pending Approval</p>
                      <p className="text-3xl font-bold text-yellow-900">
                        ₦{pendingRequests.filter(r => r.status === 'pending').reduce((s, r) => s + r.amount, 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                      <h3 className="font-bold text-gray-900">Fee Breakdown</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100 border-b border-gray-200">
                          <tr>
                            <th className="p-3 text-left font-bold text-gray-900">Fee Item</th>
                            <th className="p-3 text-left font-bold text-gray-900">Term / Session</th>
                            <th className="p-3 text-right font-bold text-gray-900">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {feeItems.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="p-6 text-center text-gray-600">No fee structure published for this class yet.</td>
                            </tr>
                          ) : (
                            feeItems.map((item, i) => (
                              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="p-3 font-medium text-gray-900">{item.name}</td>
                                <td className="p-3 text-sm text-gray-600">{item.term || '-'} • {item.session || '-'}</td>
                                <td className="p-3 text-right font-bold text-gray-900">₦{item.amount.toLocaleString()}</td>
                              </tr>
                            ))
                          )}
                          <tr className="bg-green-50">
                            <td colSpan={2} className="p-3 font-bold text-gray-900">Total Expected</td>
                            <td className="p-3 text-right font-bold text-green-800">₦{(fees.total_expected || 0).toLocaleString()}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div data-testid="payment-history" className="mt-6 bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                      <h3 className="font-bold text-gray-900">Payment History</h3>
                    </div>
                    {paymentHistory.length === 0 && pendingRequests.length === 0 ? (
                      <p className="p-6 text-center text-gray-600">No payments recorded yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-100 border-b border-gray-200">
                            <tr>
                              <th className="p-3 text-left font-bold text-gray-900">Receipt</th>
                              <th className="p-3 text-left font-bold text-gray-900">Date & Time</th>
                              <th className="p-3 text-left font-bold text-gray-900">Method</th>
                              <th className="p-3 text-right font-bold text-gray-900">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paymentHistory.map((p, i) => (
                              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="p-3 font-medium text-gray-900">{p.receipt_number}</td>
                                <td className="p-3 text-sm text-gray-600">{new Date(p.created_at || p.payment_date).toLocaleString()}</td>
                                <td className="p-3 text-sm text-gray-600 capitalize">{p.payment_method}</td>
                                <td className="p-3 text-right font-bold text-green-700">₦{p.amount_paid.toLocaleString()}</td>
                              </tr>
                            ))}
                            {pendingRequests.filter(r => r.status === 'pending').map((r, i) => (
                              <tr key={`req-${r.id}`} className="border-b border-gray-100 hover:bg-yellow-50 bg-yellow-50/40">
                                <td className="p-3 font-medium text-gray-900">{r.reference_number}</td>
                                <td className="p-3 text-sm text-gray-600">{new Date(r.created_at).toLocaleString()}</td>
                                <td className="p-3 text-sm text-gray-600 capitalize">{r.payment_method}</td>
                                <td className="p-3 text-right font-bold text-yellow-700">
                                  ₦{r.amount.toLocaleString()}
                                  <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full">PENDING</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading fee information...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === 'attendance' && selectedStudent && (
          <div>
            <button onClick={handleBackToList} className="mb-4 text-gray-700 hover:text-gray-900 font-bold flex items-center gap-2">← Back to Children</button>
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedStudent.full_name}</h2>
              <p className="text-gray-600 mb-6">Attendance Record - {selectedStudent.admission_number}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <div className="bg-blue-50 p-4 rounded-lg text-center border-2 border-blue-200">
                  <Calendar size={28} className="mx-auto text-blue-600 mb-2"/>
                  <p className="text-xs text-blue-600 mb-1">Total Days</p>
                  <p className="text-2xl font-bold text-blue-900">{attendanceCounts?.total ?? '--'}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center border-2 border-green-200">
                  <TrendingUp size={28} className="mx-auto text-green-600 mb-2"/>
                  <p className="text-xs text-green-600 mb-1">Days Present</p>
                  <p className="text-2xl font-bold text-green-900">{attendanceCounts?.present ?? '--'}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center border-2 border-red-200">
                  <XCircle size={28} className="mx-auto text-red-600 mb-2"/>
                  <p className="text-xs text-red-600 mb-1">Days Absent</p>
                  <p className="text-2xl font-bold text-red-900">{attendanceCounts?.absent ?? '--'}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center border-2 border-yellow-200">
                  <Clock size={28} className="mx-auto text-yellow-600 mb-2"/>
                  <p className="text-xs text-yellow-600 mb-1">Days Late</p>
                  <p className="text-2xl font-bold text-yellow-900">{attendanceCounts?.late ?? '--'}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center border-2 border-blue-200">
                  <AlertCircle size={28} className="mx-auto text-blue-600 mb-2"/>
                  <p className="text-xs text-blue-600 mb-1">Days Excused</p>
                  <p className="text-2xl font-bold text-blue-900">{attendanceCounts?.excused ?? '--'}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center border-2 border-purple-200">
                  <p className="text-xs text-purple-600 mb-1">Attendance Rate</p>
                  <p className="text-2xl font-bold text-purple-900">{attendance?.percentage || 0}%</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Calendar size={20}/> Monthly Attendance Calendar</h3>
                <StudentAttendanceCalendar studentId={selectedStudent.id} compact={true} />
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm font-bold text-gray-700 mb-3">Legend:</p>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2"><div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center"><CheckCircle size={12} className="text-white"/></div><span className="text-sm text-gray-700">Present</span></div>
                    <div className="flex items-center gap-2"><div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center"><XCircle size={12} className="text-white"/></div><span className="text-sm text-gray-700">Absent</span></div>
                    <div className="flex items-center gap-2"><div className="w-6 h-6 bg-yellow-500 rounded flex items-center justify-center"><Clock size={12} className="text-white"/></div><span className="text-sm text-gray-700">Late</span></div>
                    <div className="flex items-center gap-2"><div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center"><AlertCircle size={12} className="text-white"/></div><span className="text-sm text-gray-700">Excused</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {selectedStudent && fees && (
        <PaymentRequestModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          student={selectedStudent}
          balance={Math.max(0, fees.balance)}
          onSuccess={() => fetchStudentFees(selectedChild!)}
        />
      )}
    </div>
  )
}