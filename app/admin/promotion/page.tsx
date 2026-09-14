'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, ArrowRight, CheckCircle, AlertTriangle, Loader2, History, Calendar, Sparkles, Lock, Clock, FlaskConical, Palette, Briefcase, X } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

interface ClassItem {
  id: string
  class_name: string
  arm: string | null
  department: string | null
  class_level: string
}

interface Session {
  id: string
  session_name: string
  current_term: string
  status: string
}

interface Student {
  id: string
  full_name: string
  admission_number: string
  class_id: string
}

interface StudentDepartmentSelection {
  studentId: string
  studentName: string
  admissionNumber: string
  selectedDepartment: 'Science' | 'Arts' | 'Commercial' | ''
  selectedClassId: string
}

interface PromotionLog {
  id: string
  from_session: string
  to_session: string
  promoted_at: string
  from_class_id: string
  to_class_id: string
  from_class_name?: string
  to_class_name?: string
}

const getTermFromMonth = (month: number): string => {
  if (month >= 8 && month <= 11) return 'First Term'
  if (month >= 0 && month <= 3) return 'Second Term'
  if (month >= 4 && month <= 7) return 'Third Term'
  return 'First Term'
}

export default function PromotionPage() {
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [logs, setLogs] = useState<PromotionLog[]>([])
  const [students, setStudents] = useState<Student[]>([])
  
  const [fromClassId, setFromClassId] = useState('')
  const [toClassId, setToClassId] = useState('')
  const [fromSession, setFromSession] = useState('')
  const [toSession, setToSession] = useState('')
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  
  const [studentCount, setStudentCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState(false)
  
  // ✅ NEW: Modal state for individual student selection
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [studentSelections, setStudentSelections] = useState<StudentDepartmentSelection[]>([])
  
  const [isPromotionPeriod, setIsPromotionPeriod] = useState(false)

  // ✅ NEW: Session wizard state (series AND logic)
  const [showSessionWizard, setShowSessionWizard] = useState(false)
  const [wizardBackupDone, setWizardBackupDone] = useState(false)
  const [wizardResultsDone, setWizardResultsDone] = useState(false)
  const [wizardMissingStudents, setWizardMissingStudents] = useState<string[]>([])
  const [wizardChecking, setWizardChecking] = useState(false)
  const [wizardPromotionsDone, setWizardPromotionsDone] = useState(false)
  const [wizardFinalDone, setWizardFinalDone] = useState(false)
  const [currentDateInfo, setCurrentDateInfo] = useState({
    month: '',
    term: '',
    canPromote: false,
    message: ''
  })

  const getHierarchyLevel = (className: string | null): number => {
    if (!className) return 0;
    const name = className.toUpperCase().replace(/\s/g, '');

    if (name.includes('PRIMARY1') || name.includes('P1')) return 10;
    if (name.includes('PRIMARY2') || name.includes('P2')) return 20;
    if (name.includes('PRIMARY3') || name.includes('P3')) return 30;
    if (name.includes('PRIMARY4') || name.includes('P4')) return 40;
    if (name.includes('PRIMARY5') || name.includes('P5')) return 50;
    if (name.includes('PRIMARY6') || name.includes('P6')) return 60;
    
    if (name.includes('JSS1')) return 70;
    if (name.includes('JSS2')) return 80;
    if (name.includes('JSS3')) return 90;
    
    if (name.includes('SS1')) return 100;
    if (name.includes('SS2')) return 110;
    if (name.includes('SS3')) return 120;

    return 0;
  }

  useEffect(() => {
    const now = new Date();
    const currentMonth = now.getMonth(); 
    const currentTerm = getTermFromMonth(currentMonth);
    
    let canPromote = false;
    let message = '';
    
    if (currentMonth >= 8 && currentMonth <= 11) {
      message = '📚 First Term in progress. Promotion locked until end of session.';
    } else if (currentMonth >= 0 && currentMonth <= 3) {
      message = '📖 Second Term in progress. Promotion locked until end of session.';
    } else if (currentMonth >= 4 && currentMonth <= 7) {
      if (currentMonth === 6 || currentMonth === 7) {
        canPromote = true;
        message = '✅ End of Session Period. Promotion is allowed.';
      } else {
        message = '📝 Third Term in progress. Wait until July-August for promotion.';
      }
    }
    
    const monthNames = ["January", "February", "March", "April", "May", "June", 
                        "July", "August", "September", "October", "November", "December"];
    
    setCurrentDateInfo({
      month: monthNames[currentMonth],
      term: currentTerm,
      canPromote,
      message
    });
    
    setIsPromotionPeriod(canPromote);
    syncTermWithDatabase(currentTerm);
  }, [])

  const syncTermWithDatabase = async (expectedTerm: string) => {
    try {
      const { data: sessionsData } = await supabase.from('academic_sessions').select('*').eq('status', 'Active').single();
      
      if (sessionsData && sessionsData.current_term !== expectedTerm) {
        await supabase.from('academic_sessions')
          .update({ current_term: expectedTerm })
          .eq('id', sessionsData.id);
        
        toast.success(`🔄 Term auto-synced to "${expectedTerm}" based on current date.`);
      }
    } catch (error) {
      console.error('Failed to sync term:', error);
    }
  }

  // ✅ NEW: Open the wizard & reset steps
  const openSessionWizard = () => {
    setWizardBackupDone(false)
    setWizardResultsDone(false)
    setWizardMissingStudents([])
    setWizardPromotionsDone(false)
    setWizardFinalDone(false)
    setShowSessionWizard(true)
    checkResultsCompleteness()
  }

  const resetWizard = () => {
    setWizardBackupDone(false)
    setWizardResultsDone(false)
    setWizardMissingStudents([])
    setWizardPromotionsDone(false)
    setWizardFinalDone(false)
  }

  // ✅ NEW STEP 1: Full-session backup download
  // ✅ CSV helpers
  const csvEscape = (v: any) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }

  const downloadCsv = (filename: string, rows: (string | number)[][]) => {
    const csv = rows.map(r => r.map(csvEscape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // ✅ NEW STEP 1: Full-session backup download (CSV)
  const downloadSessionBackup = async () => {
    setWizardChecking(true)
    try {
      const [studentsRes, resultsRes, reportsRes, classesRes, subjectsRes] = await Promise.all([
        supabase.from('students').select('*'),
        supabase.from('results').select('*').eq('session', fromSession),
        supabase.from('student_reports').select('*').eq('session', fromSession),
        supabase.from('classes').select('*'),
        supabase.from('subjects').select('id, name, code')
      ])

      const students = studentsRes.data || []
      const studentById = new Map(students.map((s: any) => [s.id, s]))
      const classById = new Map((classesRes.data || []).map((c: any) => [c.id, c]))
      const subjectById = new Map((subjectsRes.data || []).map((s: any) => [s.id, s]))
      const tag = fromSession.replace('/', '-')

      // 1) Results CSV (first 4 columns match the bulk-upload template → re-importable)
      const resultsRows: (string | number)[][] = [
        ['Admission Number', 'Subject Code', 'CA Score', 'Exam Score', 'Student Name', 'Subject Name', 'Class', 'Term', 'Grade', 'Remark']
      ]
      ;(resultsRes.data || []).forEach((r: any) => {
        const st = studentById.get(r.student_id)
        const sub = subjectById.get(r.subject_id)
        const cls = classById.get(r.class_id)
        resultsRows.push([
          st?.admission_number || '', sub?.code || '', r.ca_score, r.exam_score,
          st?.full_name || '', sub?.name || '', cls ? `${cls.class_name} ${cls.arm || ''}` : '', r.term, r.grade, r.remark
        ])
      })

      // 2) Students CSV
      const studentsRows: (string | number)[][] = [['Admission Number', 'Full Name', 'Class', 'Active']]
      students.forEach((s: any) => {
        const cls = classById.get(s.class_id)
        studentsRows.push([s.admission_number, s.full_name, cls ? `${cls.class_name} ${cls.arm || ''}` : '', s.active ? 'true' : 'false'])
      })

      // 3) Report data CSV
      const reportsRows: (string | number)[][] = [
        ['Admission Number', 'Term', 'School Opened', 'Present', 'Punctual', 'Position', 'Health Comment', "Teacher's Comment", "Principal's Comment"]
      ]
      ;(reportsRes.data || []).forEach((rp: any) => {
        const st = studentById.get(rp.student_id)
        reportsRows.push([
          st?.admission_number || '', rp.term, rp.attendance_opened, rp.attendance_present, rp.attendance_punctual,
          rp.position_in_class || '', rp.health_comment || '', rp.teacher_comment || '', rp.principal_comment || ''
        ])
      })

      downloadCsv(`backup_results_${tag}.csv`, resultsRows)
      setTimeout(() => downloadCsv(`backup_students_${tag}.csv`, studentsRows), 500)
      setTimeout(() => downloadCsv(`backup_reports_${tag}.csv`, reportsRows), 1000)

      setWizardBackupDone(true)
      toast.success('✅ Backup CSVs downloaded (results, students, reports)!')
    } catch (error: any) {
      toast.error('Backup failed: ' + error.message)
    } finally {
      setWizardChecking(false)
    }
  }



  // ✅ NEW STEP 2: Verify every active student has results this session
  const checkResultsCompleteness = async () => {
    setWizardChecking(true)
    try {
      const { data: activeStudents } = await supabase
        .from('students')
        .select('id, full_name, admission_number')
        .eq('active', true)

      const { data: resultsData } = await supabase
        .from('results')
        .select('student_id')
        .eq('session', fromSession)

      const withResults = new Set((resultsData || []).map((r: any) => r.student_id))
      const missing = (activeStudents || []).filter(s => !withResults.has(s.id))
      setWizardMissingStudents(missing.map((s: any) => `${s.full_name} (${s.admission_number})`))
      setWizardResultsDone(missing.length === 0)
      if (missing.length === 0) toast.success('All students have results for this session!')
    } catch (error: any) {
      toast.error('Check failed: ' + error.message)
    } finally {
      setWizardChecking(false)
    }
  }

  const allWizardStepsDone = wizardBackupDone && wizardResultsDone && wizardPromotionsDone && wizardFinalDone

  const startNewSession = async () => {
    const currentYear = new Date().getFullYear();
    const newSessionYear = `${currentYear}/${currentYear + 1}`;

    try {
      const { data: existingSession } = await supabase
        .from('academic_sessions')
        .select('*')
        .eq('session_name', newSessionYear)
        .single();

      if (existingSession) {
        await supabase.from('academic_sessions')
          .update({ status: 'Active', current_term: 'First Term' })
          .eq('id', existingSession.id);
        
        await supabase.from('academic_sessions')
          .update({ status: 'Archived' })
          .neq('session_name', newSessionYear);
          
        toast.success(`✅ Activated session ${newSessionYear}`);
      } else {
        await supabase.from('academic_sessions').insert([{
          session_name: newSessionYear,
          current_term: 'First Term',
          status: 'Active',
          start_date: new Date(`${currentYear}-09-01`).toISOString(),
        }]);
        
        await supabase.from('academic_sessions')
          .update({ status: 'Archived' })
          .neq('session_name', newSessionYear);
          
        toast.success(`✅ Created and activated session ${newSessionYear}`);
      }
      
      fetchData();
      setShowSessionWizard(false);
      resetWizard();
    } catch (error: any) {
      toast.error('Failed to start new session: ' + error.message);
    }
  }

  const generateSessionOptions = () => {
    const currentYear = new Date().getFullYear();
    const options = [];
    for (let i = currentYear - 2; i <= currentYear + 5; i++) {
      options.push(`${i}/${i + 1}`);
    }
    return options;
  };
  const dynamicSessionOptions = generateSessionOptions();

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    if (fromSession) setToSession(calculateNextSession(fromSession))
  }, [fromSession])

  useEffect(() => {
    if (fromClassId) {
      fetchStudentCount()
      fetchStudentsInClass()
    } else {
      setStudentCount(0)
      setStudents([])
    }
  }, [fromClassId])

  const calculateNextSession = (currentSession: string) => {
    const match = currentSession.match(/(\d{4})\/(\d{4})/)
    if (match) return `${parseInt(match[1]) + 1}/${parseInt(match[2]) + 1}`
    return currentSession
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: classesData } = await supabase.from('classes').select('*').order('class_name')
      setClasses(classesData || [])

      const { data: sessionsData } = await supabase.from('academic_sessions').select('*').order('created_at', { ascending: false })
      setSessions(sessionsData || [])

      const active = sessionsData?.find(s => s.status === 'Active')
      if (active) {
        setActiveSession(active)
        setFromSession(active.session_name)
        setToSession(calculateNextSession(active.session_name))
      }

      const { data: logsData } = await supabase.from('promotion_logs').select('*').order('promoted_at', { ascending: false }).limit(20)
      if (logsData && classesData) {
        const enrichedLogs = logsData.map(log => {
          const fromCls = classesData.find(c => c.id === log.from_class_id)
          const toCls = classesData.find(c => c.id === log.to_class_id)
          return {
            ...log,
            from_class_name: fromCls ? `${fromCls.class_name} ${fromCls.arm || ''}` : 'Unknown',
            to_class_name: toCls ? `${toCls.class_name} ${toCls.arm || ''} ${toCls.department ? `- ${toCls.department}` : ''}` : 'Unknown'
          }
        })
        setLogs(enrichedLogs)
      }
    } catch (error: any) {
      toast.error('Failed to load data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchStudentCount = async () => {
    const { count, error } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('class_id', fromClassId).eq('active', true)
    if (error) setStudentCount(0)
    else setStudentCount(count || 0)
  }

  const fetchStudentsInClass = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('id, full_name, admission_number, class_id')
      .eq('class_id', fromClassId)
      .eq('active', true)
      .order('full_name')
    
    if (error) {
      console.error('Failed to fetch students:', error)
      setStudents([])
    } else {
      setStudents(data || [])
    }
  }

  // ✅ NEW: Open modal with student list for JSS 3 promotion
  const openStudentSelectionModal = () => {
    const fromClass = classes.find(c => c.id === fromClassId)
    if (fromClass?.class_name !== 'JSS 3') {
      toast.error('Individual selection is only available for JSS 3 promotions')
      return
    }

    // Initialize selections with empty departments
    const initialSelections: StudentDepartmentSelection[] = students.map(s => ({
      studentId: s.id,
      studentName: s.full_name,
      admissionNumber: s.admission_number,
      selectedDepartment: '',
      selectedClassId: ''
    }))

    setStudentSelections(initialSelections)
    setShowStudentModal(true)
  }

  // ✅ NEW: Update student's department selection
  const updateStudentSelection = (studentId: string, department: 'Science' | 'Arts' | 'Commercial') => {
    setStudentSelections(prev => prev.map(selection => {
      if (selection.studentId === studentId) {
        // Find available SS 1 classes for this department
        const availableClasses = classes.filter(c => {
          const level = getHierarchyLevel(c.class_name)
          return level === 100 && c.department === department // SS 1 = 100
        })
        
        return {
          ...selection,
          selectedDepartment: department,
          selectedClassId: availableClasses[0]?.id || ''
        }
      }
      return selection
    }))
  }

  // ✅ NEW: Update student's class selection (arm)
  const updateStudentClass = (studentId: string, classId: string) => {
    setStudentSelections(prev => prev.map(selection => {
      if (selection.studentId === studentId) {
        return { ...selection, selectedClassId: classId }
      }
      return selection
    }))
  }

  // ✅ NEW: Get available SS 1 classes for a department
  const getSS1ClassesForDepartment = (department: string) => {
    return classes.filter(c => {
      const level = getHierarchyLevel(c.class_name)
      return level === 100 && c.department === department
    })
  }

  // ✅ NEW: Execute promotion with individual selections
  const executeIndividualPromotion = async () => {
    if (!isPromotionPeriod) {
      toast.error(` Promotion Blocked! Promotions are only allowed in July-August.`)
      return
    }

    // Validate all students have selections
    const incompleteSelections = studentSelections.filter(s => !s.selectedDepartment || !s.selectedClassId)
    if (incompleteSelections.length > 0) {
      toast.error(`${incompleteSelections.length} student(s) don't have department/class selected`)
      return
    }

    if (!confirm(`Promote ${studentSelections.length} students to their selected departments?\n\nThis action cannot be undone.`)) {
      return
    }

    setExecuting(true)
    try {
      let successCount = 0
      let errorCount = 0

      for (const selection of studentSelections) {
        try {
          // Update student's class
          const { error } = await supabase
            .from('students')
            .update({ class_id: selection.selectedClassId })
            .eq('id', selection.studentId)

          if (error) {
            console.error(`Failed to promote ${selection.studentName}:`, error)
            errorCount++
            continue
          }

          // Log the promotion
          await supabase.from('promotion_logs').insert({
            student_id: selection.studentId,
            from_class_id: fromClassId,
            to_class_id: selection.selectedClassId,
            from_session: fromSession,
            to_session: toSession
          })

          successCount++
        } catch (err) {
          console.error(`Error promoting ${selection.studentName}:`, err)
          errorCount++
        }
      }

      if (successCount > 0) {
        toast.success(`✅ Successfully promoted ${successCount} students!`)
      }
      if (errorCount > 0) {
        toast.error(`⚠️ ${errorCount} promotions failed`)
      }

      setShowStudentModal(false)
      setFromClassId('')
      setToClassId('')
      setStudentCount(0)
      fetchData()

    } catch (error: any) {
      toast.error('Promotion Failed: ' + error.message)
    } finally {
      setExecuting(false)
    }
  }

  // ✅ NEW: Download a JSON backup of the class before promotion
  const createArchiveSnapshot = async () => {
    if (!fromSession || !fromClassId) {
      toast.error('Select the current session and class first')
      return
    }

    setExecuting(true)
    try {
      const [studentsRes, resultsRes, subjectsRes] = await Promise.all([
        supabase.from('students').select('*').eq('class_id', fromClassId).eq('active', true),
        supabase.from('results').select('*').eq('class_id', fromClassId).eq('session', fromSession),
        supabase.from('subjects').select('id, name, code')
      ])

      const students = studentsRes.data || []
      const studentById = new Map(students.map((s: any) => [s.id, s]))
      const subjectById = new Map((subjectsRes.data || []).map((s: any) => [s.id, s]))
      const tag = fromSession.replace('/', '-')

      const resultsRows: (string | number)[][] = [
        ['Admission Number', 'Subject Code', 'CA Score', 'Exam Score', 'Student Name', 'Subject Name', 'Term', 'Grade', 'Remark']
      ]
      ;(resultsRes.data || []).forEach((r: any) => {
        const st = studentById.get(r.student_id)
        const sub = subjectById.get(r.subject_id)
        resultsRows.push([st?.admission_number || '', sub?.code || '', r.ca_score, r.exam_score, st?.full_name || '', sub?.name || '', r.term, r.grade, r.remark])
      })

      const studentsRows: (string | number)[][] = [['Admission Number', 'Full Name']]
      students.forEach((s: any) => studentsRows.push([s.admission_number, s.full_name]))

      downloadCsv(`archive_${tag}_results.csv`, resultsRows)
      setTimeout(() => downloadCsv(`archive_${tag}_students.csv`, studentsRows), 500)

      toast.success(`✅ Archive CSVs downloaded! (${students.length} students, ${(resultsRes.data || []).length} results)`)
    } catch (error: any) {
      toast.error('Failed to create snapshot: ' + error.message)
    } finally {
      setExecuting(false)
    }
  }


  const executeBulkPromotion = async () => {
    // Existing bulk promotion logic for non-JSS3 classes
    if (!isPromotionPeriod) {
      toast.error(` Promotion Blocked!\n\n${currentDateInfo.message}`)
      return
    }

    if (!fromClassId || !toClassId || !fromSession || !toSession) {
      toast.error('Please select all required fields')
      return
    }

    const fromClass = classes.find(c => c.id === fromClassId)
    const toClass = classes.find(c => c.id === toClassId)

    if (fromClass && toClass) {
      const fromLevel = getHierarchyLevel(fromClass.class_name)
      const toLevel = getHierarchyLevel(toClass.class_name)
      
      if (toLevel !== fromLevel + 10) {
        toast.error(`🚫 Invalid Move! Students can only move one step at a time.`)
        return
      }
    }

    const confirmMsg = `Are you sure you want to promote ${studentCount} students?\n\nFrom: ${fromClass?.class_name} (${fromSession})\nTo: ${toClass?.class_name} (${toSession})`
    if (!confirm(confirmMsg)) return

    setExecuting(true)
    try {
      const { data: studentsToPromote, error: fetchError } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', fromClassId)
        .eq('active', true)
      
      if (fetchError) throw fetchError

      if (!studentsToPromote || studentsToPromote.length === 0) {
        toast.error('No active students found in this class to promote.')
        setExecuting(false)
        return
      }

      const { error: updateError } = await supabase
        .from('students')
        .update({ class_id: toClassId })
        .eq('class_id', fromClassId)
        .eq('active', true)
      
      if (updateError) throw updateError

      const logsToInsert = studentsToPromote.map(s => ({
        student_id: s.id,
        from_class_id: fromClassId,
        to_class_id: toClassId,
        from_session: fromSession,
        to_session: toSession
      }))

      await supabase.from('promotion_logs').insert(logsToInsert)
      
      toast.success(`Successfully promoted ${studentsToPromote.length} students!`);

      setFromClassId('')
      setToClassId('')
      setStudentCount(0)
      fetchData()

    } catch (error: any) {
      toast.error('Promotion Failed: ' + error.message)
    } finally {
      setExecuting(false)
    }
  }

  const formatClassName = (cls: ClassItem | undefined) => {
    if (!cls) return 'Select Class...'
    return `${cls.class_name} ${cls.arm ? `(${cls.arm})` : ''} ${cls.department ? `- ${cls.department}` : ''}`
  }

  const fromClass = classes.find(c => c.id === fromClassId)
  const isJSS3ToSS1 = fromClass?.class_name === 'JSS 3'

  if (loading) return <div className="p-8 text-gray-900 font-bold">Loading Promotion Engine...</div>

  return (
    <div className="relative p-4 md:p-8 bg-gray-50 min-h-screen">
      <Toaster position="top-right" />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Users className="text-blue-600" /> End of Session & Promotion
        </h1>
        <p className="text-gray-600 mt-2">Automatically promote students to the next class level.</p>
      </div>

      {/* Date & Term Information Banner */}
      <div className={`mb-6 rounded-lg p-4 border-2 ${
        isPromotionPeriod ? 'bg-green-50 border-green-300' : 'bg-orange-50 border-orange-300'
      }`}>
        <div className="flex items-start gap-3">
          <Clock className={isPromotionPeriod ? 'text-green-600' : 'text-orange-600'} size={24} />
          <div className="flex-1">
            <h3 className={`font-bold ${isPromotionPeriod ? 'text-green-900' : 'text-orange-900'}`}>
              Current Period: {currentDateInfo.month} {new Date().getFullYear()}
            </h3>
            <p className={`text-sm mt-1 ${isPromotionPeriod ? 'text-green-800' : 'text-orange-800'}`}>
              {currentDateInfo.term} | {currentDateInfo.message}
            </p>
          </div>
        </div>
      </div>

      {/* Start New Session Button */}
      <div className="mb-6 bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-start gap-3">
            <Calendar className="text-blue-600" size={24} />
            <div>
              <h3 className="font-bold text-blue-900">Current Active Session</h3>
              <p className="text-blue-800 text-sm">
                {activeSession?.session_name || 'No active session'} - {activeSession?.current_term || 'N/A'}
              </p>
            </div>
          </div>
          
          <button
            onClick={openSessionWizard}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg"
          >
            <Sparkles size={20} />
            Start New Session ({new Date().getFullYear()}/{new Date().getFullYear() + 1})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Academic Sessions Section */}
          <div className="bg-white rounded-lg shadow p-6 border-2 border-blue-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar size={20} /> 1. Academic Sessions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Session (Current)</label>
                <select value={fromSession} onChange={(e) => setFromSession(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 bg-blue-50">
                  <option value="">Select Session...</option>
                  {sessions.map(s => (
                    <option key={s.id} value={s.session_name}>
                      {s.session_name} - {s.current_term} {s.status === 'Active' ? '✓' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Session (Next)</label>
                <select value={toSession} onChange={(e) => setToSession(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 bg-green-50">
                  <option value="">Select Session...</option>
                  {dynamicSessionOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Select Classes Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users size={20} /> 2. Select Classes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Class</label>
                <select value={fromClassId} onChange={(e) => setFromClassId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-gray-900">
                  <option value="">Select Current Class...</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{formatClassName(c)}</option>)}
                </select>
              </div>
              
              <div className="flex items-center justify-center md:pb-2">
                <ArrowRight size={24} className="text-gray-400" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Class</label>
                <select 
                  value={toClassId} 
                  onChange={(e) => setToClassId(e.target.value)}
                  disabled={!fromClassId || isJSS3ToSS1}
                  className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="">
                    {isJSS3ToSS1 ? 'Use Individual Selection (Modal)' : 'Select Next Class...'}
                  </option>
                  {!isJSS3ToSS1 && classes
                    .filter(c => getHierarchyLevel(c.class_name) === getHierarchyLevel(fromClass?.class_name || '') + 10)
                    .map(c => <option key={c.id} value={c.id}>{formatClassName(c)}</option>)}
                </select>
                
                {isJSS3ToSS1 && (
                  <button
                    onClick={openStudentSelectionModal}
                    className="mt-2 w-full bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Users size={16} />
                    Select Departments for {studentCount} Students
                  </button>
                )}
              </div>
            </div>

            {fromClassId && (
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <Users className="text-blue-600 mt-1" size={20} />
                <div>
                  <h4 className="font-bold text-blue-900">Promotion Preview</h4>
                  <p className="text-blue-800 text-sm">
                    There are currently <span className="font-bold text-lg">{studentCount}</span> active students in this class.
                  </p>
                  {isJSS3ToSS1 && (
                    <p className="text-purple-700 text-sm mt-1 font-bold">
                      → Click the button above to assign each student to Science, Arts, or Commercial
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={createArchiveSnapshot}
                disabled={!fromClassId || !fromSession || executing}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors mb-3"
              >
                <History size={20} /> Download Archive Snapshot (Backup Before Promotion)
              </button>
              <button
                onClick={isJSS3ToSS1 ? openStudentSelectionModal : executeBulkPromotion}
                disabled={!isPromotionPeriod || executing || studentCount === 0 || !fromClassId || (!toClassId && !isJSS3ToSS1) || !fromSession || !toSession}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-white transition-all ${
                  !isPromotionPeriod || executing || studentCount === 0 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {!isPromotionPeriod ? (
                  <><Lock size={20} /> Promotion Locked (Wait for July-August)</>
                ) : executing ? (
                  <><Loader2 className="animate-spin" size={20} /> Processing...</>
                ) : isJSS3ToSS1 ? (
                  <><CheckCircle size={20} /> Select Student Departments ({studentCount} Students)</>
                ) : (
                  <><CheckCircle size={20} /> Execute Promotion ({studentCount} Students)</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Recent Promotions Sidebar */}
        <div className="bg-white rounded-lg shadow p-6 h-fit">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <History size={20} /> Recent Promotions
          </h2>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <History size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No promotion history yet.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {logs.map(log => (
                <div key={log.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">{log.from_session} ➔ {log.to_session}</span>
                    <span className="text-xs text-gray-500">{new Date(log.promoted_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-gray-900 font-medium">{log.from_class_name} ➔ {log.to_class_name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ✅ STUDENT SELECTION MODAL */}
      {showStudentModal && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-purple-50">
              <div>
                <h2 className="text-2xl font-bold text-gray-900"> Assign Departments - JSS 3 to SS 1</h2>
                <p className="text-sm text-gray-600 mt-1">Select Science, Arts, or Commercial for each student</p>
              </div>
              <button onClick={() => setShowStudentModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid gap-4">
                {studentSelections.map((selection, index) => {
                  const availableClasses = getSS1ClassesForDepartment(selection.selectedDepartment)
                  
                  return (
                    <div key={selection.studentId} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-bold text-gray-900">{index + 1}. {selection.studentName}</p>
                          <p className="text-sm text-gray-600">{selection.admissionNumber}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Department Selection */}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => updateStudentSelection(selection.studentId, 'Science')}
                            className={`flex-1 p-2 rounded-lg border-2 font-bold text-sm transition-all flex items-center justify-center gap-1 ${
                              selection.selectedDepartment === 'Science'
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                            }`}
                          >
                            <FlaskConical size={16} />
                            Science
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStudentSelection(selection.studentId, 'Arts')}
                            className={`flex-1 p-2 rounded-lg border-2 font-bold text-sm transition-all flex items-center justify-center gap-1 ${
                              selection.selectedDepartment === 'Arts'
                                ? 'bg-purple-600 text-white border-purple-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400'
                            }`}
                          >
                            <Palette size={16} />
                            Arts
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStudentSelection(selection.studentId, 'Commercial')}
                            className={`flex-1 p-2 rounded-lg border-2 font-bold text-sm transition-all flex items-center justify-center gap-1 ${
                              selection.selectedDepartment === 'Commercial'
                                ? 'bg-green-600 text-white border-green-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                            }`}
                          >
                            <Briefcase size={16} />
                            Commercial
                          </button>
                        </div>

                        {/* Class/Arm Selection */}
                        {selection.selectedDepartment && (
                          <select
                            value={selection.selectedClassId}
                            onChange={(e) => updateStudentClass(selection.studentId, e.target.value)}
                            className="p-2 border border-gray-300 rounded-lg text-gray-900"
                          >
                            <option value="">Select Arm...</option>
                            {availableClasses.map(cls => (
                              <option key={cls.id} value={cls.id}>
                                {cls.class_name} {cls.arm ? `(${cls.arm})` : ''}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {!selection.selectedDepartment && (
                        <p className="text-xs text-orange-600 mt-2 font-bold flex items-center gap-1">
                          <AlertTriangle size={12} /> Please select a department
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowStudentModal(false)}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={executeIndividualPromotion}
                  disabled={executing || studentSelections.some(s => !s.selectedDepartment || !s.selectedClassId)}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-white transition-all ${
                    executing || studentSelections.some(s => !s.selectedDepartment || !s.selectedClassId)
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 shadow-lg'
                  }`}
                >
                  {executing ? (
                    <><Loader2 className="animate-spin" size={20} /> Processing...</>
                  ) : (
                    <><CheckCircle size={20} /> Promote {studentSelections.length} Students</>
                  )}
                </button>
              </div>
              {studentSelections.some(s => !s.selectedDepartment || !s.selectedClassId) && (
                <p className="text-xs text-orange-600 mt-2 text-center">
                  <AlertTriangle size={12} className="inline mr-1" />
                  All students must have a department and class selected
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ✅ NEW SESSION GUIDED WIZARD (series AND logic) */}
      {showSessionWizard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 bg-blue-50 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles size={24} className="text-blue-600" /> Start New Session Wizard
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Complete ALL 4 steps in order to create {new Date().getFullYear()}/{new Date().getFullYear() + 1}.
                </p>
              </div>
              <button onClick={() => setShowSessionWizard(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* STEP 1 — BACKUP */}
              <div className={`rounded-lg border-2 p-4 ${wizardBackupDone ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
                <div className="flex justify-between items-center gap-3 flex-wrap">
                  <div>
                    <h3 className="font-bold text-gray-900">Step 1 — Backup current session ({fromSession || 'not selected'})</h3>
                    <p className="text-sm text-gray-600">Download CSV archives (results, students & report data).</p>
                  </div>
                  {wizardBackupDone ? (
                    <span className="flex items-center gap-1 text-green-700 font-bold text-sm"><CheckCircle size={18} /> Done</span>
                  ) : (
                    <button onClick={downloadSessionBackup} disabled={wizardChecking || !fromSession} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed">
                      Download Backup
                    </button>
                  )}
                </div>
              </div>

              {/* STEP 2 — RESULTS */}
              <div className={`rounded-lg border-2 p-4 ${wizardResultsDone ? 'border-green-300 bg-green-50' : wizardBackupDone ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-100 opacity-60'}`}>
                <div className="flex justify-between items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <h3 className="font-bold text-gray-900">Step 2 — Confirm all results are entered</h3>
                    <p className="text-sm text-gray-600">
                      {wizardChecking ? 'Checking…' : wizardResultsDone
                        ? '✅ All active students have results for this session.'
                        : wizardBackupDone
                          ? `${wizardMissingStudents.length} student(s) still have NO results for ${fromSession}. Enter their results, then verify again.`
                          : 'Complete Step 1 to unlock.'}
                    </p>
                    {!wizardResultsDone && wizardMissingStudents.length > 0 && (
                      <p className="text-xs text-orange-700 mt-1 max-h-20 overflow-y-auto font-medium">{wizardMissingStudents.join(', ')}</p>
                    )}
                  </div>
                  {wizardResultsDone ? (
                    <span className="flex items-center gap-1 text-green-700 font-bold text-sm"><CheckCircle size={18} /> Done</span>
                  ) : (
                    <button onClick={checkResultsCompleteness} disabled={!wizardBackupDone || wizardChecking} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed">
                      Verify Results
                    </button>
                  )}
                </div>
              </div>

              {/* STEP 3 — PROMOTIONS */}
              <div className={`rounded-lg border-2 p-4 ${wizardPromotionsDone ? 'border-green-300 bg-green-50' : wizardResultsDone ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-100 opacity-60'}`}>
                <label className={`flex items-start gap-3 ${wizardResultsDone ? 'cursor-pointer' : 'pointer-events-none'}`}>
                  <input type="checkbox" checked={wizardPromotionsDone} onChange={(e) => setWizardPromotionsDone(e.target.checked)} className="w-5 h-5 mt-0.5" />
                  <span>
                    <h3 className="font-bold text-gray-900">Step 3 — Promotions handled</h3>
                    <p className="text-sm text-gray-600">I have promoted all continuing students (and graduated/deactivated leavers) using the promotion tools.</p>
                  </span>
                </label>
              </div>

              {/* STEP 4 — FINAL CONFIRMATION */}
              <div className={`rounded-lg border-2 p-4 ${wizardFinalDone ? 'border-green-300 bg-green-50' : wizardPromotionsDone ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-100 opacity-60'}`}>
                <label className={`flex items-start gap-3 ${wizardPromotionsDone ? 'cursor-pointer' : 'pointer-events-none'}`}>
                  <input type="checkbox" checked={wizardFinalDone} onChange={(e) => setWizardFinalDone(e.target.checked)} className="w-5 h-5 mt-0.5" />
                  <span>
                    <h3 className="font-bold text-gray-900">Step 4 — Final confirmation</h3>
                    <p className="text-sm text-gray-600">I understand {fromSession} will be archived and the new session becomes active with First Term.</p>
                  </span>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={startNewSession}
                disabled={!allWizardStepsDone || executing}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-white transition-colors ${allWizardStepsDone ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'}`}
              >
                <Sparkles size={20} />
                {allWizardStepsDone
                  ? `Create New Session (${new Date().getFullYear()}/${new Date().getFullYear() + 1})`
                  : 'Complete all steps to unlock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}