'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { 
  BookOpen, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  UserCheck,
  Search,
  X,
  Save,
  AlertCircle,
  GraduationCap,
  FlaskConical,
  Palette,
  Briefcase
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

interface ClassItem {
  id: string
  class_name: string
  class_level: string
  arm: string
  department: string | null
  teacher_id: string | null
  teacher_name: string | null
  max_students: number
  academic_session: string
  created_at: string
  updated_at: string
  student_count?: number
}

interface Teacher {
  id: string
  full_name: string
  email: string
}

export default function ClassesPage() {
  const router = useRouter()
  const { user } = useUser()
  
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [sessions, setSessions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null)
  const [deletingClass, setDeletingClass] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    class_name: '',
    class_level: 'Primary',
    arm: '',
    department: '',
    teacher_id: '',
    max_students: 40,
    academic_session: ''
  })

  useEffect(() => {
    fetchSessions()
    fetchClasses()
    fetchTeachers()
  }, [])

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('academic_sessions')
        .select('session_name')
        .order('start_date', { ascending: false })

      if (error) throw error
      
      if (data && data.length > 0) {
        setSessions(data.map(s => s.session_name))
        setFormData(prev => ({ ...prev, academic_session: data[0].session_name }))
      } else {
        const currentYear = new Date().getFullYear()
        const fallback = [`${currentYear}/${currentYear + 1}`, `${currentYear - 1}/${currentYear}`]
        setSessions(fallback)
        setFormData(prev => ({ ...prev, academic_session: fallback[0] }))
      }
    } catch (error: any) {
      console.error('Failed to fetch sessions:', error.message)
    }
  }

  const fetchClasses = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('class_level')
        .order('class_name')

      if (error) throw error

      const classesWithCount = await Promise.all(
        (data || []).map(async (cls) => {
          const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id)
          
          return { ...cls, student_count: count || 0 }
        })
      )

      setClasses(classesWithCount)
    } catch (error: any) {
      toast.error('Failed to fetch classes: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('id, full_name, email')
        .order('full_name')

      if (error) throw error
      setTeachers(data || [])
    } catch (error: any) {
      console.error('Failed to fetch teachers:', error.message)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const teacher = teachers.find(t => t.id === formData.teacher_id)
      
      const classData = {
        name: formData.class_name.trim(),
        class_name: formData.class_name.trim(),
        class_level: formData.class_level,
        arm: formData.arm.trim().toUpperCase(),
        department: formData.class_level === 'SS' ? formData.department : null,
        teacher_id: formData.teacher_id || null,
        teacher_name: teacher?.full_name || null,
        max_students: formData.max_students,
        academic_session: formData.academic_session.trim(),
        updated_at: new Date().toISOString()
      }

      if (editingClass) {
        const { error } = await supabase.from('classes').update(classData).eq('id', editingClass.id)
        if (error) throw error
        toast.success('Class updated successfully!')
      } else {
        const { error } = await supabase.from('classes').insert([classData])
        if (error) throw error
        toast.success('Class created successfully!')
      }

      setShowModal(false)
      setEditingClass(null)
      setFormData({
        class_name: '',
        class_level: 'Primary',
        arm: '',
        department: '',
        teacher_id: '',
        max_students: 40,
        academic_session: sessions[0] || ''
      })
      fetchClasses()
    } catch (error: any) {
      toast.error('Failed: ' + error.message)
    }
  }

  const handleEdit = (cls: ClassItem) => {
    setEditingClass(cls)
    setFormData({
      class_name: cls.class_name || '',
      class_level: cls.class_level || 'Primary',
      arm: cls.arm || '',
      department: cls.department || '',
      teacher_id: cls.teacher_id || '',
      max_students: cls.max_students || 40,
      academic_session: cls.academic_session || sessions[0] || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class? This cannot be undone.')) return

    setDeletingClass(id)
    try {
      const { error } = await supabase.from('classes').delete().eq('id', id)
      if (error) throw error
      toast.success('Class deleted successfully!')
      fetchClasses()
    } catch (error: any) {
      toast.error('Failed to delete: ' + error.message)
    } finally {
      setDeletingClass(null)
    }
  }

  const filteredClasses = classes.filter(cls =>
    (cls.class_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cls.teacher_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cls.department || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalStudents = classes.reduce((sum, cls) => sum + (cls.student_count || 0), 0)

  const getDepartmentIcon = (dept: string | null) => {
    if (!dept) return null
    if (dept === 'Science') return <FlaskConical size={14} className="inline mr-1" />
    if (dept === 'Arts') return <Palette size={14} className="inline mr-1" />
    if (dept === 'Commercial') return <Briefcase size={14} className="inline mr-1" />
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">📚 Classes Management</h1>
          <p className="text-gray-600 mt-1">Manage all classes, departments, and class teachers</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Classes</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{classes.length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <BookOpen size={24} className="text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Students</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{totalStudents}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Users size={24} className="text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Assigned Teachers</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {new Set(classes.map(c => c.teacher_id).filter(id => id)).size}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <UserCheck size={24} className="text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search classes, teachers, or departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          
          <button
            onClick={() => {
              setEditingClass(null)
              setFormData({
                class_name: '',
                class_level: 'Primary',
                arm: '',
                department: '',
                teacher_id: '',
                max_students: 40,
                academic_session: sessions[0] || ''
              })
              setShowModal(true)
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors w-full md:w-auto justify-center"
          >
            <Plus size={20} />
            Add New Class
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-600">
            <GraduationCap size={48} className="mx-auto mb-4 animate-spin" />
            <p className="font-bold">Loading classes...</p>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <AlertCircle size={48} className="mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">No Classes Found</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first class</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700"
            >
              Create Class
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClasses.map((cls) => (
              <div key={cls.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-100">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {cls.class_name || 'Unnamed'} {cls.arm && `(${cls.arm})`}
                      </h3>
                      {cls.department && (
                        <p className="text-sm font-medium text-blue-600 mt-1 flex items-center">
                          {getDepartmentIcon(cls.department)} {cls.department} Department
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">{cls.academic_session}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      cls.class_level === 'Primary' ? 'bg-green-100 text-green-800' :
                      cls.class_level === 'JSS' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {cls.class_level === 'Primary' ? 'Primary' : cls.class_level === 'JSS' ? 'JSS' : 'SS'}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <UserCheck size={16} className="text-gray-500" />
                      <span>{cls.teacher_name || 'No teacher assigned'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Users size={16} className="text-gray-500" />
                      <span>{cls.student_count || 0} / {cls.max_students} students</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Capacity</span>
                      <span>{Math.round(((cls.student_count || 0) / cls.max_students) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          ((cls.student_count || 0) / cls.max_students) > 0.9 ? 'bg-red-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(((cls.student_count || 0) / cls.max_students) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleEdit(cls)}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-100 transition-colors"
                    >
                      <Edit size={16} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(cls.id)}
                      disabled={deletingClass === cls.id || (cls.student_count || 0) > 0}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={(cls.student_count || 0) > 0 ? "Cannot delete a class with students" : "Delete"}
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">
                {editingClass ? 'Edit Class' : 'Create New Class'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingClass(null)
                  setFormData({
                    class_name: '',
                    class_level: 'Primary',
                    arm: '',
                    department: '',
                    teacher_id: '',
                    max_students: 40,
                    academic_session: sessions[0] || ''
                  })
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class Name * <span className="text-xs text-gray-500">(e.g., Primary 3, JSS 2, SS 1)</span>
                </label>
                <input
                  type="text"
                  value={formData.class_name}
                  onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                  placeholder="e.g., Primary 3"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Level *</label>
                <select
                  value={formData.class_level}
                  onChange={(e) => {
                    const newLevel = e.target.value
                    setFormData({ 
                      ...formData, 
                      class_level: newLevel,
                      department: newLevel === 'SS' ? formData.department : '' 
                    })
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="Primary">Primary</option>
                  <option value="JSS">JSS (Junior Secondary)</option>
                  <option value="SS">SS (Senior Secondary)</option>
                </select>
              </div>

              {formData.class_level === 'SS' && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <label className="block text-sm font-bold text-blue-900 mb-1">Department *</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                  >
                    <option value="">Select Department...</option>
                    <option value="Science">🔬 Science</option>
                    <option value="Arts">🎨 Arts</option>
                    <option value="Commercial">💼 Commercial</option>
                  </select>
                  <p className="text-xs text-blue-700 mt-2">
                    This determines the specific subjects available for this class.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Arm (Optional)</label>
                <input
                  type="text"
                  value={formData.arm}
                  onChange={(e) => setFormData({ ...formData, arm: e.target.value.toUpperCase() })}
                  placeholder="A, B, C, etc."
                  maxLength={1}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 uppercase"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Teacher</label>
                <select
                  value={formData.teacher_id}
                  onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="">Select a teacher...</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Students</label>
                  <input
                    type="number"
                    value={formData.max_students}
                    onChange={(e) => setFormData({ ...formData, max_students: parseInt(e.target.value) || 40 })}
                    min="1"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Academic Session</label>
                  <select
                    value={formData.academic_session}
                    onChange={(e) => setFormData({ ...formData, academic_session: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  >
                    {sessions.map(session => (
                      <option key={session} value={session}>{session}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors"
                >
                  <Save size={18} />
                  {editingClass ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}