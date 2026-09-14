'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser, SignOutButton } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { LogOut, User, BookOpen, CreditCard, Calendar, Mail, ChevronRight } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

interface Parent {
  id: string
  email: string
  full_name: string
}

interface Student {
  id: string
  full_name: string
  admission_number: string
  class_id: string
  relationship: string
}

export default function ParentDashboardPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [parent, setParent] = useState<Parent | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/portal/login')
      return
    }
    if (user) {
      fetchParentAndStudents()
    }
  }, [user, isLoaded, router])

  const fetchParentAndStudents = async () => {
    setLoading(true)
    try {
      const email = user?.emailAddresses[0]?.emailAddress
      if (!email) return

      // 1. Fetch parent info
      const { data: parentData, error: parentError } = await supabase
        .from('parents')
        .select('*')
        .eq('email', email)
        .single()

      if (parentError || !parentData) {
        toast.error('Parent account not found. Contact school admin.')
        router.push('/portal/login')
        return
      }
      
      setParent(parentData)
      localStorage.setItem('parent', JSON.stringify(parentData))

      // 2. Fetch linked students
      const { data: links, error: linksError } = await supabase
        .from('parent_students')
        .select(`
          relationship,
          student:students(id, full_name, admission_number, class_id)
        `)
        .eq('parent_id', parentData.id)

      if (linksError) throw linksError

      const studentsWithRelation = links?.map((link: any) => ({
        ...link.student,
        relationship: link.relationship
      })) || []
      
      setStudents(studentsWithRelation)

      console.log('📊 Parent Dashboard Data:', {
        parent: parentData?.full_name,
        studentsCount: studentsWithRelation.length,
        students: studentsWithRelation.map(s => s.full_name)
      })

    } catch (error: any) {
      console.error('Error fetching parent data:', error)
      toast.error('Failed to load data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-900 font-bold">Loading...</div>
      </div>
    )
  }

  if (!user || !parent) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mannaplus Group of Schools</h1>
            <p className="text-sm text-gray-600">Parent Portal</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="font-bold text-gray-900">{parent.full_name}</p>
              <p className="text-sm text-gray-600">{user.emailAddresses[0]?.emailAddress}</p>
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
        {/* Announcements Card */}
        <div className="mb-6">
          <button 
            onClick={() => router.push('/portal/notices')}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-lg">
                <Mail size={24}/>
              </div>
              <div className="text-left">
                <h2 className="text-xl font-bold">📢 Announcements</h2>
                <p className="text-white/80">View school notices and updates</p>
              </div>
            </div>
            <ChevronRight size={24}/>
          </button>
        </div>

        {/* Welcome */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">My Children</h2>
          <p className="text-gray-600">Select a child to view their results, pay fees, or check attendance</p>
        </div>

        {students.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <User size={48} className="mx-auto text-gray-300 mb-4"/>
            <p className="text-gray-900 font-bold mb-2">No students linked</p>
            <p className="text-gray-600 mb-4">Contact the school to link your children to your account</p>
            <p className="text-sm text-gray-500">Email: admin@mannaplus.edu</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {students.map(student => (
              <div
                key={student.id}
                className="bg-white rounded-lg shadow hover:shadow-lg cursor-pointer transition-shadow p-6 border-2 border-transparent hover:border-green-500"
              >
                {/* Card Header - Clickable for Results */}
                <div 
                  onClick={() => router.push(`/portal/results/${student.id}`)}
                  className="cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-green-100 p-3 rounded-lg">
                      <User size={24} className="text-green-600"/>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {student.relationship}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{student.full_name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{student.admission_number}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <BookOpen size={16}/>
                    <span className="capitalize">{student.class_id}</span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="mt-4 flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/portal/results/${student.id}`)
                    }}
                    className="flex-1 min-w-[90px] bg-green-600 text-white py-2 rounded hover:bg-green-700 font-bold text-xs flex items-center justify-center gap-1"
                  >
                    <BookOpen size={12}/> Results
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/portal/fees?student=${student.id}`)
                    }}
                    className="flex-1 min-w-[90px] bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-bold text-xs flex items-center justify-center gap-1"
                  >
                    <CreditCard size={12}/> Fees
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/portal/attendance?student=${student.id}`)
                    }}
                    className="flex-1 min-w-[90px] bg-purple-600 text-white py-2 rounded hover:bg-purple-700 font-bold text-xs flex items-center justify-center gap-1"
                  >
                    <Calendar size={12}/> Attendance
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/portal/timetable?student=${student.id}`)
                    }}
                    className="flex-1 min-w-[90px] bg-orange-600 text-white py-2 rounded hover:bg-orange-700 font-bold text-xs flex items-center justify-center gap-1"
                  >
                    <BookOpen size={12}/> Timetable
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}