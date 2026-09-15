'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, FileText, Download, Printer, Edit, Trash2, X, Upload, ClipboardList, RefreshCw } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import UnifiedReportCard from '@/components/UnifiedReportCard'
import ReportCardEditor from '@/components/ReportCardEditor'
import { calculateClassPositions } from '@/lib/classPositions'
import { getSchoolAssets, getClassTeacherSignature } from '@/lib/schoolAssets'
import { enrichResultsWithPreviousTerms } from '@/lib/reportCardData'

interface Subject { id: string; name: string; code: string; class_id: string; department: string | null; category: string; term: string; session: string; active: boolean }
interface Result { id: string; student_id: string; student_name: string; admission_number: string; subject_id: string; subject_name: string; class_id: string; department: string | null; term: string; session: string; ca_score: number; exam_score: number; total_score: number; grade: string; remark: string; first_term_total?: number; second_term_total?: number; teacher_comment?: string; principal_comment?: string }
interface Student { id: string; full_name: string; admission_number: string; class_id: string; department: string | null }
interface ClassItem { id: string; class_name: string; arm: string | null; department: string | null; class_level: string }

export default function ResultsPage() {
  const [activeTab, setActiveTab] = useState<'bulk-results' | 'view' | 'subjects' | 'bulk-subjects'>('bulk-results')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [results, setResults] = useState<Result[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'subject' | 'result'>('subject')
  const [editingItem, setEditingItem] = useState<any>(null)
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('First Term')
  const [selectedSession, setSelectedSession] = useState('2025/2026')
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)
  
  const [printStudentId, setPrintStudentId] = useState<string | null>(null)
  const [positionInfo, setPositionInfo] = useState<{ position_text: string; total_students: number } | null>(null)
  const [editReportStudentId, setEditReportStudentId] = useState<string | null>(null)
  const [reportData, setReportData] = useState<any>(null)
  const [printResultsEnriched, setPrintResultsEnriched] = useState<Result[]>([])

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [viewLimit, setViewLimit] = useState(50)

  // ✅ Debounce search (filter 300ms after typing stops) + reset pagination on filter change
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchTerm); setViewLimit(50) }, 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  useEffect(() => { setViewLimit(50) }, [selectedClass, selectedDepartment, selectedTerm, selectedSession])

  const [ signUrls, setSignUrls ] = useState<{ teacher?: string | null; principal?: string | null; stamp?: string |null }>({})

  useEffect(() => {
    const fetchReportData = async () => {
      if (!printStudentId) { setReportData(null); return }
      const { data } = await supabase
        .from('student_reports')
        .select('*')
        .eq('student_id', printStudentId)
        .eq('term', selectedTerm)
        .eq('session', selectedSession)
        .single()
      setReportData(data || null)
    }
    fetchReportData()
  }, [printStudentId, selectedTerm, selectedSession])

  useEffect(() => {
    const fetchPosition = async () => {
      if (!printStudentId) { setPositionInfo(null); return }
      const student = students.find(s => s.id === printStudentId)
      if (!student?.class_id) { setPositionInfo(null); return }
      const positions = await calculateClassPositions(student.class_id, selectedTerm, selectedSession)
      setPositionInfo(positions.get(printStudentId) || null)
    }
    fetchPosition()
  }, [printStudentId, selectedTerm, selectedSession, students])

  // ✅ Fetch signatures & stamp for the report card
  useEffect(() => {
    const fetchSignatures = async () => {
      if (!printStudentId) { setSignUrls({}); return }
      const student = students.find(s => s.id === printStudentId)
      const assets = await getSchoolAssets()
      setSignUrls({
        teacher: student?.class_id ? await getClassTeacherSignature(student.class_id) : null,
        principal: assets.principal_signature?.url || null,
        stamp: assets.school_stamp?.url || null,
      })
    }
    fetchSignatures()
  }, [printStudentId, students])

  const termOptions = ['First Term', 'Second Term', 'Third Term']
  const generateSessionOptions = () => {
    const currentYear = new Date().getFullYear()
    const sessions = []
    for (let i = currentYear - 2; i <= currentYear + 5; i++) sessions.push(`${i}/${i + 1}`)
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

  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', class_id: '', department: '', category: 'Core', term: 'First Term', session: '2025/2026', active: true })
  const [resultForm, setResultForm] = useState({ student_id: '', subject_id: '', ca_score: '', exam_score: '' })

  useEffect(() => { fetchClasses(); fetchData() }, [])

  const fetchClasses = async () => {
    const { data, error } = await supabase.from('classes').select('id, class_name, arm, department, class_level').order('class_level').order('class_name')
    if (error) console.error('Failed to fetch classes:', error)
    else setClasses(data || [])
  }

  const fetchData = async () => {
    await Promise.all([fetchSubjects(), fetchStudents()])
    setLoading(false)
  }

  // ✅ Refetch results only when the session changes (keeps payload small)
  useEffect(() => { fetchResults() }, [selectedSession])

  const fetchSubjects = async () => {
    const { data, error } = await supabase.from('subjects').select('*').order('name')
    if (error) toast.error('Failed: ' + error.message)
    else setSubjects(data || [])
  }

  const fetchResults = async () => {
    try {
      // ✅ OPTIMIZED: one filtered query, joins done by the database (no full-table downloads)
      const { data, error } = await supabase
        .from('results')
        .select(`*, student:students(full_name, admission_number), subject:subjects(name, department)`)
        .eq('session', selectedSession)
        .order('created_at', { ascending: false })
      if (error) throw error

      // ✅ Tiny lookup for class departments (no foreign key needed)
      const { data: classesData } = await supabase.from('classes').select('id, department')
      const classDept = new Map((classesData || []).map((c: any) => [c.id, c.department]))

      const enriched = (data || []).map((r: any) => ({
        ...r,
        student_name: r.student?.full_name || 'Unknown',
        admission_number: r.student?.admission_number || 'N/A',
        subject_name: r.subject?.name || 'Unknown',
        department: classDept.get(r.class_id) || r.subject?.department || null,
        first_term_total: r.first_term_total || 0,
        second_term_total: r.second_term_total || 0,
        teacher_comment: r.teacher_comment || '',
        principal_comment: r.principal_comment || '',
      }))
      setResults(enriched)
    } catch (err: any) {
      console.error('Unexpected error in fetchResults:', err)
      setResults([])
    }
  }

  const fetchStudents = async () => {
    try {
      const { data: studentsData, error: studentsError } = await supabase.from('students').select('id, full_name, admission_number, class_id')
      if (studentsError) throw studentsError
      const { data: classesData } = await supabase.from('classes').select('id, department, class_level')
      const enriched = (studentsData || []).map(s => {
        const cls = (classesData || []).find(c => c.id === s.class_id)
        return { ...s, department: cls?.department || null, class_level: cls?.class_level || null }
      })
      setStudents(enriched)
    } catch (err: any) {
      console.error('Unexpected error in fetchStudents:', err)
      setStudents([])
    }
  }

  const getGrade = (total: number) => {
    const g = gradingSystem.find(g => total >= g.min && total <= g.max)
    return { grade: g?.grade || 'F9', remark: g?.remark || 'Fail' }
  }

  // ✅ Sync ONE new subject to every student (creates 0-score rows so it appears on report cards)
  const syncSubjectToAllStudents = async (subjectId: string, classId: string) => {
    toast.loading('Syncing subject to all students...', { id: 'sync' })
    try {
      const studentsInClass = students.filter(s => s.class_id === classId)
      if (studentsInClass.length === 0) {
        toast.dismiss('sync')
        toast.error('No students found in this class')
        return
      }

      // Find students who already have this subject (avoid duplicates without needing a constraint)
      const { data: existing } = await supabase
        .from('results')
        .select('student_id')
        .eq('subject_id', subjectId)
        .eq('term', selectedTerm)
        .eq('session', selectedSession)

      const existingIds = new Set((existing || []).map((r: any) => r.student_id))
      const missing = studentsInClass.filter(s => !existingIds.has(s.id))

      if (missing.length === 0) {
        toast.success('All students already have this subject!', { id: 'sync' })
        return
      }

      const payloads = missing.map(s => ({
        student_id: s.id,
        subject_id: subjectId,
        class_id: classId,
        term: selectedTerm,
        session: selectedSession,
        ca_score: 0,
        exam_score: 0,
        total_score: 0,
        grade: 'F9',
        remark: 'Fail',
        marked_by: 'admin_sync'
      }))

      const { error } = await supabase.from('results').insert(payloads)
      if (error) throw error

      toast.success(`Subject automatically added to ${missing.length} students' report cards!`, { id: 'sync' })
      await fetchResults()
    } catch (error: any) {
      console.error('Sync error:', error)
      toast.error('Failed to sync: ' + error.message, { id: 'sync' })
    }
  }

  // ✅ Sync ALL subjects of the selected class to ALL students (one-click fix for any missing rows)
  const syncAllSubjectsToStudents = async () => {
    if (!selectedClass) {
      toast.error('Please select a class first')
      return
    }
    toast.loading('Syncing all subjects to students...', { id: 'syncall' })
    try {
      const classSubjects = subjects.filter(s => s.class_id === selectedClass)
      const studentsInClass = students.filter(s => s.class_id === selectedClass)

      if (classSubjects.length === 0 || studentsInClass.length === 0) {
        toast.dismiss('syncall')
        toast.error('No subjects or students found for this class')
        return
      }

      const { data: existing } = await supabase
        .from('results')
        .select('student_id, subject_id')
        .eq('class_id', selectedClass)
        .eq('term', selectedTerm)
        .eq('session', selectedSession)

      const existingKeys = new Set((existing || []).map((r: any) => `${r.student_id}|${r.subject_id}`))

      const payloads: any[] = []
      studentsInClass.forEach(st => {
        classSubjects.forEach(sub => {
          if (!existingKeys.has(`${st.id}|${sub.id}`)) {
            payloads.push({
              student_id: st.id,
              subject_id: sub.id,
              class_id: selectedClass,
              term: selectedTerm,
              session: selectedSession,
              ca_score: 0,
              exam_score: 0,
              total_score: 0,
              grade: 'F9',
              remark: 'Fail',
              marked_by: 'admin_sync'
            })
          }
        })
      })

      if (payloads.length === 0) {
        toast.success('All students already have all subjects!', { id: 'syncall' })
        return
      }

      const { error } = await supabase.from('results').insert(payloads)
      if (error) throw error

      toast.success(`Created ${payloads.length} missing result rows. Report cards updated!`, { id: 'syncall' })
      await fetchResults()
    } catch (error: any) {
      console.error('Sync-all error:', error)
      toast.error('Failed to sync: ' + error.message, { id: 'syncall' })
    }
  }

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = { ...subjectForm, department: subjectForm.category === 'Core' ? null : subjectForm.department || null }
      if (editingItem) {
        await supabase.from('subjects').update(payload).eq('id', editingItem.id)
        toast.success('Subject updated!')
      } else {
        // ✅ Insert and get the new ID back
        const { data, error } = await supabase.from('subjects').insert([payload]).select().single()
        if (error) throw error
        
        toast.success('Subject added!')
        
        // ✅ Automatically sync this new subject to all students in the class
        if (data && data.id) {
          await syncSubjectToAllStudents(data.id, payload.class_id)
        }
      }
      setShowModal(false)
      setSubjectForm({ name: '', code: '', class_id: '', department: '', category: 'Core', term: 'First Term', session: '2025/2026', active: true })
      setEditingItem(null)
      fetchSubjects()
    } catch (error: any) { toast.error('Failed: ' + error.message) }
  }

  const handleAddResult = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const ca = parseFloat(resultForm.ca_score) || 0
      const exam = parseFloat(resultForm.exam_score) || 0
      
      // ✅ VALIDATION: Enforce Nigerian Standard limits
      if (ca > 40) {
        toast.error('CA Score cannot exceed 40')
        return
      }
      if (exam > 70) {
        toast.error('Exam Score cannot exceed 70')
        return
      }

      const total = ca + exam
      const { grade, remark } = getGrade(total)
      const payload = {
        student_id: resultForm.student_id, subject_id: resultForm.subject_id, class_id: selectedClass,
        term: selectedTerm, session: selectedSession, ca_score: ca, exam_score: exam, total_score: total, grade, remark, marked_by: 'admin'
      }
      if (editingItem) {
        await supabase.from('results').update(payload).eq('id', editingItem.id)
        toast.success('Result updated!')
      } else {
        await supabase.from('results').insert([payload])
        toast.success('Result entered!')
      }
      setShowModal(false)
      setResultForm({ student_id: '', subject_id: '', ca_score: '', exam_score: '' })
      setEditingItem(null)
      fetchResults()
    } catch (error: any) { toast.error('Failed: ' + error.message) }
  }

  const handleDeleteSubject = async (id: string) => {
    if (!confirm('Delete?')) return
    await supabase.from('subjects').delete().eq('id', id)
    toast.success('Deleted!')
    fetchSubjects()
  }

  const handleDeleteResult = async (id: string) => {
    if (!confirm('Delete?')) return
    await supabase.from('results').delete().eq('id', id)
    toast.success('Deleted!')
    fetchResults()
  }

  const filteredResults = results.filter(r => {
    const matchesSearch = r.student_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) || r.subject_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) || r.admission_number?.toLowerCase().includes(debouncedSearch.toLowerCase())
    const resultClassId = r.class_id?.toString() || ''
    const filterClassId = selectedClass?.toString() || ''
    const matchesClass = filterClassId === '' || resultClassId === filterClassId
    const resultDept = r.department || ''
    const filterDept = selectedDepartment || ''
    const matchesDept = filterDept === '' || resultDept === filterDept
    return matchesSearch && matchesClass && matchesDept
  })

  const filteredSubjects = subjects.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || s.code.toLowerCase().includes(debouncedSearch.toLowerCase())
    const matchesClass = selectedClass ? s.class_id === selectedClass : true
    const matchesDept = selectedDepartment ? s.department === selectedDepartment : true
    return matchesSearch && matchesClass && matchesDept
  })

  const getStudentResults = (studentId: string) => {
    return results.filter(r => {
      const resultClassId = r.class_id?.toString() || ''
      const filterClassId = selectedClass?.toString() || ''
      return r.student_id === studentId && (filterClassId === '' || resultClassId === filterClassId) && r.term === selectedTerm && r.session === selectedSession
    })
  }

  // ✅ Enrich print-modal results with real First/Second Term totals
  useEffect(() => {
    const enrich = async () => {
      if (!printStudentId) { setPrintResultsEnriched([]); return }
      const base = getStudentResults(printStudentId)
      const enriched = await enrichResultsWithPreviousTerms(base, printStudentId, selectedSession)
      setPrintResultsEnriched(enriched)
    }
    enrich()
  }, [printStudentId, selectedTerm, selectedSession, results])

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
          if (!admissionNumber || !subjectCode) { errors.push(`Row ${i + 1}: Missing Admission Number or Subject Code`); failed++; continue }
          const student = students.find(s => s.admission_number.toLowerCase() === admissionNumber.toLowerCase())
          if (!student) { errors.push(`Row ${i + 1}: Student "${admissionNumber}" NOT FOUND`); failed++; continue }
          const subject = subjects.find(s => {
            const codeMatch = s.code.toLowerCase() === subjectCode.toLowerCase()
            const classMatch = s.class_id.toLowerCase() === selectedClass.toLowerCase()
            const deptMatch = s.category === 'Core' || s.department === student.department
            return codeMatch && classMatch && deptMatch
          })
          if (!subject) { errors.push(`Row ${i + 1}: Subject code "${subjectCode}" NOT FOUND`); failed++; continue }
          const ca = parseFloat(caScore) || 0; const exam = parseFloat(examScore) || 0; const total = ca + exam
          const { grade, remark } = getGrade(total)
          const payload = { student_id: student.id, subject_id: subject.id, class_id: selectedClass, term: selectedTerm, session: selectedSession, ca_score: ca, exam_score: exam, total_score: total, grade, remark, marked_by: 'admin', first_term_total: selectedTerm === 'First Term' ? total : 0, second_term_total: 0, teacher_comment: 'Good effort', principal_comment: 'Keep it up' }
          const { data, error } = await supabase.from('results').insert([payload]).select()
          if (error) {
            if (error.code === '23505' || error.message.includes('duplicate')) {
              const { error: updateError } = await supabase.from('results').update({ ca_score: ca, exam_score: exam, total_score: total, grade, remark, updated_at: new Date().toISOString() }).eq('student_id', student.id).eq('subject_id', subject.id).eq('term', selectedTerm).eq('session', selectedSession)
              if (updateError) { errors.push(`Row ${i + 1}: Update failed`); failed++ } else { updated++; saved++ }
            } else { errors.push(`Row ${i + 1}: DB error - ${error.message}`); failed++ }
          } else { saved++ }
        }
        if (errors.length > 0) toast.error(`Upload finished with ${failed} errors. Check console.`)
        else toast.success(`Successfully processed! Saved: ${saved}, Updated: ${updated}`)
        await fetchResults()
        setTimeout(() => setActiveTab('view'), 1000)
      } catch (error: any) { toast.error('Failed to process file: ' + error.message) }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const downloadSubjectTemplate = () => {
    const csv = 'name,code,class_id,category,department,term,session,active\nEnglish Language,ENG,JSS1,Core,,First Term,2025/2026,true'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'subjects_template.csv'; a.click()
    toast.success('Template downloaded!')
  }

  const handleBulkSubjectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const csv = event.target?.result as string
        const lines = csv.split('\n').slice(1)

        // ✅ Helper: accepts either a UUID or a class name like "Primary 3" in the CSV
        const resolveClassId = (raw: string) => {
          if (!raw) return ''
          const exact = classes.find(c => c.id === raw)
          if (exact) return exact.id
          const byName = classes.find(c =>
            c.class_name.toLowerCase() === raw.toLowerCase() ||
            `${c.class_name} ${c.arm || ''}`.trim().toLowerCase() === raw.toLowerCase()
          )
          return byName?.id || raw
        }

        const newSubjects = lines.map(line => {
          const [name, code, class_id, category, department, term, session, active] = line.split(',')
          return {
            name: name?.trim(),
            code: code?.trim(),
            class_id: resolveClassId(class_id?.trim()),
            category: category?.trim() || 'Core',
            department: (category?.trim() === 'Core' ? null : department?.trim()) || null,
            term: term?.trim() || selectedTerm,
            session: session?.trim() || selectedSession,
            active: active?.trim() === 'true'
          }
        }).filter(s => s.name && s.code && s.class_id)

        if (newSubjects.length === 0) { toast.error('No valid subjects'); return }

        // ✅ FIXED: upsert on the unique constraint so duplicates UPDATE instead of crashing
        const { error } = await supabase
          .from('subjects')
          .upsert(newSubjects, { onConflict: 'code,class_id,term,session' })

        if (error) throw error

        toast.success(`${newSubjects.length} subjects added/updated!`)
        await fetchSubjects()

        // ✅ Automatically push them onto every student's report card with 0 scores
        await syncAllSubjectsToStudents()
      } catch (error: any) { toast.error('Failed: ' + error.message) }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  
  const uniqueDepartments = Array.from(new Set(classes.map(c => c.department).filter(Boolean))) as string[]

  const uniqueStudentIds = Array.from(new Set(filteredResults.map(r => r.student_id)))

  if (loading) return <div className="p-8 text-gray-900 font-bold">Loading...</div>

  const printStudent = printStudentId ? students.find(s => s.id === printStudentId) : null
  const printStudentClass = printStudent ? classes.find(c => c.id === printStudent.class_id) : null
  const printStudentResults = printStudentId ? getStudentResults(printStudentId) : []

  const editStudent = editReportStudentId ? students.find(s => s.id === editReportStudentId) : null
  const editStudentClass = editStudent ? classes.find(c => c.id === editStudent.class_id) : null

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Results Management</h1>
          <p className="text-gray-700">Bulk entry for thousands of students</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button onClick={() => syncAllSubjectsToStudents()} className="bg-purple-600 text-white px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-purple-700"><RefreshCw size={18}/>Sync Subjects to Students</button>
          <button onClick={() => { setModalType('result'); setEditingItem(null); setResultForm({ student_id: '', subject_id: '', ca_score: '', exam_score: '' }); setShowModal(true) }} className="bg-green-600 text-white px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-green-700"><FileText size={18}/>Single Entry</button>
          <button onClick={() => { setModalType('subject'); setEditingItem(null); setShowModal(true) }} className="bg-blue-600 text-white px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-blue-700"><Plus size={18}/>Add Subject</button>
        </div>
      </div>

      <div className="bg-white rounded shadow mb-6">
        <div className="flex border-b overflow-x-auto">
          <button onClick={() => setActiveTab('bulk-results')} className={`px-4 py-3 font-bold text-gray-900 whitespace-nowrap ${activeTab === 'bulk-results' ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-gray-700'}`}>Bulk Results</button>
          <button onClick={() => setActiveTab('view')} className={`px-4 py-3 font-bold text-gray-900 whitespace-nowrap ${activeTab === 'view' ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-gray-700'}`}>View Results</button>
          <button onClick={() => setActiveTab('subjects')} className={`px-4 py-3 font-bold text-gray-900 whitespace-nowrap ${activeTab === 'subjects' ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-gray-700'}`}>Subjects</button>
          <button onClick={() => setActiveTab('bulk-subjects')} className={`px-4 py-3 font-bold text-gray-900 whitespace-nowrap ${activeTab === 'bulk-subjects' ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-gray-700'}`}>Bulk Subjects</button>
        </div>

        <div className="p-4">
          <div className="flex gap-4 mb-4 flex-wrap">
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="p-2 border rounded text-gray-900">
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.class_name} {c.arm ? `(${c.arm})` : ''} {c.department ? `- ${c.department}` : ''}</option>)}
            </select>
            {uniqueDepartments.length > 0 && <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} className="p-2 border rounded text-gray-900"><option value="">All Departments</option>{uniqueDepartments.map(dept => <option key={dept} value={dept}>{dept}</option>)}</select>}
            <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} className="p-2 border rounded text-gray-900">{termOptions.map(t => <option key={t} value={t}>{t}</option>)}</select>
            <select value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)} className="p-2 border rounded text-gray-900">{sessionOptions.map(s => <option key={s} value={s}>{s}</option>)}</select>
            <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 p-2 border rounded text-gray-900" />
          </div>

          {activeTab === 'bulk-results' && (
            <div className="space-y-6">
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-green-900 mb-2">Bulk Result Entry - CSV Upload</h3>
                <p className="text-green-800 mb-4">Upload CSV to enter results for ALL students at once.</p>
                <div className="flex flex-wrap gap-4 items-center mb-4">
                  <button onClick={downloadResultTemplate} className="flex items-center space-x-2 bg-white border-2 border-green-300 text-green-700 px-4 py-2 rounded hover:bg-green-50 font-bold"><Download size={16}/>Download Template</button>
                  <label className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-bold cursor-pointer"><Upload size={16}/><span>Upload CSV File</span><input type="file" accept=".csv" onChange={handleBulkResultUpload} className="hidden"/></label>
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

              <div className="bg-white border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-3 text-left text-gray-900 font-bold">Admission No</th>
                      <th className="text-gray-900 font-bold">Student Name</th>
                      <th className="text-gray-900 font-bold text-center">Total Subjects</th>
                      <th className="text-gray-900 font-bold text-center">Average</th>
                      <th className="text-gray-900 font-bold text-center">Position</th>
                      <th className="text-gray-900 font-bold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uniqueStudentIds.slice(0, viewLimit).map(studentId => {
                      const studentResults = getStudentResults(studentId)
                      const student = students.find(s => s.id === studentId)
                      const average = studentResults.reduce((sum, r) => sum + r.total_score, 0) / (studentResults.length || 1)
                      const isExpanded = expandedStudent === studentId
                      return (
                        <tr key={studentId}>
                          <td colSpan={6}>
                            <div className="border-b hover:bg-gray-50 cursor-pointer transition-colors p-3 grid grid-cols-6 items-center" onClick={() => setExpandedStudent(isExpanded ? null : studentId)}>
                              <div className="text-gray-900 font-medium">{student?.admission_number}</div>
                              <div className="text-gray-900">{student?.full_name}</div>
                              <div className="text-center text-gray-900">{studentResults.length}</div>
                              <div className="text-center"><span className={`px-2 py-1 rounded font-bold ${average >= 70 ? 'bg-green-100 text-green-800' : average >= 50 ? 'bg-blue-100 text-blue-800' : average >= 40 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{average.toFixed(1)}</span></div>
                              <div className="text-center text-gray-900 font-bold">-</div>
                              <div className="text-center">
                                <div className="flex justify-center gap-2" onClick={e => e.stopPropagation()}>
                                  <button onClick={(e) => { e.stopPropagation(); setPrintStudentId(studentId) }} className="text-purple-600 hover:text-purple-800" title="Print Report Card"><Printer size={16}/></button>
                                  <button onClick={(e) => { e.stopPropagation(); setEditReportStudentId(studentId) }} className="text-green-600 hover:text-green-800" title="Edit Report Card Data"><ClipboardList size={16}/></button>
                                  <button onClick={(e) => { e.stopPropagation(); const firstResult = studentResults[0]; if (firstResult) { setEditingItem(firstResult); setResultForm({ student_id: firstResult.student_id, subject_id: firstResult.subject_id, ca_score: firstResult.ca_score.toString(), exam_score: firstResult.exam_score.toString() }); setModalType('result'); setShowModal(true) } }} className="text-blue-600 hover:text-blue-800" title="Edit Result"><Edit size={16}/></button>
                                </div>
                              </div>
                            </div>
                            {isExpanded && (
                              <div className="bg-gray-50 p-4 border-t">
                                <h4 className="font-bold text-gray-900 mb-3">{student?.full_name} - All Subjects ({studentResults.length})</h4>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-100">
                                      <tr>
                                        <th className="p-2 text-left">Subject</th>
                                        {selectedTerm !== 'First Term' && <th className="text-center">1st Term</th>}
                                        {selectedTerm === 'Third Term' && <th className="text-center">2nd Term</th>}
                                        <th className="text-center">CA (30)</th>
                                        <th className="text-center">Exam (70)</th>
                                        <th className="text-center">Total</th>
                                        <th className="text-center">Avg %</th>
                                        <th className="text-center">Grade</th>
                                        <th className="text-center">Remark</th>
                                        <th className="text-center">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {studentResults.map(result => {
                                        let displayTotal = result.total_score
                                        let prevTerm1: string | number = '-'
                                        let prevTerm2: string | number = '-'
                                        if (selectedTerm === 'Second Term') { prevTerm1 = result.first_term_total || 0; displayTotal = (result.first_term_total || 0) + result.total_score } 
                                        else if (selectedTerm === 'Third Term') { prevTerm1 = result.first_term_total || 0; prevTerm2 = result.second_term_total || 0; displayTotal = (result.first_term_total || 0) + (result.second_term_total || 0) + result.total_score }
                                        const percentage = selectedTerm === 'First Term' ? displayTotal : selectedTerm === 'Second Term' ? (displayTotal / 2).toFixed(1) : (displayTotal / 3).toFixed(1)
                                        return (
                                          <tr key={result.id} className="border-t hover:bg-white">
                                            <td className="p-2 text-gray-900 font-medium">{result.subject_name}</td>
                                            {selectedTerm !== 'First Term' && <td className="text-center text-gray-600 text-sm">{prevTerm1}</td>}
                                            {selectedTerm === 'Third Term' && <td className="text-center text-gray-600 text-sm">{prevTerm2}</td>}
                                            <td className="text-center text-gray-900">{result.ca_score}</td>
                                            <td className="text-center text-gray-900">{result.exam_score}</td>
                                            <td className="text-center font-bold text-gray-900">{displayTotal}</td>
                                            <td className="text-center text-gray-700">{percentage}%</td>
                                            <td className="text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${result.grade.startsWith('A') ? 'bg-green-100 text-green-800' : result.grade.startsWith('B') ? 'bg-blue-100 text-blue-800' : result.grade.startsWith('C') ? 'bg-yellow-100 text-yellow-800' : result.grade.startsWith('D') || result.grade.startsWith('E') ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'}`}>{result.grade}</span></td>
                                            <td className="text-center text-gray-700">{result.remark}</td>
                                            <td className="text-center">
                                              <div className="flex justify-center gap-2">
                                                <button onClick={() => { setEditingItem(result); setResultForm({ student_id: result.student_id, subject_id: result.subject_id, ca_score: result.ca_score.toString(), exam_score: result.exam_score.toString() }); setModalType('result'); setShowModal(true) }} className="text-blue-600 hover:text-blue-800"><Edit size={14}/></button>
                                                <button onClick={() => handleDeleteResult(result.id)} className="text-red-600 hover:text-red-800"><Trash2 size={14}/></button>
                                              </div>
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {filteredResults.length === 0 && <div className="p-8 text-center text-gray-600"><FileText size={48} className="mx-auto text-gray-300 mb-2"/><p className="font-bold">No results found</p></div>}
              </div>
              {uniqueStudentIds.length > viewLimit && (
                <button onClick={() => setViewLimit(v => v + 50)} className="mt-4 w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700">
                  Load More ({uniqueStudentIds.length - viewLimit} more students)
                </button>
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
                    <th className="text-gray-900 font-bold">Class</th>
                    <th className="text-gray-900 font-bold">Category</th>
                    <th className="text-gray-900 font-bold">Department</th>
                    <th className="text-gray-900 font-bold">Term</th>
                    <th className="text-gray-900 font-bold">Session</th>
                    <th className="text-gray-900 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubjects.length === 0 ? <tr><td colSpan={8} className="p-8 text-center text-gray-600">No subjects found</td></tr> : filteredSubjects.map(s => (
                    <tr key={s.id} className="border-t hover:bg-gray-50">
                      <td className="p-2 text-gray-900">{s.name}</td>
                      <td className="text-gray-900">{s.code}</td>
                      <td className="text-gray-900">{s.class_id}</td>
                      <td className="text-gray-900"><span className={`px-2 py-1 rounded text-xs font-bold ${s.category === 'Core' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}>{s.category}</span></td>
                      <td className="text-gray-900">{s.department ? <span className="px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-800">{s.department}</span> : <span className="text-gray-400">-</span>}</td>
                      <td className="text-gray-900">{s.term}</td>
                      <td className="text-gray-900">{s.session}</td>
                      <td>
                        <button onClick={() => { setEditingItem(s); setSubjectForm({ name: s.name, code: s.code, class_id: s.class_id, department: s.department || '', category: s.category || 'Core', term: s.term, session: s.session, active: s.active }); setModalType('subject'); setShowModal(true) }} className="text-blue-600 hover:text-blue-800 mr-2"><Edit size={16}/></button>
                        <button onClick={() => handleDeleteSubject(s.id)} className="text-red-600 hover:text-red-800"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'bulk-subjects' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-blue-900 mb-2">Bulk Subject Entry</h3>
                <p className="text-blue-800 mb-4">Upload CSV to add multiple subjects at once.</p>
                <div className="flex flex-wrap gap-4 items-center">
                  <button onClick={downloadSubjectTemplate} className="flex items-center space-x-2 bg-white border-2 border-blue-300 text-blue-700 px-4 py-2 rounded hover:bg-blue-50 font-bold"><Download size={16}/>Download Template</button>
                  <label className="flex items-center space-x-2 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 font-bold cursor-pointer"><Upload size={16}/><span>Upload CSV</span><input type="file" accept=".csv" onChange={handleBulkSubjectUpload} className="hidden"/></label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && modalType === 'subject' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{editingItem ? 'Edit Subject' : 'Add Subject'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-700 hover:text-gray-900"><X size={24}/></button>
            </div>
            <form onSubmit={handleAddSubject} className="space-y-3">
              <input placeholder="Subject Name" value={subjectForm.name} onChange={(e) => setSubjectForm({...subjectForm, name: e.target.value})} required className="w-full p-2 border rounded text-gray-900"/>
              <input placeholder="Subject Code (e.g. ENG, PHY)" value={subjectForm.code} onChange={(e) => setSubjectForm({...subjectForm, code: e.target.value})} required className="w-full p-2 border rounded text-gray-900"/>
              <select value={subjectForm.class_id} onChange={(e) => setSubjectForm({...subjectForm, class_id: e.target.value})} required className="w-full p-2 border rounded text-gray-900">
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.class_name} {c.arm ? `(${c.arm})` : ''}</option>)}
              </select>
              <select value={subjectForm.category} onChange={(e) => setSubjectForm({...subjectForm, category: e.target.value, department: e.target.value === 'Core' ? '' : subjectForm.department})} className="w-full p-2 border rounded text-gray-900">
                <option value="Core">Core (General Subject)</option>
                <option value="Departmental">Departmental (Specific Subject)</option>
              </select>
              {subjectForm.category === 'Departmental' && classes.find(c => c.id === subjectForm.class_id)?.class_level === 'SS' && (
                <select value={subjectForm.department} onChange={(e) => setSubjectForm({...subjectForm, department: e.target.value})} required className="w-full p-2 border rounded text-gray-900">
                  <option value="">Select Department</option>
                  <option value="Science">Science</option>
                  <option value="Arts">Arts</option>
                  <option value="Commercial">Commercial</option>
                </select>
              )}
              <select value={subjectForm.term} onChange={(e) => setSubjectForm({...subjectForm, term: e.target.value})} className="w-full p-2 border rounded text-gray-900">{termOptions.map(t => <option key={t} value={t}>{t}</option>)}</select>
              <select value={subjectForm.session} onChange={(e) => setSubjectForm({...subjectForm, session: e.target.value})} className="w-full p-2 border rounded text-gray-900">{sessionOptions.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700">{editingItem ? 'Update' : 'Save'}</button>
            </form>
          </div>
        </div>
      )}

      {showModal && modalType === 'result' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{editingItem ? 'Edit Result' : 'Enter Single Result'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-700 hover:text-gray-900"><X size={24}/></button>
            </div>
            <form onSubmit={handleAddResult} className="space-y-3">
              <select value={resultForm.student_id} onChange={(e) => setResultForm({...resultForm, student_id: e.target.value, subject_id: ''})} required className="w-full p-2 border rounded text-gray-900">
                <option value="">Select Student</option>
                {(() => {
                  const base = students.filter(s => s.class_id === selectedClass)
                  const editingStudent = editingItem ? students.find(s => s.id === editingItem.student_id) : null
                  const list = editingStudent && !base.some(s => s.id === editingStudent.id) ? [...base, editingStudent] : base
                  return list.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.admission_number}) {s.department ? `- ${s.department}` : ''}</option>)
                })()}
              </select>
              {/* ✅ FIXED: Subject Dropdown */}
              <select value={resultForm.subject_id} onChange={(e) => setResultForm({...resultForm, subject_id: e.target.value})} required className="w-full p-2 border rounded text-gray-900">
                <option value="">Select Subject</option>
                {(() => {
                  const classSubjectsRaw = subjects.filter(s => s.class_id === selectedClass)
                  const editingSubject = editingItem ? subjects.find(s => s.id === editingItem.subject_id) : null
                  const classSubjects = editingSubject && !classSubjectsRaw.some(s => s.id === editingSubject.id) ? [...classSubjectsRaw, editingSubject] : classSubjectsRaw
                  const coreSubjects = classSubjects.filter(s => s.category === 'Core')
                  const deptSubjects = classSubjects.filter(s => s.category === 'Departmental')
                  return (
                    <>
                      {coreSubjects.length > 0 && (
                        <optgroup label="📚 Core Subjects (General)">
                          {coreSubjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                        </optgroup>
                      )}
                      {deptSubjects.length > 0 && (
                        <optgroup label="🎓 Departmental Subjects">
                          {deptSubjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                        </optgroup>
                      )}
                      {classSubjects.length === 0 && (
                        <option disabled>No subjects found for this class. Add them in the Subjects tab.</option>
                      )}
                    </>
                  )
                })()}
              </select>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="CA (0-30)" value={resultForm.ca_score} onChange={(e) => setResultForm({...resultForm, ca_score: e.target.value})} className="w-full p-2 border rounded text-gray-900"/>
                <input type="number" placeholder="Exam (0-70)" value={resultForm.exam_score} onChange={(e) => setResultForm({...resultForm, exam_score: e.target.value})} className="w-full p-2 border rounded text-gray-900"/>
              </div>
              <button type="submit" className="w-full bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700">{editingItem ? 'Update' : 'Save Result'}</button>
            </form>
          </div>
        </div>
      )}

      {/* ✅ Unified Report Card Modal */}
      {printStudent && printResultsEnriched.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
            <button 
              onClick={() => setPrintStudentId(null)} 
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Generate Report Card</h3>
            <UnifiedReportCard 
              student={{
                full_name: printStudent.full_name,
                admission_number: printStudent.admission_number,
                class_name: `${printStudentClass?.class_name || ''} ${printStudentClass?.arm ? `(${printStudentClass.arm})` : ''}`.trim() || 'Unknown',
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
              conductRatings={reportData?.conduct_ratings || { Attentiveness: 'Excellent', Cleanliness: 'Good', 'Emotional Balance': 'Good', Honesty: 'Excellent', Leadership: 'Good', Maturity: 'Good', Politeness: 'Excellent', Punctuality: 'Excellent' }}
              physicalSkills={reportData?.physical_skills || { Handwriting: 'Good', 'Verbal Fluency': 'Good', 'Debate/Quiz': 'Good', Sports: 'Excellent', 'Drawing & Painting': 'Good', 'Musical Skills': 'Fair', 'Handling Tools': 'Good' }}
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
      
      {/* ✅ Report Card Data Editor Modal */}
      {editStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100] md:left-64">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
            <button onClick={() => setEditReportStudentId(null)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"><X size={24} /></button>
            <ReportCardEditor
              studentId={editStudent.id}
              classId={editStudent.class_id}
              studentName={editStudent.full_name}
              admissionNumber={editStudent.admission_number}
              className={`${editStudentClass?.class_name || ''} ${editStudentClass?.arm || ''}`}
              term={selectedTerm}
              session={selectedSession}
            />
          </div>
        </div>
      )}
    </div>
  )
}