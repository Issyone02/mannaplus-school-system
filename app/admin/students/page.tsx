'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { 
  Users, Plus, Edit, Trash2, Search, X, Save, UserCheck,
  GraduationCap, Filter, Upload, Download, FileSpreadsheet,
  AlertCircle, CheckCircle, ChevronLeft, ChevronRight
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { findEmailConflict } from '@/lib/emailGuard'

interface ClassItem {
  id: string
  class_name: string
  arm: string | null
  department: string | null
  class_level: string
}

interface Student {
  id: string
  full_name: string
  admission_number: string
  date_of_birth: string
  gender: string
  class_id: string | null
  state: string
  address: string
  emergency_contact: string
  emergency_phone: string
  create_portal_account: boolean
  user_email: string
  active: boolean
  user_id: string | null
  classes?: ClassItem | null
}

export default function StudentsPage() {
  const router = useRouter()
  const { user } = useUser()
  
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(true)
  
  // ✅ Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(50) // Show 50 students per page
  const [totalCount, setTotalCount] = useState(0)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('')
  const [filterActive, setFilterActive] = useState<boolean | null>(null)
  
  const [showModal, setShowModal] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  const [activeTab, setActiveTab] = useState<'list' | 'bulk'>('list')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ total: 0, success: 0, failed: 0 })
  const [uploadReport, setUploadReport] = useState<{ success: number; skipped: string[] } | null>(null)

  const [formData, setFormData] = useState({
    full_name: '',
    admission_number: '',
    date_of_birth: '',
    gender: 'Male',
    class_id: '',
    state: '',
    address: '',
    emergency_contact: '',
    emergency_phone: '',
    create_portal_account: false,
    user_email: '',
    active: true,
    user_id: null as string | null,
  })

  useEffect(() => {
    fetchClasses()
  }, [])

  useEffect(() => {
    fetchStudents()
  }, [currentPage, filterClass, filterDepartment, filterActive, searchTerm])

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, class_name, arm, department, class_level')
        .order('class_level')
        .order('class_name')

      if (error) throw error
      setClasses(data || [])
    } catch (error: any) {
      console.error('Failed to fetch classes:', error.message)
    }
  }

  // ✅ PAGINATED fetch with server-side filtering (no DB join required)
  const fetchStudents = async () => {
    setLoading(true)
    try {
      // Tiny lookup for class info & department filtering (classes table is small)
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, class_name, arm, department, class_level')
      const classList = (classesData || []) as ClassItem[]

      let classIdsForDept: string[] | null = null
      if (filterDepartment) {
        classIdsForDept = classList
          .filter(c => (c.department || '').toLowerCase() === filterDepartment.toLowerCase())
          .map(c => c.id)
        if (classIdsForDept.length === 0) {
          setStudents([])
          setTotalCount(0)
          setLoading(false)
          return
        }
      }

      let query = supabase.from('students').select('*', { count: 'exact' })

      if (filterActive !== null) query = query.eq('active', filterActive)
      if (filterClass) query = query.eq('class_id', filterClass)
      if (classIdsForDept) query = query.in('class_id', classIdsForDept)
      if (searchTerm.trim()) {
        query = query.or(`full_name.ilike.%${searchTerm.trim()}%,admission_number.ilike.%${searchTerm.trim()}%`)
      }

      const from = (currentPage - 1) * pageSize
      const to = from + pageSize - 1
      query = query.order('created_at', { ascending: false }).range(from, to)

      const { data: studentsData, error: studentsError, count } = await query
      if (studentsError) throw studentsError

      // ✅ Attach class info in code (no foreign key needed)
      const enriched = (studentsData || []).map((s: any) => ({
        ...s,
        classes: classList.find(c => c.id === s.class_id) || null,
      }))

      setStudents(enriched as Student[])
      setTotalCount(count || 0)
    } catch (error: any) {
      toast.error('Failed to fetch students: ' + error.message)
      setStudents([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      let userId: string | null = formData.user_id || null

      if (formData.create_portal_account && formData.user_email) {
        // ✅ EMAIL UNIQUENESS GUARD (one email = one person)
        const conflict = await findEmailConflict(formData.user_email, { ignoreStudentId: editingStudent?.id })
        if (conflict) {
          toast.error(`Email conflict: ${formData.user_email} already belongs to ${conflict.person} (${conflict.role}). Each person needs a unique email.`)
          setSubmitting(false)
          return
        } // <-- CRITICAL: This closing brace was likely missing

        try {
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', formData.user_email)
            .single()

          if (existingUser) {
            userId = existingUser.id
          } else {
            const res = await fetch('/api/users/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                email: formData.user_email, 
                fullName: formData.full_name,
                role: 'student',
                phone: formData.emergency_phone || '' 
              })
            })
            
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to create portal user')
            userId = data.userId
          }
        } catch (clerkError: any) {
          toast.error('Portal Creation Error: ' + clerkError.message)
          setSubmitting(false)
          return
        }
      }

      const studentData = {
        full_name: formData.full_name.trim(),
        admission_number: formData.admission_number.trim(),
        date_of_birth: formData.date_of_birth,
        gender: formData.gender.toLowerCase(),
        class_id: formData.class_id || null,
        state: formData.state.trim(),
        address: formData.address.trim(),
        emergency_contact: formData.emergency_contact.trim(),
        emergency_phone: formData.emergency_phone.trim(),
        create_portal_account: formData.create_portal_account,
        user_email: formData.user_email.trim(),
        active: formData.active,
        user_id: userId,
      }

      if (editingStudent) {
        const { error } = await supabase.from('students').update(studentData).eq('id', editingStudent.id)
        if (error) throw error
        toast.success('Student updated successfully!')
      } else {
        const { error } = await supabase.from('students').insert([studentData])
        if (error) throw error
        toast.success('Student added successfully!')
      }

      setShowModal(false)
      setEditingStudent(null)
      setFormData({
        full_name: '', admission_number: '', date_of_birth: '', gender: 'Male',
        class_id: '', state: '', address: '', emergency_contact: '',
        emergency_phone: '', create_portal_account: false, user_email: '',
        active: true, user_id: null,
      })
      fetchStudents()
    } catch (error: any) {
      toast.error('Failed: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }
      

  const handleEdit = (student: Student) => {
    setEditingStudent(student)
    setFormData({
      full_name: student.full_name || '',
      admission_number: student.admission_number || '',
      date_of_birth: student.date_of_birth || '',
      gender: student.gender || 'Male',
      class_id: student.class_id || '',
      state: student.state || '',
      address: student.address || '',
      emergency_contact: student.emergency_contact || '',
      emergency_phone: student.emergency_phone || '',
      create_portal_account: student.create_portal_account || false,
      user_email: student.user_email || '',
      active: student.active ?? true,
      user_id: student.user_id || null,
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student? This cannot be undone.')) return
    try {
      const { error } = await supabase.from('students').delete().eq('id', id)
      if (error) throw error
      toast.success('Student deleted successfully!')
      fetchStudents()
    } catch (error: any) {
      toast.error('Failed to delete: ' + error.message)
    }
  }

  const formatClassName = (cls: ClassItem | null | undefined) => {
    if (!cls) return 'Unassigned'
    return `${cls.class_name} ${cls.arm ? `(${cls.arm})` : ''} ${cls.department ? `- ${cls.department}` : ''}`
  }

  const downloadTemplate = () => {
    const headers = ['Full Name', 'Admission Number', 'Date of Birth (YYYY-MM-DD)', 'Gender (Male/Female)', 'Class Name (e.g. Primary 3 or JSS 2)', 'State', 'Address', 'Emergency Contact Name', 'Emergency Phone', 'Student Portal Email (Optional)']
    const sampleData = [
      ['John Doe', 'MPLS/STU/001', '2015-03-15', 'Male', 'Primary 3', 'Lagos', '123 Main Street', 'Jane Doe (Mother)', '+234 801 234 5678', 'john.doe.student@mannaplus.com'],
      ['Mary Smith', 'MPLS/STU/002', '2014-07-22', 'Female', 'JSS 2', 'Ogun', '456 Oak Avenue', 'John Smith (Father)', '+234 802 345 6789', '']
    ]
    const csvContent = [headers.map(h => `"${h}"`).join(','), ...sampleData.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'students_bulk_upload_template.csv'
    link.click()
    toast.success('Template downloaded!')
  }

  const parseCsvLine = (line: string): string[] => {
    const out: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++ } else inQuotes = false
        } else cur += ch
      } else {
        if (ch === '"') inQuotes = true
        else if (ch === ',') { out.push(cur); cur = '' }
        else cur += ch
      }
    }
    out.push(cur)
    return out.map(s => s.trim())
  }

  const parseDate = (dateStr: string): string | null => {
    if (!dateStr) return null
    const clean = dateStr.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean
    const parts = clean.split(/[-/]/)
    if (parts.length === 3) {
      let d = parts[0], m = parts[1], y = parts[2]
      if (d.length === 4) { y = d; d = parts[2]; m = parts[1] }
      else if (y.length === 2) y = `20${y}`
      d = d.padStart(2, '0')
      m = m.padStart(2, '0')
      const formatted = `${y}-${m}-${d}`
      if (!isNaN(Date.parse(formatted))) return formatted
    }
    return clean
  }

  const resolveClass = (raw: string): ClassItem | null => {
    const input = raw.toLowerCase().replace(/\s+/g, ' ').trim()
    let found = classes.find(c => formatClassName(c).toLowerCase() === input)
    if (found) return found
    found = classes.find(c => c.class_name.toLowerCase() === input)
    if (found) return found
    const m = input.match(/(nursery|primary|jss|ss)\s*(\d+)/)
    if (!m) return null
    const level = m[1]
    const num = m[2]
    const candidates = classes.filter(c => c.class_name.toLowerCase().replace(/\s+/g, '') === `${level}${num}`)
    if (candidates.length === 1) return candidates[0]
    if (candidates.length > 1) {
      const armMatch = raw.match(/\(([^)]+)\)/)
      const deptMatch = /(science|arts|commercial)/i.exec(raw)
      return candidates.find(c =>
        (!armMatch || (c.arm || '').toLowerCase() === armMatch[1].toLowerCase().trim()) &&
        (!deptMatch || (c.department || '').toLowerCase() === deptMatch[1].toLowerCase())
      ) || null
    }
    return null
  }

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadProgress({ total: 0, success: 0, failed: 0 })
    setUploadReport(null)

    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter(line => line.trim())

      if (lines.length < 2) {
        toast.error('CSV file is empty or invalid')
        setUploading(false)
        return
      }

      const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
      const firstCells = parseCsvLine(lines[0]).map(norm)
      const looksLikeHeader = firstCells.some(c => c.includes('fullname') || c.includes('admissionnumber') || c.includes('admissionno'))

      let colIndex: Record<string, number>
      let dataRows: string[]

      if (looksLikeHeader) {
        const findCol = (aliases: string[]) => firstCells.findIndex(h => aliases.some(a => h === a || h.includes(a)))
        colIndex = {
          name: findCol(['fullname', 'studentname', 'name']),
          admission: findCol(['admissionnumber', 'admissionno', 'admission']),
          dob: findCol(['dateofbirth', 'dob', 'birthdate']),
          gender: findCol(['gender', 'sex']),
          class: findCol(['classname', 'class', 'grade']),
          state: findCol(['stateoforigin', 'state']),
          address: findCol(['homeaddress', 'address']),
          contact: findCol(['emergencycontactname', 'emergencycontact', 'contactname']),
          phone: findCol(['emergencyphone', 'contactphone', 'phone']),
          email: findCol(['studentportalemail', 'portalemail', 'email']),
        }
        dataRows = lines.slice(1)
      } else {
        colIndex = { name: 0, admission: 1, dob: 2, gender: 3, class: 4, state: 5, address: 6, contact: 7, phone: 8, email: 9 }
        dataRows = lines
      }

      setUploadProgress({ total: dataRows.length, success: 0, failed: 0 })

      const skipped: string[] = []
      let successCount = 0

      for (let i = 0; i < dataRows.length; i++) {
        const cells = parseCsvLine(dataRows[i])
        const lineNumber = looksLikeHeader ? i + 2 : i + 1
        const get = (key: string) => (colIndex[key] >= 0 ? (cells[colIndex[key]] || '').trim() : '')

        const fullName = get('name')
        const admissionNumber = get('admission')
        const className = get('class')

        if (!fullName || !admissionNumber || !className) {
          skipped.push(`Row ${lineNumber}: Missing name, admission number or class`)
          continue
        }

        const classObj = resolveClass(className)
        if (!classObj) {
          skipped.push(`Row ${lineNumber}: Class "${className}" not recognized — use exact names like "Primary 3" or "SS 2 (A)"`)
          continue
        }

        const genderRaw = get('gender').toLowerCase()
        const gender = genderRaw.startsWith('f') ? 'female' : 'male'

        let userId: string | null = null
        const portalEmail = get('email')
        if (portalEmail) {
          const conflict = await findEmailConflict(portalEmail)
          if (conflict) {
            skipped.push(`Row ${lineNumber}: email ${portalEmail} already belongs to ${conflict.person} (${conflict.role})`)
            continue
          }
          try {
            const { data: existingUser } = await supabase.from('users').select('id').eq('email', portalEmail).single()
            if (existingUser) {
              userId = existingUser.id
            } else {
              const res = await fetch('/api/users/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: portalEmail, fullName, role: 'student', phone: get('phone') })
              })
              const data = await res.json()
              if (res.ok) userId = data.userId
            }
          } catch (err) {
            console.error('Portal creation failed:', err)
          }
        }

        const studentData = {
          full_name: fullName,
          admission_number: admissionNumber,
          date_of_birth: parseDate(get('dob')),
          gender,
          class_id: classObj.id,
          state: get('state'),
          address: get('address'),
          emergency_contact: get('contact'),
          emergency_phone: get('phone'),
          create_portal_account: !!portalEmail,
          user_email: portalEmail,
          active: true,
          user_id: userId,
        }

        const { error } = await supabase.from('students').insert([studentData])
        if (error) {
          if (error.code === '23505') skipped.push(`Row ${lineNumber}: ${admissionNumber} already exists`)
          else skipped.push(`Row ${lineNumber}: ${error.message}`)
        } else {
          successCount++
        }

        if ((i + 1) % 10 === 0) {
          setUploadProgress({ total: dataRows.length, success: successCount, failed: i + 1 - successCount })
        }
      }

      setUploadProgress({ total: dataRows.length, success: successCount, failed: dataRows.length - successCount })
      setUploadReport({ success: successCount, skipped })

      if (successCount > 0) toast.success(`Imported ${successCount} student(s) successfully!`)
      if (skipped.length > 0) {
        toast.error(`${skipped.length} row(s) skipped — see the import report below.`)
        console.warn('Bulk upload skipped rows:', skipped)
      }

      fetchStudents()
    } catch (error: any) {
      toast.error('Failed to process file: ' + error.message)
    } finally {
      setUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  // Pagination helpers
  const totalPages = Math.ceil(totalCount / pageSize)
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Students Management</h1>
          <p className="text-gray-600 mt-1">Manage student records, classes, and portal access</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-600 font-medium">Total Students</p><p className="text-3xl font-bold text-gray-900 mt-1">{totalCount}</p></div>
              <div className="bg-blue-100 p-3 rounded-full"><Users size={24} className="text-blue-600" /></div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-600 font-medium">Active Students</p><p className="text-3xl font-bold text-gray-900 mt-1">{students.filter(s => s.active).length}</p></div>
              <div className="bg-green-100 p-3 rounded-full"><UserCheck size={24} className="text-green-600" /></div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-600 font-medium">Portal Accounts</p><p className="text-3xl font-bold text-gray-900 mt-1">{students.filter(s => s.create_portal_account).length}</p></div>
              <div className="bg-purple-100 p-3 rounded-full"><GraduationCap size={24} className="text-purple-600" /></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b border-gray-200">
            <button onClick={() => setActiveTab('list')} className={`px-6 py-4 font-bold text-sm transition-colors ${activeTab === 'list' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>
              <Users className="inline mr-2" size={18} /> Student List ({totalCount})
            </button>
            <button onClick={() => setActiveTab('bulk')} className={`px-6 py-4 font-bold text-sm transition-colors ${activeTab === 'bulk' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>
              <Upload className="inline mr-2" size={18} /> Bulk Upload
            </button>
          </div>
        </div>

        {activeTab === 'list' && (
          <>
            <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-col lg:flex-row gap-4 justify-between items-center">
              <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search name or admission no..." 
                    value={searchTerm} 
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setCurrentPage(1) // Reset to page 1 on search
                    }} 
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 w-full md:w-64" 
                  />
                </div>
                <div className="relative">
                  <Filter size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select 
                    value={filterClass} 
                    onChange={(e) => {
                      setFilterClass(e.target.value)
                      setCurrentPage(1)
                    }} 
                    className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 w-full md:w-48 appearance-none bg-white"
                  >
                    <option value="">All Classes</option>
                    {classes.map(cls => (<option key={cls.id} value={cls.id}>{formatClassName(cls)}</option>))}
                  </select>
                </div>
                <div className="relative">
                  <select 
                    value={filterDepartment} 
                    onChange={(e) => {
                      setFilterDepartment(e.target.value)
                      setCurrentPage(1)
                    }} 
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 w-full md:w-40 appearance-none bg-white"
                  >
                    <option value="">All Depts</option>
                    <option value="Science">Science</option>
                    <option value="Arts">Arts</option>
                    <option value="Commercial">Commercial</option>
                  </select>
                </div>
                <div className="relative">
                  <select 
                    value={filterActive === null ? 'all' : filterActive ? 'active' : 'inactive'} 
                    onChange={(e) => {
                      const val = e.target.value
                      setFilterActive(val === 'all' ? null : val === 'active')
                      setCurrentPage(1)
                    }} 
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 w-full md:w-32 appearance-none bg-white"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors w-full lg:w-auto justify-center">
                <Plus size={20} /> Add Student
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-600"><GraduationCap size={48} className="mx-auto mb-4 animate-spin" /><p className="font-bold">Loading students...</p></div>
            ) : students.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center"><Users size={48} className="mx-auto mb-4 text-gray-400" /><h3 className="text-lg font-bold text-gray-900 mb-2">No Students Found</h3></div>
            ) : (
              <>
                <div className="bg-white rounded-lg shadow overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Admission No</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Class & Dept</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Gender</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Portal</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {students.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.admission_number || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">{student.full_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${student.classes?.class_level === 'SS' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                              {formatClassName(student.classes)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{student.gender}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {student.create_portal_account ? (<span className="text-green-600 font-bold flex items-center gap-1"><UserCheck size={14} /> Yes</span>) : (<span className="text-gray-400">No</span>)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${student.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {student.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleEdit(student)} className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded" title="Edit"><Edit size={18} /></button>
                              <button onClick={() => handleDelete(student.id)} className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded" title="Delete"><Trash2 size={18} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ✅ Pagination Controls */}
                <div className="bg-white rounded-lg shadow p-4 mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-bold">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                    <span className="font-bold">{Math.min(currentPage * pageSize, totalCount)}</span> of{' '}
                    <span className="font-bold">{totalCount}</span> students
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => goToPage(pageNum)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                    </div>
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'bulk' && (
          <div className="bg-white rounded-lg shadow p-8">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Bulk Student Upload</h2>
                <p className="text-gray-600">Import up to 1000 students at once using a CSV file</p>
              </div>
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
                <h3 className="font-bold text-blue-900 mb-3 flex items-center"><FileSpreadsheet className="mr-2" size={20} /> Step 1: Download Template</h3>
                <p className="text-blue-800 mb-4">Download our CSV template to ensure your data is formatted correctly.</p>
                <button onClick={downloadTemplate} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors">
                  <Download size={20} /> Download CSV Template
                </button>
              </div>
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-6">
                <h3 className="font-bold text-green-900 mb-3 flex items-center"><Upload className="mr-2" size={20} /> Step 2: Upload Your CSV File</h3>
                <p className="text-green-800 mb-4">Fill in the template with your student data and upload it here.</p>
                <div className="mb-4">
                  <label className="block w-full">
                    <span className="sr-only">Choose CSV file</span>
                    <input type="file" accept=".csv" onChange={handleBulkUpload} disabled={uploading} className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-green-600 file:text-white hover:file:bg-green-700 disabled:opacity-50 cursor-pointer" />
                  </label>
                </div>
                {uploading && (
                  <div className="mt-4 bg-white rounded-lg p-4 border border-green-300">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-green-900">Uploading...</span>
                      <span className="text-sm text-green-700">{uploadProgress.success}/{uploadProgress.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-green-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${(uploadProgress.success / uploadProgress.total) * 100}%` }}></div>
                    </div>
                    <p className="text-xs text-green-700 mt-2">Success: {uploadProgress.success} | Failed: {uploadProgress.failed}</p>
                  </div>
                )}
                {uploadReport && (
                  <div className="mt-4 bg-white rounded-lg p-4 border border-gray-300">
                    <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <CheckCircle size={16} className="text-green-600" /> Import Report
                    </h4>
                    <p className="text-sm text-gray-700 mb-2">✅ {uploadReport.success} student(s) imported successfully.</p>
                    {uploadReport.skipped.length > 0 && (
                      <>
                        <p className="text-sm text-red-700 font-bold mb-1">⚠️ {uploadReport.skipped.length} row(s) skipped:</p>
                        <ul className="text-xs text-red-600 list-disc pl-5 max-h-40 overflow-y-auto">
                          {uploadReport.skipped.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-900">{editingStudent ? 'Edit Student' : 'Add New Student'}</h2>
              <button onClick={() => { setShowModal(false); setEditingStudent(null); setFormData({ full_name: '', admission_number: '', date_of_birth: '', gender: 'Male', class_id: '', state: '', address: '', emergency_contact: '', emergency_phone: '', create_portal_account: false, user_email: '', active: true, user_id: null }) }} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label><input type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Admission Number *</label><input type="text" value={formData.admission_number} onChange={(e) => setFormData({ ...formData, admission_number: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900" /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label><input type="date" value={formData.date_of_birth} onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Gender</label><select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"><option value="Male">Male</option><option value="Female">Female</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Class / Department *</label><select value={formData.class_id} onChange={(e) => setFormData({ ...formData, class_id: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"><option value="">Select Class...</option>{classes.map(cls => (<option key={cls.id} value={cls.id}>{formatClassName(cls)}</option>))}</select></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">State of Origin</label><input type="text" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Home Address</label><input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900" /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Name</label><input type="text" value={formData.emergency_contact} onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Emergency Phone</label><input type="text" value={formData.emergency_phone} onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900" /></div>
              </div>
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Student Portal Access</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input type="checkbox" id="create_student_portal" checked={formData.create_portal_account} onChange={(e) => setFormData({ ...formData, create_portal_account: e.target.checked })} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                    <label htmlFor="create_student_portal" className="ml-2 block text-sm text-gray-700">Create Student Portal Account</label>
                  </div>
                  {formData.create_portal_account && (
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Student Email *</label><input type="email" value={formData.user_email} onChange={(e) => setFormData({ ...formData, user_email: e.target.value })} required={formData.create_portal_account} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900" placeholder="student@example.com" /></div>
                  )}
                </div>
              </div>
              <div className="flex items-center">
                <input type="checkbox" id="active_status" checked={formData.active} onChange={(e) => setFormData({ ...formData, active: e.target.checked })} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                <label htmlFor="active_status" className="ml-2 block text-sm font-bold text-gray-700">Student is Active</label>
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"><Save size={18} /> {submitting ? 'Saving...' : (editingStudent ? 'Update' : 'Create')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}