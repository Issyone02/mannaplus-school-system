'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, User, Mail, Phone, GraduationCap, Eye, X } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

interface Student {
  id: string
  full_name: string
  admission_number: string
  class_id: string
  email?: string
  phone?: string
  gender?: string
  date_of_birth?: string
  passport_url?: string | null
  active?: boolean
  address?: string
  state?: string
  emergency_contact?: string
  emergency_phone?: string
  create_portal_account?: boolean
  user_email?: string
}

interface ClassItem {
  id: string
  class_name: string
  arm: string | null
  department: string | null
}

export default function TeacherStudentsPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  
  // ✅ View Modal State
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)

  useEffect(() => {
    if (isLoaded && user) {
      fetchTeacherClasses()
    }
  }, [user, isLoaded])

  useEffect(() => {
    if (classes.length > 0) {
      fetchStudents()
    }
  }, [selectedClass, searchTerm, classes])

  const fetchTeacherClasses = async () => {
    try {
      const email = user?.emailAddresses[0]?.emailAddress
      if (!email) return

      const { data: teacher } = await supabase
        .from('teachers')
        .select('id, form_class_id')
        .eq('email', email)
        .single()

      if (!teacher) return

      // Get class IDs from both form_class_id and teacher_assignments
      const classIds = new Set<string>()
      if (teacher.form_class_id) {
        classIds.add(teacher.form_class_id)
      }

      const { data: assignments } = await supabase
        .from('teacher_assignments')
        .select('class_id')
        .eq('teacher_id', teacher.id)

      if (assignments) {
        assignments.forEach(a => {
          if (a.class_id) classIds.add(a.class_id)
        })
      }

      // Fetch class details
      if (classIds.size > 0) {
        const { data: classesData } = await supabase
          .from('classes')
          .select('id, class_name, arm, department')
          .in('id', Array.from(classIds))
          .order('class_name')

        setClasses(classesData || [])
      }
    } catch (error: any) {
      toast.error('Failed: ' + error.message)
    }
  }

  const fetchStudents = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('students')
        .select('*')
        .eq('active', true)
        .order('full_name')

      const assignedClassIds = classes.map(c => c.id)
      query = query.in('class_id', assignedClassIds)

      if (selectedClass !== 'all') {
        query = query.eq('class_id', selectedClass)
      }

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,admission_number.ilike.%${searchTerm}%`)
      }

      const { data: studentsData, error } = await query

      if (error) throw error
      setStudents(studentsData || [])
    } catch (error: any) {
      toast.error('Failed to load students: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleView = (student: Student) => {
    setViewingStudent(student)
    setShowViewModal(true)
  }

  const formatClassName = (cls: ClassItem) => {
    return `${cls.class_name} ${cls.arm ? `(${cls.arm})` : ''} ${cls.department ? `- ${cls.department}` : ''}`
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-900">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Students 👨‍🎓</h1>
          <p className="text-gray-600">View and manage students in your classes</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[250px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Students</label>
            <input
              type="text"
              placeholder="Search by name or admission number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border rounded text-gray-900 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="p-2 border rounded text-gray-900 bg-white min-w-[200px]"
            >
              <option value="all">All Classes</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {formatClassName(cls)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <User size={20} className="text-blue-600"/>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{students.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <GraduationCap size={20} className="text-green-600"/>
              </div>
              <div>
                <p className="text-sm text-gray-600">Classes</p>
                <p className="text-2xl font-bold text-gray-900">{classes.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-bold text-gray-900">Students List</h2>
          </div>
          
          {students.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              <User size={48} className="mx-auto text-gray-300 mb-2"/>
              <p className="font-bold">No students found</p>
              <p className="text-sm">No students in your assigned classes</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left text-gray-900 font-bold">Admission No</th>
                    <th className="text-gray-900 font-bold">Student Name</th>
                    <th className="text-gray-900 font-bold">Class</th>
                    <th className="text-gray-900 font-bold">Gender</th>
                    <th className="text-gray-900 font-bold">Date of Birth</th>
                    <th className="p-3 text-center text-gray-900 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.map(student => {
                    const studentClass = classes.find(c => c.id === student.class_id)
                    return (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="p-3 text-gray-900 font-medium">{student.admission_number}</td>
                        <td className="p-3 text-gray-900">
                          <div className="flex items-center gap-2">
                            <div className="bg-blue-100 p-2 rounded-full">
                              <User size={16} className="text-blue-600"/>
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{student.full_name}</p>
                              {student.email && (
                                <p className="text-sm text-gray-500">{student.email}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded">
                            {studentClass ? formatClassName(studentClass) : student.class_id}
                          </span>
                        </td>
                        <td className="p-3 text-gray-700 capitalize">{student.gender || 'N/A'}</td>
                        <td className="p-3 text-gray-700">
                          {student.date_of_birth 
                            ? new Date(student.date_of_birth).toLocaleDateString()
                            : 'N/A'
                          }
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleView(student)}
                            className="text-gray-600 hover:text-gray-900 p-1 hover:bg-gray-100 rounded"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ✅ View Student Modal */}
      {showViewModal && viewingStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-900">Student Profile</h2>
              <button onClick={() => { setShowViewModal(false); setViewingStudent(null); }} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6">
              {/* Passport Photo Header */}
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-blue-100 bg-gray-100 flex items-center justify-center shrink-0">
                  {viewingStudent.passport_url ? (
                    <img src={viewingStudent.passport_url} alt={viewingStudent.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="text-gray-400" size={48} />
                  )}
                </div>
                <div className="text-center md:text-left flex-1">
                  <h3 className="text-2xl font-bold text-gray-900">{viewingStudent.full_name}</h3>
                  <p className="text-gray-600 font-medium">Admission No: {viewingStudent.admission_number || 'N/A'}</p>
                  <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                      {formatClassName(classes.find(c => c.id === viewingStudent.class_id) || { class_name: viewingStudent.class_id, arm: null, department: null })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gender</p>
                    <p className="text-sm font-medium text-gray-900 capitalize">{viewingStudent.gender || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date of Birth</p>
                    <p className="text-sm font-medium text-gray-900">{viewingStudent.date_of_birth ? new Date(viewingStudent.date_of_birth).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email</p>
                    <p className="text-sm font-medium text-gray-900">{viewingStudent.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Phone</p>
                    <p className="text-sm font-medium text-gray-900">{viewingStudent.phone || 'N/A'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">State of Origin</p>
                    <p className="text-sm font-medium text-gray-900">{viewingStudent.state || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Home Address</p>
                    <p className="text-sm font-medium text-gray-900">{viewingStudent.address || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Emergency Contact</p>
                    <p className="text-sm font-medium text-gray-900">{viewingStudent.emergency_contact || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Emergency Phone</p>
                    <p className="text-sm font-medium text-gray-900">{viewingStudent.emergency_phone || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
                <button 
                  onClick={() => { setShowViewModal(false); setViewingStudent(null); }} 
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}