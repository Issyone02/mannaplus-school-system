'use client'

import { useState, useEffect, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, FileText, Download, Printer, Edit, Trash2, X, Upload, ChevronDown, ChevronRight, ClipboardList } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { auditActions } from '@/lib/auditLog'
import UnifiedReportCard from '@/components/UnifiedReportCard'
import ReportCardEditor from '@/components/ReportCardEditor'
import { calculateClassPositions } from '@/lib/classPositions'
import { getSchoolAssets, getClassTeacherSignature } from '@/lib/schoolAssets'
import { enrichResultsWithPreviousTerms } from '@/lib/reportCardData'

interface Subject { id: string; name: string; code: string; class_id: string; department: string | null; category: string; term: string; session: string; active: boolean }
interface ClassItem { id: string; class_name: string; arm: string | null; department: string | null; class_level: string }

// ✅ DYNAMIC SESSION: School year starts in September
const getCurrentSession = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`
}

// ✅ DYNAMIC TERM: Based on term start months
const getCurrentTerm = () => {
  const month = new Date().getMonth() + 1
  if (month >= 9) return 'First Term'   // Sept – Dec
  if (month <= 3) return 'Second Term'  // Jan – Mar
  return 'Third Term'                   // Apr – Aug
}

export default function TeacherResultsPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()

  const [activeTab, setActiveTab] = useState<'bulk-results' | 'view' | 'subjects'>('bulk-results')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [results, setResults] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [teacherClassIds, setTeacherClassIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [selectedTerm, setSelectedTerm] = useState(getCurrentTerm())
  const [selectedSession, setSelectedSession] = useState(getCurrentSession())
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)

  const [printStudentId, setPrintStudentId] = useState<string | null>(null)
  const [editReportStudentId, setEditReportStudentId] = useState<string | null>(null)
  const [positionInfo, setPositionInfo] = useState<{ position_text: string; total_students: number } | null>(null)
  const [reportData, setReportData] = useState<any>(null)
  const [printResultsEnriched, setPrintResultsEnriched] = useState<any[]>([])
  const [signUrls, setSignUrls] = useState<{ teacher?: string | null; principal?: string | null; stamp?: string | null }>({})

  const [resultForm, setResultForm] = useState({ student_id: '', subject_id: '', ca_score: '', exam_score: '' })

  const termOptions = ['First Term', 'Second Term', 'Third Term']
  const generateSessionOptions = () => {
    const currentYear = new Date().getFullYear()
    const sessions = []
    for (let i = currentYear - 3; i <= currentYear + 1; i++) sessions.push(`${i}/${i + 1}`)
    return sessions
  }
  const sessionOptions = generateSessionOptions()

  const gradingSystem = [
    { grade: 'A1', min: 75, max: 100, remark: 'Excellent' },
    { grade: 'B2', min: 70, max: 74, remark: 'Very Good' },
    { grade: 'B3', min: 65, max: 69, remark: 'Good' },
    { grade: 'C4', min: 60, max: 64, remark: 'Credit' },
    { grade: 'C5', min: 55, max: 59, remark: 'Credit' },
    { grade: 'C6', min: 50, max: 54, remark: 'Credit' },
    { grade: 'D7', min: 45, max: 49, remark: 'Pass' },
    { grade: 'E8', min: 40, max: 44, remark: 'Pass' },
    { grade: 'F9', min: 0, max: 39, remark: 'Fail' },
  ]

  useEffect(() => {
    if (isLoaded && user) fetchTeacherClasses()
  }, [isLoaded, user])

  useEffect(() => {
    if (teacherClassIds.length > 0) {
      fetchStudents()
      fetchResults()
    }
  }, [teacherClassIds, selectedTerm, selectedSession])

  useEffect(() => {
    if (selectedClass) fetchSubjects()
  }, [selectedClass])

  // ✅ Report card extras (position, report data, signatures)
  useEffect(() => {
    const fetchReportExtras = async () => {
      if (!printStudentId) { setReportData(null); setPositionInfo(null); setSignUrls({}); return }
      const student = students.find(s => s.id === printStudentId)

      const { data } = await supabase.from('student_reports').select('*')
        .eq('student_id', printStudentId).eq('term', selectedTerm).eq('session', selectedSession).single()
      setReportData(data || null)

      if (student?.class_id) {
        const positions = await calculateClassPositions(student.class_id, selectedTerm, selectedSession)
        setPositionInfo(positions.get(printStudentId) || null)
      } else setPositionInfo(null)

      const assets = await getSchoolAssets()
      setSignUrls({
        teacher: student?.class_id ? await getClassTeacherSignature(student.class_id) : null,
        principal: assets.principal_signature?.url || null,
        stamp: assets.school_stamp?.url || null,
      })
    }
    fetchReportExtras()
  }, [printStudentId, students, selectedTerm, selectedSession])

  const fetchTeacherClasses = async () => {
    try {
      const email = user?.emailAddresses[0]?.emailAddress
      if (!email) { setLoading(false); return }

      const { data: teacher } = await supabase.from('teachers').select('id, form_class_id').eq('email', email).single()
      if (!teacher) { toast.error('Teacher account not found'); setLoading(false); return }

      const classIds = new Set<string>()
      if (teacher.form_class_id) classIds.add(teacher.form_class_id)

      const { data: assignments } = await supabase.from('teacher_assignments').select('class_id').eq('teacher_id', teacher.id)
      if (assignments) assignments.forEach(a => { if (a.class_id) classIds.add(a.class_id) })

      if (classIds.size > 0) {
        const { data: classesData } = await supabase.from('classes')
          .select('id, class_name, arm, department, class_level')
          .in('id', Array.from(classIds)).order('class_name')

        setClasses(classesData || [])
        setTeacherClassIds(Array.from(classIds))

        if (classesData && classesData.length > 0) {
          setSelectedClass(classesData[0].id)
          setSelectedDepartment(classesData[0].department || '') // ✅ Auto-apply department
        }
      }
    } catch (error) {
      console.error('Failed to load classes:', error)
      toast.error('Failed to load classes')
    } finally {
      setLoading(false)
    }
  }

  const fetchSubjects = async () => {
    const { data, error } = await supabase.from('subjects').select('*').eq('class_id', selectedClass).order('name')
    if (!error) setSubjects(data || [])
  }

  const fetchStudents = async () => {
    const { data, error } = await supabase.from('students').select('id, full_name, admission_number, class_id')
      .in('class_id', teacherClassIds).eq('active', true).order('full_name')
    if (!error) setStudents(data || [])
  }

  const fetchResults = async () => {
    try {
      const { data, error } = await supabase.from('results').select('*')
        .in('class_id', teacherClassIds).eq('term', selectedTerm).eq('session', selectedSession)
      if (error) throw error

      const studentsData = students
      const { data: subjectsData } = await supabase.from('subjects').select('id, name')

      const enriched = (data || []).map((r: any) => {
        const student = studentsData.find(s => s.id === r.student_id)
        const subject = (subjectsData || []).find(s => s.id === r.subject_id)
        return { ...r, student_name: student?.full_name || 'Unknown', admission_number: student?.admission_number || 'N/A', subject_name: subject?.name || 'Unknown' }
      })
      setResults(enriched)
    } catch (err: any) {
      console.error('fetchResults error:', err)
      setResults([])
    }
  }

  const getGrade = (total: number) => {
    const g = gradingSystem.find(g => total >= g.min && total <= g.max)
    return { grade: g?.grade || 'F9', remark: g?.remark || 'Fail' }
  }

  // ✅ SINGLE ENTRY / EDIT (upsert)
  const handleAddResult = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const ca = parseFloat(resultForm.ca_score) || 0
      const exam = parseFloat(resultForm.exam_score) || 0
      if (ca > 40) { toast.error('CA Score cannot exceed 40'); return }
      if (exam > 70) { toast.error('Exam Score cannot exceed 70'); return }

      const total = ca + exam
      const { grade, remark } = getGrade(total)
      const student = students.find(s => s.id === resultForm.student_id)

      const payload = {
        student_id: resultForm.student_id, subject_id: resultForm.subject_id, class_id: student?.class_id || selectedClass,
        term: selectedTerm, session: selectedSession, ca_score: ca, exam_score: exam, total_score: total, grade, remark, marked_by: 'teacher'
      }

      if (editingItem) {
        await supabase.from('results').update(payload).eq('id', editingItem.id)
        toast.success('Result updated!')
      } else {
        await supabase.from('results').upsert(payload, { onConflict: 'student_id,subject_id,term,session' })
        toast.success('Result entered!')
      }

      const email = user?.emailAddresses[0]?.emailAddress || ''
      const subjectName = subjects.find(s => s.id === resultForm.subject_id)?.name || 'Subject'
      await auditActions.teacherEnterResults(email, student?.class_id || selectedClass, subjectName, 1)

      setShowModal(false)
      setResultForm({ student_id: '', subject_id: '', ca_score: '', exam_score: '' })
      setEditingItem(null)
      fetchResults()
    } catch (error: any) { toast.error('Failed: ' + error.message) }
  }

  const handleDeleteResult = async (id: string) => {
    if (!confirm('Delete this result?')) return
    await supabase.from('results').delete().eq('id', id)
    const email = user?.emailAddresses[0]?.emailAddress || ''
    await auditActions.teacherDeleteResult(email, id)
    toast.success('Deleted!')
    fetchResults()
  }

  // ✅ BULK CSV UPLOAD
  const downloadResultTemplate = () => {
    const csv = 'Admission Number,Subject Code,CA Score,Exam Score\nMP/JSS/001,ENG,30,55\nMP/JSS/001,MTH,28,50'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'results_template.csv'; a.click()
    toast.success('Template downloaded!')
  }

  const handleBulkResultUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const csv = event.target?.result as string
        const lines = csv.split('\n').filter(line => line.trim())
        let saved = 0, updated = 0, failed = 0
        const errors: string[] = []

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim()
          if (i === 0 && line.toLowerCase().includes('admission')) continue
          const parts = line.split(',').map(p => p.replace(/^"|"$/g, '').trim())
          const [admissionNumber, subjectCode, caScore, examScore] = parts
          if (!admissionNumber || !subjectCode) { errors.push(`Row ${i + 1}: Missing data`); failed++; continue }

          const student = students.find(s => s.admission_number.toLowerCase() === admissionNumber.toLowerCase())
          if (!student) { errors.push(`Row ${i + 1}: Student "${admissionNumber}" NOT FOUND in your classes`); failed++; continue }

          const subject = subjects.find(s => s.code.toLowerCase() === subjectCode.toLowerCase() && s.class_id === student.class_id)
            || subjects.find(s => s.code.toLowerCase() === subjectCode.toLowerCase())
          if (!subject) { errors.push(`Row ${i + 1}: Subject "${subjectCode}" NOT FOUND`); failed++; continue }

          const ca = parseFloat(caScore) || 0, exam = parseFloat(examScore) || 0
          if (ca > 40 || exam > 70) { errors.push(`Row ${i + 1}: Score out of range`); failed++; continue }
          const total = ca + exam
          const { grade, remark } = getGrade(total)

          const payload = { student_id: student.id, subject_id: subject.id, class_id: student.class_id, term: selectedTerm, session: selectedSession, ca_score: ca, exam_score: exam, total_score: total, grade, remark, marked_by: 'teacher' }
          const { error } = await supabase.from('results').upsert(payload, { onConflict: 'student_id,subject_id,term,session' })
          if (error) { errors.push(`Row ${i + 1}: ${error.message}`); failed++ } else saved++
        }

        if (errors.length > 0) { console.error('Bulk errors:', errors); toast.error(`Upload finished with ${failed} errors. Check console.`) }
        else toast.success(`Successfully processed ${saved} results!`)

        const email = user?.emailAddresses[0]?.emailAddress || ''
        await auditActions.teacherEnterResults(email, selectedClass || 'Multiple', 'Bulk CSV Upload', saved)
        await fetchResults()
        setTimeout(() => setActiveTab('view'), 1000)
      } catch (error: any) { toast.error('Failed to process file: ' + error.message) }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // ✅ Class change auto-applies department
  const handleClassChange = (classId: string) => {
    setSelectedClass(classId)
    const cls = classes.find(c => c.id === classId)
    setSelectedDepartment(cls?.department || '')
    setExpandedStudent(null)
  }

  const filteredResults = results.filter(r => {
    const matchesSearch = r.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) || r.subject_name?.toLowerCase().includes(searchTerm.toLowerCase()) || r.admission_number?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesClass = !selectedClass || r.class_id === selectedClass
    const student = students.find(s => s.id === r.student_id)
    const cls = classes.find(c => c.id === (student?.class_id || r.class_id))
    const matchesDept = !selectedDepartment || cls?.department === selectedDepartment
    return matchesSearch && matchesClass && matchesDept
  })

  const filteredSubjects = subjects.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDept = !selectedDepartment || s.department === selectedDepartment || s.category === 'Core'
    return matchesSearch && matchesDept
  })

  const getStudentResults = (studentId: string) => filteredResults.filter(r => r.student_id === studentId)

  const uniqueDepartments = Array.from(new Set(classes.map(c => c.department).filter(Boolean))) as string[]
  const formatClassName = (cls: ClassItem) => `${cls.class_name} ${cls.arm ? `(${cls.arm})` : ''} ${cls.department ? `- ${cls.department}` : ''}`

  // ✅ Enrich print-modal results with real First/Second Term totals
  // MUST be before the early return to satisfy React's Rules of Hooks
  useEffect(() => {
    const enrich = async () => {
      if (!printStudentId) { setPrintResultsEnriched([]); return }
      const base = getStudentResults(printStudentId)
      const enriched = await enrichResultsWithPreviousTerms(base, printStudentId, selectedSession)
      setPrintResultsEnriched(enriched)
    }
    enrich()
  }, [printStudentId, selectedTerm, selectedSession, results])

  if (!isLoaded || loading) return <div className="p-8 text-gray-900 font-bold">Loading...</div>

  const printStudent = printStudentId ? students.find(s => s.id === printStudentId) : null
  const printStudentClass = printStudent ? classes.find(c => c.id === printStudent.class_id) : null
  const printStudentResults = printStudentId ? getStudentResults(printStudentId) : []

  const editStudent = editReportStudentId ? students.find(s => s.id === editReportStudentId) : null
  const editStudentClass = editStudent ? classes.find(c => c.id === editStudent.class_id) : null

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <Toaster position="top-right" />

      <button onClick={() => router.back()} className="flex items-center gap-2 mb-6 text-gray-700 hover:text-gray-900">
        <ArrowLeft size={20} /> Back to Dashboard
      </button>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Results Management</h1>
          <p className="text-gray-700">Enter & manage results for your classes</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setEditingItem(null); setResultForm({ student_id: '', subject_id: '', ca_score: '', exam_score: '' }); setShowModal(true) }} className="bg-green-600 text-white px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-green-700"><FileText size={18} />Single Entry</button>
        </div>
      </div>

      <div className="bg-white rounded shadow mb-6">
        <div className="flex border-b overflow-x-auto">
          <button onClick={() => setActiveTab('bulk-results')} className={`px-4 py-3 font-bold text-gray-900 whitespace-nowrap ${activeTab === 'bulk-results' ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-gray-700'}`}>Bulk Results</button>
          <button onClick={() => setActiveTab('view')} className={`px-4 py-3 font-bold text-gray-900 whitespace-nowrap ${activeTab === 'view' ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-gray-700'}`}>View Results</button>
          <button onClick={() => setActiveTab('subjects')} className={`px-4 py-3 font-bold text-gray-900 whitespace-nowrap ${activeTab === 'subjects' ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-gray-700'}`}>Subjects</button>
        </div>

        <div className="p-4">
          <div className="flex gap-4 mb-4 flex-wrap">
            <select value={selectedClass} onChange={(e) => handleClassChange(e.target.value)} className="p-2 border rounded text-gray-900">
              <option value="">All My Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{formatClassName(c)}</option>)}
            </select>
            {uniqueDepartments.length > 0 && (
              <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} className="p-2 border rounded text-gray-900">
                <option value="">All Departments</option>
                {uniqueDepartments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>
            )}
            <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} className="p-2 border rounded text-gray-900">{termOptions.map(t => <option key={t} value={t}>{t}</option>)}</select>
            <select value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)} className="p-2 border rounded text-gray-900">{sessionOptions.map(s => <option key={s} value={s}>{s}</option>)}</select>
            <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 p-2 border rounded text-gray-900" />
          </div>

          {activeTab === 'bulk-results' && (
            <div className="space-y-6">
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-green-900 mb-2">Bulk Result Entry - CSV Upload</h3>
                <p className="text-green-800 mb-4">Upload CSV to enter results for your students at once.</p>
                <div className="flex flex-wrap gap-4 items-center mb-4">
                  <button onClick={downloadResultTemplate} className="flex items-center space-x-2 bg-white border-2 border-green-300 text-green-700 px-4 py-2 rounded hover:bg-green-50 font-bold"><Download size={16} />Download Template</button>
                  <label className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-bold cursor-pointer"><Upload size={16} /><span>Upload CSV File</span><input type="file" accept=".csv" onChange={handleBulkResultUpload} className="hidden" /></label>
                </div>
                <div className="bg-white p-4 rounded border border-green-200">
                  <p className="font-bold text-green-900 mb-2">CSV Format:</p>
                  <code className="text-sm bg-green-100 px-2 py-1 rounded block">Admission Number,Subject Code,CA Score,Exam Score</code>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'view' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg"><p className="text-sm text-blue-600 font-medium">Total Students</p><p className="text-2xl font-bold text-blue-900">{new Set(filteredResults.map(r => r.student_id)).size}</p></div>
                <div className="bg-green-50 p-4 rounded-lg"><p className="text-sm text-green-600 font-medium">Total Results</p><p className="text-2xl font-bold text-green-900">{filteredResults.length}</p></div>
                <div className="bg-purple-50 p-4 rounded-lg"><p className="text-sm text-purple-600 font-medium">Avg Score</p><p className="text-2xl font-bold text-purple-900">{filteredResults.length > 0 ? (filteredResults.reduce((sum, r) => sum + r.total_score, 0) / filteredResults.length).toFixed(1) : '0'}</p></div>
                <div className="bg-orange-50 p-4 rounded-lg"><p className="text-sm text-orange-600 font-medium">Subjects</p><p className="text-2xl font-bold text-orange-900">{new Set(filteredResults.map(r => r.subject_id)).size}</p></div>
              </div>

              <div className="bg-white border rounded-lg overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-3 text-left text-gray-900 font-bold">Admission No</th>
                      <th className="text-gray-900 font-bold">Student Name</th>
                      <th className="text-gray-900 font-bold text-center">Total Subjects</th>
                      <th className="text-gray-900 font-bold text-center">Average</th>
                      <th className="text-gray-900 font-bold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(new Set(filteredResults.map(r => r.student_id))).map(studentId => {
                      const studentResults = getStudentResults(studentId)
                      const student = students.find(s => s.id === studentId)
                      const average = studentResults.reduce((sum, r) => sum + r.total_score, 0) / (studentResults.length || 1)
                      const isExpanded = expandedStudent === studentId
                      return (
                        <Fragment key={studentId}>
                          <tr className="border-b hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setExpandedStudent(isExpanded ? null : studentId)}>
                            <td className="p-3 text-gray-900 font-medium whitespace-nowrap">{student?.admission_number}</td>
                            <td className="p-3 text-gray-900">{student?.full_name}</td>
                            <td className="p-3 text-center text-gray-900">{studentResults.length}</td>
                            <td className="p-3 text-center"><span className={`px-2 py-1 rounded font-bold ${average >= 70 ? 'bg-green-100 text-green-800' : average >= 50 ? 'bg-blue-100 text-blue-800' : average >= 40 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{average.toFixed(1)}</span></td>
                            <td className="p-3 text-center">
                              <div className="flex justify-center gap-2" onClick={e => e.stopPropagation()}>
                                  <button onClick={() => setPrintStudentId(studentId)} className="text-purple-600 hover:text-purple-800" title="Print Report Card"><Printer size={16} /></button>
                                  <button onClick={() => setEditReportStudentId(studentId)} className="text-green-600 hover:text-green-800" title="Edit Report Card Data"><ClipboardList size={16} /></button>
                                  <button onClick={() => { const first = studentResults[0]; if (first) { setEditingItem(first); setResultForm({ student_id: first.student_id, subject_id: first.subject_id, ca_score: first.ca_score.toString(), exam_score: first.exam_score.toString() }); setShowModal(true) } }} className="text-blue-600 hover:text-blue-800" title="Edit Result"><Edit size={16} /></button>
                                </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={5} className="bg-gray-50 p-4 border-t">
                                <h4 className="font-bold text-gray-900 mb-3">{student?.full_name} - All Subjects ({studentResults.length})</h4>
                                <div className="overflow-x-auto">
                                  <table className="w-full min-w-[760px]text-sm">
                                    <thead className="bg-gray-100">
                                      <tr>
                                        <th className="p-2 text-left">Subject</th>
                                        {selectedTerm !== 'First Term' && <th className="text-center">1st Term</th>}
                                        {selectedTerm === 'Third Term' && <th className="text-center">2nd Term</th>}
                                        <th className="text-center">CA (30)</th>
                                        <th className="text-center">Exam (70)</th>
                                        <th className="text-center">Total</th>
                                        <th className="text-center">Grade</th>
                                        <th className="text-center">Remark</th>
                                        <th className="text-center">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {studentResults.map(result => (
                                        <tr key={result.id} className="border-t hover:bg-white">
                                          <td className="p-2 text-gray-900 font-medium">{result.subject_name}</td>
                                          {selectedTerm !== 'First Term' && <td className="text-center text-gray-600">{result.first_term_total || '-'}</td>}
                                          {selectedTerm === 'Third Term' && <td className="text-center text-gray-600">{result.second_term_total || '-'}</td>}
                                          <td className="text-center text-gray-900">{result.ca_score}</td>
                                          <td className="text-center text-gray-900">{result.exam_score}</td>
                                          <td className="text-center font-bold text-gray-900">{result.total_score}</td>
                                          <td className="text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${result.grade.startsWith('A') ? 'bg-green-100 text-green-800' : result.grade.startsWith('B') ? 'bg-blue-100 text-blue-800' : result.grade.startsWith('C') ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{result.grade}</span></td>
                                          <td className="text-center text-gray-700">{result.remark}</td>
                                          <td className="text-center">
                                            <div className="flex justify-center gap-2">
                                              <button onClick={() => { setEditingItem(result); setResultForm({ student_id: result.student_id, subject_id: result.subject_id, ca_score: result.ca_score.toString(), exam_score: result.exam_score.toString() }); setShowModal(true) }} className="text-blue-600 hover:text-blue-800"><Edit size={14} /></button>
                                              <button onClick={() => handleDeleteResult(result.id)} className="text-red-600 hover:text-red-800"><Trash2 size={14} /></button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
                {filteredResults.length === 0 && <div className="p-8 text-center text-gray-600"><FileText size={48} className="mx-auto text-gray-300 mb-2" /><p className="font-bold">No results found</p></div>}
              </div>
              {filteredResults.length > 0 && (
                <p className="md:hidden mt-2 text-xs text-gray-500 text-center">Scroll horizontally to view all columns</p>
              )}
            </div>
          )}

          {activeTab === 'subjects' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="p-2 text-left text-gray-900 font-bold">Name</th>
                    <th className="text-gray-900 font-bold">Code</th>
                    <th className="text-gray-900 font-bold">Category</th>
                    <th className="text-gray-900 font-bold">Department</th>
                    <th className="text-gray-900 font-bold">Term</th>
                    <th className="text-gray-900 font-bold">Session</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubjects.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-gray-600">No subjects found</td></tr> : filteredSubjects.map(s => (
                    <tr key={s.id} className="border-t hover:bg-gray-50">
                      <td className="p-2 text-gray-900">{s.name}</td>
                      <td className="text-gray-900">{s.code}</td>
                      <td><span className={`px-2 py-1 rounded text-xs font-bold ${s.category === 'Core' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}>{s.category}</span></td>
                      <td>{s.department ? <span className="px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-800">{s.department}</span> : <span className="text-gray-400">-</span>}</td>
                      <td className="text-gray-900">{s.term}</td>
                      <td className="text-gray-900">{s.session}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Single Entry / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{editingItem ? 'Edit Result' : 'Enter Single Result'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-700 hover:text-gray-900"><X size={24} /></button>
            </div>
            <form onSubmit={handleAddResult} className="space-y-3">
              <select value={resultForm.student_id} onChange={(e) => setResultForm({ ...resultForm, student_id: e.target.value, subject_id: '' })} required className="w-full p-2 border rounded text-gray-900">
                <option value="">Select Student</option>
                {(() => {
                  const base = students.filter(s => !selectedClass || s.class_id === selectedClass)
                  const editingStudent = editingItem ? students.find(s => s.id === editingItem.student_id) : null
                  const list = editingStudent && !base.some(s => s.id === editingStudent.id) ? [...base, editingStudent] : base
                  return list.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.admission_number})</option>)
                })()}
              </select>
              <select value={resultForm.subject_id} onChange={(e) => setResultForm({ ...resultForm, subject_id: e.target.value })} required className="w-full p-2 border rounded text-gray-900">
                <option value="">Select Subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="CA (0-40)" value={resultForm.ca_score} onChange={(e) => setResultForm({ ...resultForm, ca_score: e.target.value })} className="w-full p-2 border rounded text-gray-900" />
                <input type="number" placeholder="Exam (0-70)" value={resultForm.exam_score} onChange={(e) => setResultForm({ ...resultForm, exam_score: e.target.value })} className="w-full p-2 border rounded text-gray-900" />
              </div>
              <button type="submit" className="w-full bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700">{editingItem ? 'Update' : 'Save Result'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Unified Report Card Modal */}
      {printStudent && printResultsEnriched.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
            <button onClick={() => setPrintStudentId(null)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"><X size={24} /></button>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Generate Report Card</h3>
            <UnifiedReportCard
              student={{
                full_name: printStudent.full_name,
                admission_number: printStudent.admission_number,
                class_name: printStudentClass ? formatClassName(printStudentClass) : 'Unknown',
                position: positionInfo ? `${positionInfo.position_text} of ${positionInfo.total_students}` : (reportData?.position_in_class || '-'),
                no_in_class: reportData?.total_students_in_class || positionInfo?.total_students || '-'
              }}
              results={printResultsEnriched}
              session={selectedSession}
              term={selectedTerm}
              attendance={{
                opened: reportData?.attendance_opened ?? 0,
                present: reportData?.attendance_present ?? 0,
                punctual: reportData?.attendance_punctual ?? 0,
                beg_term: reportData?.term_begins || '6th April 2026',
                end_term: reportData?.term_ends || '6th July 2026',
                next_term: reportData?.next_term_begins || 'To be announced'
              }}
              conductRatings={reportData?.conduct_ratings || {}}
              physicalSkills={reportData?.physical_skills || {}}
              healthComment={reportData?.health_comment || 'Student is fit and healthy. No known medical conditions.'}
              teacherComment={reportData?.teacher_comment || printStudentResults[0]?.teacher_comment || 'Good performance'}
              principalComment={reportData?.principal_comment || printStudentResults[0]?.principal_comment || 'Keep it up'}
              teacherSignatureUrl={signUrls.teacher}
              principalSignatureUrl={signUrls.principal}
              stampUrl={signUrls.stamp}
              teacherDate={reportData?.teacher_date || null}
              headTeacherDate={reportData?.head_teacher_date || null}
            />
          </div>
        </div>
      )}

      {/* Report Card Data Editor Modal */}
      {editStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100] md:left-64">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
            <button onClick={() => setEditReportStudentId(null)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"><X size={24} /></button>
            <ReportCardEditor
              studentId={editStudent.id}
              classId={editStudent.class_id}
              studentName={editStudent.full_name}
              admissionNumber={editStudent.admission_number}
              className={editStudentClass ? formatClassName(editStudentClass) : ''}
              term={selectedTerm}
              session={selectedSession}
              userRole="teacher"
            />
          </div>
        </div>
      )}
    </div>
  )
}