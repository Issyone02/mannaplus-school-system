'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, FileText, Calendar, TrendingUp } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import UnifiedReportCard from '@/components/UnifiedReportCard'
import { calculateClassPositions } from '@/lib/classPositions'
import { getSchoolAssets, getClassTeacherSignature } from '@/lib/schoolAssets'
import { enrichResultsWithPreviousTerms } from '@/lib/reportCardData'

const getCurrentSession = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`
}

const getCurrentTerm = () => {
  const month = new Date().getMonth() + 1
  if (month >= 9) return 'First Term'
  if (month <= 3) return 'Second Term'
  return 'Third Term'
}

export default function StudentResultsPage() {
  const { user, isLoaded } = useUser()
  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState<any>(null)
  const [results, setResults] = useState<any[]>([])
  const [selectedTerm, setSelectedTerm] = useState(getCurrentTerm())
  const [selectedSession, setSelectedSession] = useState(getCurrentSession())
  const [positionInfo, setPositionInfo] = useState<{ position_text: string; total_students: number } | null>(null)
  const [reportData, setReportData] = useState<any>(null)
  const [signUrls, setSignUrls] = useState<{ teacher?: string | null; principal?: string | null; stamp?: string | null }>({})
  const [enrichedResults, setEnrichedResults] = useState<any[]>([])

  const termOptions = ['First Term', 'Second Term', 'Third Term']
  const generateSessionOptions = () => {
    const currentYear = new Date().getFullYear()
    const sessions = []
    for (let i = currentYear - 3; i <= currentYear + 1; i++) sessions.push(`${i}/${i + 1}`)
    return sessions
  }
  const sessionOptions = generateSessionOptions()

  useEffect(() => {
    if (isLoaded && user) fetchStudent()
  }, [isLoaded, user])

  useEffect(() => {
    if (student?.id) {
      fetchResults()
      fetchReportData()
    }
  }, [student, selectedTerm, selectedSession])

  useEffect(() => {
    if (results.length > 0 && student?.id) {
      enrichResultsWithPreviousTerms(results, student.id, selectedSession).then(setEnrichedResults)
    } else {
      setEnrichedResults([])
    }
  }, [results, selectedSession, student])

  const fetchStudent = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', user?.id)
        .single()

      if (!userData) {
        toast.error('User account not found')
        setLoading(false)
        return
      }

      const { data: studentData } = await supabase
        .from('students')
        .select('id, full_name, admission_number, class_id')
        .eq('user_id', userData.id)
        .single()

      if (!studentData) {
        toast.error('Student record not found')
        setLoading(false)
        return
      }

      const { data: classData } = await supabase
        .from('classes')
        .select('class_name, arm, department')
        .eq('id', studentData.class_id)
        .single()

      setStudent({
        ...studentData,
        class_name: classData ? `${classData.class_name} ${classData.arm ? `(${classData.arm})` : ''}` : 'Unknown'
      })
    } catch (error) {
      console.error('Failed to fetch student:', error)
      toast.error('Failed to load student data')
    } finally {
      setLoading(false)
    }
  }

  const fetchResults = async () => {
    if (!student?.class_id) return
    const { data, error } = await supabase
      .from('results')
      .select(`
        id,
        ca_score,
        exam_score,
        total_score,
        grade,
        remark,
        subject_id,
        subjects:subject_id (name)
      `)
      .eq('student_id', student.id)
      .eq('term', selectedTerm)
      .eq('session', selectedSession)

    if (error) {
      console.error('Failed to fetch results:', error)
      setResults([])
      return
    }

    const enriched = (data || []).map((r: any) => ({
      ...r,
      subject_name: r.subjects?.name || 'Unknown',
      position: '-'
    }))
    setResults(enriched)
  }

  const fetchReportData = async () => {
    if (!student?.id) return

    const { data: report } = await supabase
      .from('student_reports')
      .select('*')
      .eq('student_id', student.id)
      .eq('term', selectedTerm)
      .eq('session', selectedSession)
      .single()

    setReportData(report || null)

    if (student.class_id) {
      const positions = await calculateClassPositions(student.class_id, selectedTerm, selectedSession)
      setPositionInfo(positions.get(student.id) || null)
    }

    const assets = await getSchoolAssets()
    setSignUrls({
      teacher: student.class_id ? await getClassTeacherSignature(student.class_id) : null,
      principal: assets.principal_signature?.url || null,
      stamp: assets.school_stamp?.url || null,
    })
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  const totalScore = results.reduce((sum, r) => sum + (r.total_score || 0), 0)
  const maxScore = results.length * 100
  const percentage = maxScore > 0 ? ((totalScore / maxScore) * 100).toFixed(1) : '0'

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      <div className="bg-white shadow border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft size={20} /> Back to Dashboard
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Results</h1>
          <p className="text-gray-600">{student?.full_name} • {student?.admission_number}</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Term</label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900"
              >
                {termOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Session</label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900"
              >
                {sessionOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <UnifiedReportCard
                student={{
                  full_name: student.full_name,
                  admission_number: student.admission_number,
                  class_name: student.class_name,
                  position: positionInfo ? `${positionInfo.position_text} of ${positionInfo.total_students}` : (reportData?.position_in_class || '-'),
                  no_in_class: reportData?.total_students_in_class || positionInfo?.total_students || '-'
                }}
                results={enrichedResults}
                session={selectedSession}
                term={selectedTerm}
                attendance={{
                  opened: reportData?.attendance_opened ?? 0,
                  present: reportData?.attendance_present ?? 0,
                  punctual: reportData?.attendance_punctual ?? 0,
                  beg_term: reportData?.term_begins || 'N/A',
                  end_term: reportData?.term_ends || 'N/A',
                  next_term: reportData?.next_term_begins || 'N/A'
                }}
                conductRatings={reportData?.conduct_ratings || {}}
                physicalSkills={reportData?.physical_skills || {}}
                healthComment={reportData?.health_comment || 'Student is fit and healthy.'}
                teacherComment={reportData?.teacher_comment || 'Good performance'}
                principalComment={reportData?.principal_comment || 'Keep it up'}
                teacherSignatureUrl={signUrls.teacher}
                principalSignatureUrl={signUrls.principal}
                stampUrl={signUrls.stamp}
                teacherDate={reportData?.teacher_date || null}
                headTeacherDate={reportData?.head_teacher_date || null}
              />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Subjects</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{results.length}</p>
              </div>
              <FileText size={32} className="text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Score</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{totalScore}/{maxScore}</p>
              </div>
              <TrendingUp size={32} className="text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Percentage</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{percentage}%</p>
              </div>
              <Calendar size={32} className="text-purple-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Position</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {positionInfo ? `${positionInfo.position_text}` : '-'}
                </p>
              </div>
              <TrendingUp size={32} className="text-orange-600" />
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">CA (30)</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Exam (70)</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Grade</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                      <p className="font-bold">No results available for this term</p>
                      <p className="text-sm mt-2">Results will appear here once your teacher enters them</p>
                    </td>
                  </tr>
                ) : (
                  results.map((result) => (
                    <tr key={result.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {result.subject_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {result.ca_score}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {result.exam_score}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-center">
                        {result.total_score}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          result.grade?.startsWith('A') ? 'bg-green-100 text-green-800' :
                          result.grade?.startsWith('B') ? 'bg-blue-100 text-blue-800' :
                          result.grade?.startsWith('C') ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {result.grade}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
                        {result.remark}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {results.length > 0 && (
          <p className="md:hidden mt-2 text-xs text-gray-500 text-center"> Swipe the table sideways to see Grade & Remark 'n </p>
        )}
      </main>
    </div>
  )
}