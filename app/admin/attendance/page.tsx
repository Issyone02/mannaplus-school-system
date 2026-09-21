'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { Calendar, Download, Search, Save, CheckCircle, XCircle, Clock, AlertCircle, User, AlertTriangle, Lock, Unlock, Key } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import StudentAttendanceSummary from '@/components/StudentAttendanceSummary'
import OTPVerificationModal from '@/components/OTPVerificationModal'
import { auditActions } from '@/lib/auditLog'

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
  class_id: string
}

interface AttendanceRecord {
  id?: string
  student_id: string
  class_id: string
  date: string
  status: 'present' | 'absent' | 'late' | 'excused'
  note?: string
  is_locked?: boolean
  locked_at?: string
  marked_by?: string
  created_at?: string
}

export default function AttendancePage() {
  const { user } = useUser()
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({})
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [summaryStudent, setSummaryStudent] = useState<any>(null)
  const [isSummaryOpen, setIsSummaryOpen] = useState(false)
  
  const [isOTPModalOpen, setIsOTPModalOpen] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [unlockPurpose, setUnlockPurpose] = useState('')

  const statusOptions: { value: 'present' | 'absent' | 'late' | 'excused'; label: string; icon: any; color: string }[] = [
    { value: 'present', label: 'Present', icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-300' },
    { value: 'absent', label: 'Absent', icon: XCircle, color: 'bg-red-100 text-red-800 border-red-300' },
    { value: 'late', label: 'Late', icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    { value: 'excused', label: 'Excused', icon: AlertCircle, color: 'bg-blue-100 text-blue-800 border-blue-300' },
  ]

  useEffect(() => {
    fetchClasses()
  }, [])

  useEffect(() => {
    if (selectedClass && selectedDate) {
      fetchData()
    }
  }, [selectedClass, selectedDate])

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, class_name, arm, department, class_level')
        .order('class_level')
        .order('class_name')

      if (error) throw error
      setClasses(data || [])
      
      if (data && data.length > 0 && !selectedClass) {
        setSelectedClass(data[0].id)
      }
    } catch (error: any) {
      console.error('Error fetching classes:', error)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, full_name, admission_number, class_id')
        .eq('class_id', selectedClass)
        .eq('active', true)
        .order('full_name')

      if (studentsError) throw studentsError
      setStudents(studentsData || [])

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('class_id', selectedClass)
        .eq('date', selectedDate)

      if (attendanceError) throw attendanceError

      const attendanceMap: Record<string, AttendanceRecord> = {}
      const now = new Date()

      ;(attendanceData || []).forEach((a: any) => {
        const recordDate = a.created_at ? new Date(a.created_at) : new Date(a.date + 'T00:00:00')
        const hoursDiff = (now.getTime() - recordDate.getTime()) / (1000 * 60 * 60)
        const isLocked = hoursDiff >= 24

        attendanceMap[a.student_id] = {
          ...a,
          is_locked: isLocked || a.is_locked
        }
      })
      
      setAttendance(attendanceMap)
    } catch (error: any) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        student_id: studentId,
        class_id: selectedClass,
        date: selectedDate,
        status,
        note: prev[studentId]?.note || '',
      }
    }))
  }

  const handleNoteChange = (studentId: string, note: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        note
      }
    }))
  }

  const saveAllAttendance = async () => {
    setSaving(true)
    try {
      const now = new Date()
      const adminEmail = user?.primaryEmailAddress?.emailAddress || 'unknown@admin.com'
      
      const recordsToSave = Object.values(attendance).filter(r => {
        if (!r.status) return false
        
        if (isUnlocked) return true
        
        if (!r.id && !r.created_at) return true
        
        if (r.is_locked) return false
        
        // ✅ FIXED: Provide fallback to r.date if created_at is undefined
        const recordDate = new Date(r.created_at || r.date)
        const hoursDiff = (now.getTime() - recordDate.getTime()) / (1000 * 60 * 60)
        return hoursDiff < 24
      })
      
      if (recordsToSave.length === 0) {
        const hasLocked = Object.values(attendance).some(r => r.status && r.is_locked)
        if (hasLocked) {
          toast.error('These records are locked (older than 24 hours). Click "Unlock with OTP" to modify them.')
        } else {
          toast('No attendance statuses marked to save')
        }
        setSaving(false)
        return
      }

      for (const record of recordsToSave) {
        const { error } = await supabase.from('attendance').upsert({
          id: record.id,
          student_id: record.student_id,
          class_id: record.class_id,
          date: record.date,
          status: record.status,
          note: record.note || null,
          marked_by: 'admin',
          updated_at: new Date().toISOString()
        }, { onConflict: 'student_id,date' })
        
        if (error) throw error

        if (isUnlocked && record.is_locked) {
          await auditActions.adminModifyAttendance(adminEmail, record.student_id, record.date, record.status, 'OTP_OVERRIDE')
        }
      }

      toast.success(`${recordsToSave.length} attendance records saved!`)
      
      if (isUnlocked) {
        setIsUnlocked(false)
        setUnlockPurpose('')
      }
      
      fetchData()
    } catch (error: any) {
      toast.error('Failed to save: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleOTPVerified = () => {
    setIsUnlocked(true)
    setIsOTPModalOpen(false)
    toast.success('Attendance unlocked! You can now make modifications.')
  }

  const exportToCSV = () => {
    const headers = ['Admission No', 'Student Name', 'Status', 'Note', 'Date']
    const rows = students.map(s => {
      const record = attendance[s.id]
      return [
        s.admission_number,
        s.full_name,
        record?.status || 'Not Marked',
        record?.note || '',
        selectedDate
      ]
    })
    
    const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_${selectedDate}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Exported to CSV!')
  }

  const filteredStudents = students.filter(s => 
    s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.admission_number.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalStudents = filteredStudents.length
  const presentCount = filteredStudents.filter(s => attendance[s.id]?.status === 'present').length

  const stats = {
    total: totalStudents,
    present: presentCount,
    absent: filteredStudents.filter(s => attendance[s.id]?.status === 'absent').length,
    late: filteredStudents.filter(s => attendance[s.id]?.status === 'late').length,
    excused: filteredStudents.filter(s => attendance[s.id]?.status === 'excused').length,
    notMarked: filteredStudents.filter(s => !attendance[s.id]?.status).length,
    percentage: totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0,
  }

  if (loading) {
    return <div className="p-8 text-gray-900 font-bold">Loading attendance...</div>
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <Toaster position="top-right" />
      
      <div className="flex flex-col md:flex-row justify-between items-center gap-3 md:gap-0 mb-6 text-center md:text-left">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance Management</h1>
          <p className="text-gray-600">Mark daily attendance for your classes</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto justify-center">
          <button onClick={exportToCSV} className="flex items-center justify-center gap-2 bg-gray-600 text-white px-4 py-2 rounded font-bold hover:bg-gray-700 flex-1 md:flex-none">
            <Download size={18}/> Export CSV
          </button>
          <button 
            onClick={saveAllAttendance} 
            disabled={saving}
            className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50 flex-1 md:flex-none"
          >
            <Save size={18}/> {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 text-yellow-800">
          <AlertTriangle size={20}/>
          <div>
            <p className="font-bold">Attendance Lock Policy</p>
            <p className="text-sm">Attendance records are automatically locked after 24 hours to prevent unauthorized changes.</p>
          </div>
        </div>
      </div>

      {!isUnlocked && Object.values(attendance).some(r => r.is_locked) && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Lock className="text-red-600" size={32} />
              <div>
                <h3 className="font-bold text-red-900 text-lg">Attendance is Locked</h3>
                <p className="text-sm text-red-700">
                  Records for this date are older than 24 hours. Only authorized admins can modify them.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setUnlockPurpose(`Modify attendance for ${selectedDate} - ${selectedClass}`)
                setIsOTPModalOpen(true)
              }}
              className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 transition-colors"
            >
              <Key size={18} />
              Unlock with OTP
            </button>
          </div>
        </div>
      )}

      {isUnlocked && (
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3 text-green-800">
            <Unlock size={20} />
            <div>
              <p className="font-bold">Attendance Unlocked</p>
              <p className="text-sm">You can now modify attendance records. All changes will be permanently logged.</p>
            </div>
            <button
              onClick={() => {
                setIsUnlocked(false)
                setUnlockPurpose('')
              }}
              className="ml-auto text-sm text-green-700 font-bold hover:text-green-900 underline"
            >
              Lock Again
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-2 md:flex md:flex-row gap-3 md:gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <select 
              value={selectedClass} 
              onChange={(e) => setSelectedClass(e.target.value)}
              className="p-2 border rounded text-gray-900 w-full md:min-w-[200px]"
            >
              <option value="">Select a Class...</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.class_name} {c.arm ? `(${c.arm})` : ''} {c.department ? `- ${c.department}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="p-2 border rounded text-gray-900 w-full md:w-auto"
            />
          </div>
          <div className="col-span-2 md:flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Students</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
              <input 
                type="text" 
                placeholder="Search by name or admission..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded text-gray-900"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4 mb-6">
        <div className="center-mobile bg-white rounded-xl shadow-md p-3 md:p-4 border border-gray-200">
          <h3 className="text-xl md:text-2xl font-bold text-gray-900">{stats.total}</h3>
          <p className="text-gray-600 text-xs md:text-sm font-medium text-center">Total</p>
        </div>
        <div className="center-mobile bg-green-50 rounded-xl shadow-md p-3 md:p-4 border-2 border-green-200">
          <h3 className="text-xl md:text-2xl font-bold text-green-900">{stats.present}</h3>
          <p className="text-green-700 text-xs md:text-sm font-medium text-center">Present</p>
        </div>
        <div className="center-mobile bg-red-50 rounded-xl shadow-md p-3 md:p-4 border-2 border-red-200">
          <h3 className="text-xl md:text-2xl font-bold text-red-900">{stats.absent}</h3>
          <p className="text-red-700 text-xs md:text-sm font-medium text-center">Absent</p>
        </div>
        <div className="center-mobile bg-yellow-50 rounded-xl shadow-md p-3 md:p-4 border-2 border-yellow-200">
          <h3 className="text-xl md:text-2xl font-bold text-yellow-900">{stats.late}</h3>
          <p className="text-yellow-700 text-xs md:text-sm font-medium text-center">Late</p>
        </div>
        <div className="center-mobile bg-blue-50 rounded-xl shadow-md p-3 md:p-4 border-2 border-blue-200">
          <h3 className="text-xl md:text-2xl font-bold text-blue-900">{stats.excused}</h3>
          <p className="text-blue-700 text-xs md:text-sm font-medium text-center">Excused</p>
        </div>
        <div className="center-mobile bg-purple-50 rounded-xl shadow-md p-3 md:p-4 border-2 border-purple-200">
          <h3 className="text-xl md:text-2xl font-bold text-purple-900">{stats.percentage}%</h3>
          <p className="text-purple-700 text-xs md:text-sm font-medium text-center">Attendance</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left text-gray-900 font-bold">Admission No</th>
                <th className="text-gray-900 font-bold">Student Name</th>
                <th className="text-gray-900 font-bold text-center">Status</th>
                <th className="text-gray-900 font-bold text-center">Actions</th>
                <th className="text-gray-900 font-bold">Note (Optional)</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-600">
                    <User size={48} className="mx-auto text-gray-300 mb-2"/>
                    <p className="font-bold">No students found</p>
                    <p className="text-sm">Add students to this class first or check your filters</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => {
                  const record = attendance[student.id]
                  const isLocked = record?.is_locked && !isUnlocked
                  
                  return (
                    <tr key={student.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 text-gray-900 font-medium">{student.admission_number}</td>
                      <td className="text-gray-900">{student.full_name}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {statusOptions.map(option => {
                            const Icon = option.icon
                            const isActive = record?.status === option.value
                            return (
                              <button
                                key={option.value}
                                onClick={() => handleStatusChange(student.id, option.value)}
                                disabled={isLocked}
                                className={`flex items-center gap-1 px-2 md:px-3 py-1 md:py-1.5 rounded-full text-[10px] md:text-xs font-bold border-2 transition-all ${
                                  isActive 
                                    ? `${option.color} ring-2 ring-offset-1 ring-gray-400` 
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                                } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title={isLocked ? 'Locked - Cannot edit' : option.label}
                              >
                                <Icon size={14}/>
                                <span className="hidden sm:inline">{option.label}</span>
                                {isLocked && isActive && <Lock size={10} className="ml-1"/>}
                              </button>
                            )
                          })}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            setSummaryStudent(student)
                            setIsSummaryOpen(true)
                          }}
                          className="text-blue-600 hover:text-blue-800 font-bold text-sm border border-blue-600 px-3 py-1 rounded hover:bg-blue-50"
                        >
                          View Summary
                        </button>
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={record?.note || ''}
                          onChange={(e) => handleNoteChange(student.id, e.target.value)}
                          disabled={isLocked}
                          placeholder={isLocked ? 'Locked' : 'Reason...'}
                          className={`w-full p-2 border rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 ${
                            isLocked ? 'bg-gray-100 cursor-not-allowed' : ''
                          }`}
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
        </table>
      </div>
      {filteredStudents.length > 0 && (
        <p className="md:hidden mt-2 text-xs text-gray-500 text-center">← Swipe the table sideways to see Status, Actions & Note →</p>
      )}

      <StudentAttendanceSummary 
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        student={summaryStudent}
      />

      <OTPVerificationModal
        isOpen={isOTPModalOpen}
        onClose={() => setIsOTPModalOpen(false)}
        onSuccess={handleOTPVerified}
        purpose={unlockPurpose}
      />
    </div>
  )
}