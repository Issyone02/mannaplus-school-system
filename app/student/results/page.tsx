'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Download } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

export default function StudentResultsPage() {
  const { user } = useUser()
  const [results, setResults] = useState<any[]>([])
  const [student, setStudent] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchResults()
    }
  }, [user])

  const fetchResults = async () => {
    try {
      // 1. Get user record
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', user?.id)
        .single()

      if (!userData) return

      // 2. Get student record
      const { data: studentData } = await supabase
        .from('students')
        .select('id, full_name, admission_number')
        .eq('user_id', userData.id)
        .single()

      if (!studentData) return
      setStudent(studentData)

      // 3. Fetch all results
      const { data: resultsData } = await supabase
        .from('results')
        .select(`
          total_score,
          grade,
          term,
          session,
          subject:subjects(name)
        `)
        .eq('student_id', studentData.id)
        .order('session', { ascending: false })
        .order('term', { ascending: false })

      setResults(resultsData || [])
    } catch (error) {
      console.error('Error fetching results:', error)
      toast.error('Failed to load results')
    } finally {
      setLoading(false)
    }
  }

  const exportToPDF = () => {
    toast.success('Export feature coming soon!')
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
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft size={20}/> Back to Dashboard
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Results</h1>
            <p className="text-gray-600">{student?.full_name} - {student?.admission_number}</p>
          </div>
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-700"
          >
            <Download size={18}/> Export Results
          </button>
        </div>

        {results.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg">No results available yet</p>
            <p className="text-gray-500 text-sm mt-2">Results will appear here when your teachers enter them</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Term</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Session</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Score</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {results.map((result, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-bold text-gray-900">{result.subject?.name || 'Unknown'}</td>
                    <td className="px-6 py-4 text-gray-700">{result.term}</td>
                    <td className="px-6 py-4 text-gray-700">{result.session}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-2xl font-bold text-orange-600">{result.total_score}%</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded text-xs font-bold ${
                        result.grade?.startsWith('A') ? 'bg-green-100 text-green-800' :
                        result.grade?.startsWith('B') ? 'bg-blue-100 text-blue-800' :
                        result.grade?.startsWith('C') ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {result.grade || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}