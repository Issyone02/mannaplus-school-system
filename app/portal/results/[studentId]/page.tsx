'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, BookOpen, Award, TrendingUp } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

interface Result {
  id: string
  student_id: string
  subject_id?: string
  class_id: string
  term: string
  session: string
  ca_score: number
  exam_score: number
  total_score: number
  grade: string
  remark: string
  position?: number
  subject_name?: string  // Will be populated from join
}

export default function ParentResultsPage() {
  const router = useRouter()
  const params = useParams()
  const { user, isLoaded } = useUser()
  const [results, setResults] = useState<Result[]>([])
  const [studentName, setStudentName] = useState('')
  const [className, setClassName] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('First Term')
  const [selectedSession, setSelectedSession] = useState('2024/2025')
  const [loading, setLoading] = useState(true)

  const termOptions = ['First Term', 'Second Term', 'Third Term']
  const sessionOptions = ['2023/2024', '2024/2025', '2025/2026', '2026/2027']

  useEffect(() => {
    if (isLoaded && user && params.studentId) {
      fetchResults()
    }
  }, [isLoaded, user, params.studentId, selectedTerm, selectedSession])

  const fetchResults = async () => {
    setLoading(true)
    try {
      const studentId = params.studentId as string

      // 1. Get student info WITH DEPARTMENT
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select(`
          full_name, 
          class_id,
          classes (
            department,
            class_level
          )
        `)
        .eq('id', studentId)
        .single()

      if (studentError) throw studentError

      if (studentData) {
        setStudentName(studentData.full_name)
        const className = `${studentData.class_id} ${
          (studentData as any).classes?.department 
            ? `- ${(studentData as any).classes.department}` 
            : ''
        }`
        setClassName(className)
        
        const studentDept = (studentData as any).classes?.department

        // 2. Fetch results filtered by student's department
        let query = supabase
          .from('results')
          .select(`
            *,
            subject:subjects(name, department)
          `)
          .eq('student_id', studentId)
          .eq('term', selectedTerm)
          .eq('session', selectedSession)

        // If student is in SS and has a department, filter subjects by department
        if (studentDept) {
          query = query.or(`department.eq.${studentDept},department.is.null`)
        }

        const { data: resultsData, error: resultsError } = await query.order('created_at', { ascending: false })

        if (resultsError) throw resultsError

        const enrichedResults = (resultsData || []).map(r => ({
          ...r,
          subject_name: r.subject?.name || 'Unknown Subject'
        }))

        setResults(enrichedResults)
      }

    } catch (error: any) {
      console.error('Fetch error:', error)
      toast.error('Failed to load data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-500 text-white'
      case 'B': return 'bg-blue-500 text-white'
      case 'C': return 'bg-yellow-500 text-white'
      case 'D': return 'bg-orange-500 text-white'
      case 'E': return 'bg-orange-400 text-white'
      case 'F': return 'bg-red-500 text-white'
      default: return 'bg-gray-200 text-gray-700'
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-900">
        Loading results...
      </div>
    )
  }

  const totalResults = results.length
  const avgScore = totalResults > 0 
    ? Math.round(results.reduce((sum, r) => sum + (r.total_score || 0), 0) / totalResults)
    : 0

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
        {/* Student Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2"> {studentName}'s Results</h1>
          <p className="text-gray-600">Class: <span className="font-bold text-gray-900 uppercase">{className}</span></p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
            <select 
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="p-2 border rounded text-gray-900 bg-white"
            >
              {termOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
            <select 
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="p-2 border rounded text-gray-900 bg-white"
            >
              {sessionOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <BookOpen size={20} className="text-blue-600"/>
              </div>
              <div>
                <p className="text-sm text-gray-600">Subjects</p>
                <p className="text-2xl font-bold text-gray-900">{totalResults}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <TrendingUp size={20} className="text-green-600"/>
              </div>
              <div>
                <p className="text-sm text-gray-600">Average Score</p>
                <p className="text-2xl font-bold text-gray-900">{avgScore}%</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Award size={20} className="text-purple-600"/>
              </div>
              <div>
                <p className="text-sm text-gray-600">Overall Grade</p>
                <p className="text-2xl font-bold text-gray-900">
                  {avgScore >= 70 ? 'A' : avgScore >= 60 ? 'B' : avgScore >= 50 ? 'C' : avgScore >= 45 ? 'D' : avgScore >= 40 ? 'E' : 'F'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-bold text-gray-900">Subject Results</h2>
          </div>
          
          {results.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              <BookOpen size={48} className="mx-auto text-gray-300 mb-2"/>
              <p className="font-bold">No results found</p>
              <p className="text-sm">Results for {selectedTerm} {selectedSession} haven't been entered yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-4 text-left font-bold text-gray-900">Subject</th>
                    <th className="p-4 text-center font-bold text-gray-900">CA (40)</th>
                    <th className="p-4 text-center font-bold text-gray-900">Exam (60)</th>
                    <th className="p-4 text-center font-bold text-gray-900">Total (100)</th>
                    <th className="p-4 text-center font-bold text-gray-900">Grade</th>
                    <th className="p-4 text-left font-bold text-gray-900">Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {results.map(result => (
                    <tr key={result.id} className="hover:bg-gray-50">
                      <td className="p-4 font-bold text-gray-900">
                        {result.subject_name || 'Unknown'}
                      </td>
                      <td className="p-4 text-center text-gray-900">{result.ca_score || 0}</td>
                      <td className="p-4 text-center text-gray-900">{result.exam_score || 0}</td>
                      <td className="p-4 text-center">
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-900 rounded-lg font-bold">
                          {result.total_score || 0}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-lg font-bold text-sm ${getGradeColor(result.grade)}`}>
                          {result.grade || '-'}
                        </span>
                      </td>
                      <td className="p-4 text-gray-700">{result.remark || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}