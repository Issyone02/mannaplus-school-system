'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser, SignOutButton } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { LogOut, BookOpen, Calendar, Users, CheckSquare, TrendingUp } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import NewsHighlights from '@/components/NewsHighlights'

interface Teacher {
  id: string
  full_name: string
  email: string
  form_class_id?: string
  subjects?: string[]
}

interface Assignment {
  id: string
  class_id: string
  subject_name: string
  term: string
  session: string
  class_name?: string
}

export default function TeacherDashboardPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [stats, setStats] = useState({ 
    totalClasses: 0, 
    totalSubjects: 0, 
    totalStudents: 0,
    resultsEntered: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in')
      return
    }
    if (user) {
      fetchTeacherData()
    }
  }, [user, isLoaded, router])

  const fetchTeacherData = async () => {
    setLoading(true)
    try {
      const email = user?.emailAddresses[0]?.emailAddress
      if (!email) return

      // 1. Fetch teacher info (includes form_class_id and subjects)
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('id, full_name, email, form_class_id, subjects')
        .eq('email', email)
        .single()

      if (!teacherData) {
        toast.error('Teacher account not found')
        router.push('/sign-in')
        return
      }

      setTeacher(teacherData)

      // 2. Fetch assignments from teacher_assignments table
      const { data: assignmentsData } = await supabase
        .from('teacher_assignments')
        .select('*')
        .eq('teacher_id', teacherData.id)

      // 3. Calculate unique classes from BOTH form_class_id and assignments
      const classIds = new Set<string>()
      if (teacherData.form_class_id) {
        classIds.add(teacherData.form_class_id)
      }
      if (assignmentsData) {
        assignmentsData.forEach((a: any) => {
          if (a.class_id) classIds.add(a.class_id)
        })
      }
      const uniqueClasses = Array.from(classIds)
      
      // 4. Fetch REAL total students in assigned classes
      let totalStudents = 0
      if (uniqueClasses.length > 0) {
        const { count } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .in('class_id', uniqueClasses)
        
        totalStudents = count || 0
      }

      // 5. Enrich assignments with readable class names
      let displayAssignments = assignmentsData || []
      
      // If teacher is a form teacher but not in assignments table, add it
      if (teacherData.form_class_id && !displayAssignments.some((a: any) => a.class_id === teacherData.form_class_id)) {
        const { data: classData } = await supabase
          .from('classes')
          .select('class_name, arm, department')
          .eq('id', teacherData.form_class_id)
          .single()
        
        if (classData) {
          const className = `${classData.class_name} ${classData.arm ? `(${classData.arm})` : ''} ${classData.department ? `- ${classData.department}` : ''}`
          displayAssignments.push({
            id: 'form-class-' + teacherData.form_class_id,
            class_id: teacherData.form_class_id,
            subject_name: 'Form Teacher',
            term: 'Current',
            session: 'Current',
            class_name: className
          })
        }
      }

      // Fetch class names for all assignments
      const enrichedAssignments = await Promise.all(displayAssignments.map(async (a: any) => {
        if (!a.class_name && a.class_id) {
          const { data: classData } = await supabase
            .from('classes')
            .select('class_name, arm, department')
            .eq('id', a.class_id)
            .single()
          if (classData) {
            a.class_name = `${classData.class_name} ${classData.arm ? `(${classData.arm})` : ''} ${classData.department ? `- ${classData.department}` : ''}`
          } else {
            a.class_name = a.class_id
          }
        }
        return a
      }))

      setAssignments(enrichedAssignments)

      // 6. Fetch REAL results entered by this teacher
      let resultsEntered = 0
      if (teacherData.subjects && teacherData.subjects.length > 0) {
        const { data: subjectsData } = await supabase
          .from('subjects')
          .select('id')
          .in('name', teacherData.subjects)
        
        const subjectIds = subjectsData?.map(s => s.id) || []
        
        if (subjectIds.length > 0) {
          const { count } = await supabase
            .from('results')
            .select('*', { count: 'exact', head: true })
            .in('subject_id', subjectIds)
          
          resultsEntered = count || 0
        }
      }

      // 7. Update stats with REAL data
      setStats({
        totalClasses: uniqueClasses.length,
        totalSubjects: teacherData.subjects?.length || assignmentsData?.length || 0,
        totalStudents: totalStudents,
        resultsEntered: resultsEntered
      })

    } catch (error: any) {
      console.error('Error fetching teacher data:', error)
      toast.error('Failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="font-bold">Loading Teacher Portal...</p>
        </div>
      </div>
    )
  }

  if (!teacher) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Teacher Portal</h1>
            <p className="text-sm text-gray-600">Mannaplus Group of Schools</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="font-bold text-gray-900">{teacher.full_name}</p>
              <p className="text-sm text-gray-600">{teacher.email}</p>
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
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Welcome back, {teacher.full_name.split(' ')[0]}! 👋</h2>
          <p className="text-gray-600">Here's an overview of your classes and assignments</p>
        </div>

        {/* ✅ Latest school news visible to teachers */}
        <NewsHighlights />

        {/* Stats Cards - REAL DATA FROM DATABASE */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <BookOpen size={24} className="text-blue-600"/>
              </div>
              <div>
                <p className="text-sm text-gray-600">My Classes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalClasses}</p>
                <p className="text-xs text-gray-500">Classes assigned</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckSquare size={24} className="text-green-600"/>
              </div>
              <div>
                <p className="text-sm text-gray-600">Subjects</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSubjects}</p>
                <p className="text-xs text-gray-500">Total subjects</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Users size={24} className="text-purple-600"/>
              </div>
              <div>
                <p className="text-sm text-gray-600">Students</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
                <p className="text-xs text-gray-500">Total students</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-4">
              <div className="bg-pink-100 p-3 rounded-lg">
                <TrendingUp size={24} className="text-pink-600"/>
              </div>
              <div>
                <p className="text-sm text-gray-600">Results Entered</p>
                <p className="text-2xl font-bold text-gray-900">{stats.resultsEntered}</p>
                <p className="text-xs text-gray-500">Total results</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button 
              onClick={() => router.push('/teacher/attendance')}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow text-left flex items-center gap-4"
            >
              <div className="bg-white/20 p-3 rounded-lg">
                <CheckSquare size={24}/>
              </div>
              <div>
                <h4 className="font-bold text-lg">Mark Attendance</h4>
                <p className="text-sm text-blue-100">For your assigned classes</p>
              </div>
            </button>
            
            <button 
              onClick={() => router.push('/teacher/results')}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow text-left flex items-center gap-4"
            >
              <div className="bg-white/20 p-3 rounded-lg">
                <TrendingUp size={24}/>
              </div>
              <div>
                <h4 className="font-bold text-lg">Enter Results</h4>
                <p className="text-sm text-green-100">For your subjects</p>
              </div>
            </button>
            
            <button 
              onClick={() => router.push('/teacher/timetable')}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow text-left flex items-center gap-4"
            >
              <div className="bg-white/20 p-3 rounded-lg">
                <Calendar size={24}/>
              </div>
              <div>
                <h4 className="font-bold text-lg">View Timetable</h4>
                <p className="text-sm text-purple-100">My teaching schedule</p>
              </div>
            </button>
          </div>
        </div>

        {/* Assigned Classes - REAL DATA */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h3 className="text-lg font-bold text-gray-900">My Assigned Classes</h3>
          </div>
          {assignments.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              <BookOpen size={48} className="mx-auto text-gray-300 mb-2"/>
              <p className="font-bold">No assignments yet</p>
              <p className="text-sm">Contact admin to assign you classes or form teacher duties</p>
            </div>
          ) : (
            <div className="divide-y">
              {assignments.map(assignment => (
                <div key={assignment.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                  <div>
                    <p className="font-bold text-gray-900">{assignment.subject_name}</p>
                    <p className="text-sm text-gray-600">Class: {assignment.class_name || assignment.class_id} • {assignment.term} {assignment.session}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => router.push(`/teacher/attendance?class=${assignment.class_id}`)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-bold px-3 py-1 border border-blue-600 rounded"
                    >
                      Attendance
                    </button>
                    <button 
                      onClick={() => router.push(`/teacher/results?class=${assignment.class_id}&subject=${assignment.subject_name}`)}
                      className="text-green-600 hover:text-green-800 text-sm font-bold px-3 py-1 border border-green-600 rounded"
                    >
                      Results
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}