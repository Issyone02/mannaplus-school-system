'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Save, User, Calendar, CheckSquare, Activity, MessageSquare, Loader2, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

interface ReportCardEditorProps {
  studentId: string
  classId: string // ✅ NEW - needed to auto-calculate attendance
  studentName: string
  admissionNumber: string
  className: string
  term: string
  session: string
  userRole?: 'admin' | 'teacher'
}

const CONDUCT_QUALITIES = ['Attentiveness', 'Cleanliness', 'Emotional Balance', 'Honesty', 'Leadership', 'Maturity', 'Politeness', 'Punctuality']
const PHYSICAL_SKILLS = ['Handwriting', 'Verbal Fluency', 'Debate/Quiz', 'Sports', 'Drawing & Painting', 'Musical Skills', 'Handling Tools']

type Rating = 'Excellent' | 'Good' | 'Fair' | 'Poor' | ''

export default function ReportCardEditor({ 
  studentId, classId, studentName, admissionNumber, className, term, session, userRole = 'admin' 
}: ReportCardEditorProps) {

  const isAdmin = userRole === 'admin'
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [recalculating, setRecalculating] = useState(false)
  
  const [formData, setFormData] = useState({
    attendance_opened: 0,
    attendance_present: 0,
    attendance_punctual: 0,
    term_begins: '',
    term_ends: '',
    next_term_begins: '',
    conduct_ratings: {} as Record<string, Rating>,
    physical_skills: {} as Record<string, Rating>,
    health_comment: '',
    teacher_comment: '',
    principal_comment: '',
    position_in_class: 0,
    total_students_in_class: 0,
  })

  // ✅ AUTO-CALCULATE attendance from the marked attendance records
  const autoFillAttendance = async (showToast = false) => {
    try {
      if (showToast) setRecalculating(true)

      // 1. School Opened = distinct dates attendance was marked for this class
      const { data: classDates } = await supabase
        .from('attendance')
        .select('date')
        .eq('class_id', classId)

      const schoolOpened = new Set((classDates || []).map((d: any) => d.date)).size

      // 2. Student's own records
      const { data: studentAtt } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', studentId)

      const present = (studentAtt || []).filter((a: any) => a.status === 'present' || a.status === 'late').length
      const punctual = (studentAtt || []).filter((a: any) => a.status === 'present').length

      setFormData(prev => ({
        ...prev,
        attendance_opened: schoolOpened,
        attendance_present: present,
        attendance_punctual: punctual,
      }))

      if (showToast) toast.success('Attendance recalculated from marked records!')
    } catch (error) {
      console.error('Error auto-filling attendance:', error)
      if (showToast) toast.error('Failed to recalculate attendance')
    } finally {
      setRecalculating(false)
    }
  }

  const fetchReportData = async () => {
    try {
      const { data, error } = await supabase
        .from('student_reports')
        .select('*')
        .eq('student_id', studentId)
        .eq('term', term)
        .eq('session', session)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        setFormData(prev => ({
          ...prev,
          term_begins: data.term_begins || '',
          term_ends: data.term_ends || '',
          next_term_begins: data.next_term_begins || '',
          conduct_ratings: data.conduct_ratings || {},
          physical_skills: data.physical_skills || {},
          health_comment: data.health_comment || '',
          teacher_comment: data.teacher_comment || '',
          principal_comment: data.principal_comment || '',
          position_in_class: data.position_in_class || 0,
          total_students_in_class: data.total_students_in_class || 0,
        }))
      }
    } catch (error: any) {
      console.error('Error fetching report data:', error)
    }
  }

  // ✅ Load saved data AND auto-fill attendance on open
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await fetchReportData()
      await autoFillAttendance() // Always tally with marked attendance
      setLoading(false)
    }
    init()
  }, [studentId, classId, term, session])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('student_reports').upsert({
        student_id: studentId,
        term,
        session,
        ...formData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'student_id,term,session' })

      if (error) throw error
      toast.success('Report card data saved successfully!')
    } catch (error: any) {
      toast.error('Failed to save: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const updateRating = (category: 'conduct_ratings' | 'physical_skills', item: string, rating: Rating) => {
    setFormData(prev => ({
      ...prev,
      [category]: { ...prev[category], [item]: rating }
    }))
  }

  const RatingButton = ({ value, current, onClick }: { value: Rating; current: Rating; onClick: () => void }) => {
    const colors = {
      'Excellent': 'bg-green-100 text-green-800 border-green-500',
      'Good': 'bg-blue-100 text-blue-800 border-blue-500',
      'Fair': 'bg-yellow-100 text-yellow-800 border-yellow-500',
      'Poor': 'bg-red-100 text-red-800 border-red-500',
      '': 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
    }
    const isActive = current === value
    return (
      <button
        type="button"
        onClick={onClick}
        className={`px-3 py-1 text-xs font-bold border rounded transition-all ${
          isActive ? colors[value] + ' ring-2 ring-offset-1' : colors['']
        }`}
      >
        {value || '-'}
      </button>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white rounded-lg shadow">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <span className="ml-3 text-gray-700 font-medium">Loading report data...</span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-8">
      {/* Header - Auto-filled */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
          <User size={20} /> Student Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-500">Name:</span> <span className="font-bold text-gray-900">{studentName}</span></div>
          <div><span className="text-gray-500">Admission No:</span> <span className="font-bold text-gray-900">{admissionNumber}</span></div>
          <div><span className="text-gray-500">Class:</span> <span className="font-bold text-gray-900">{className}</span></div>
          <div><span className="text-gray-500">Term/Session:</span> <span className="font-bold text-gray-900">{term} {session}</span></div>
        </div>
      </div>

      {/* Section 1: Attendance - AUTO-CALCULATED */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Calendar size={20} /> 1. Attendance & Term Dates
          </h3>
          <button
            type="button"
            onClick={() => autoFillAttendance(true)}
            disabled={recalculating}
            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            {recalculating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Recalculate from Marked Attendance
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          ✅ Auto-calculated from daily attendance marked by the teacher/admin. <strong>Present</strong> includes late days; <strong>Punctual</strong> counts on-time days only.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">School Opened</label>
            <input type="number" value={formData.attendance_opened} onChange={e => setFormData({...formData, attendance_opened: parseInt(e.target.value) || 0})} className="w-full p-2 border rounded text-gray-900 bg-green-50 font-bold" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Present</label>
            <input type="number" value={formData.attendance_present} onChange={e => setFormData({...formData, attendance_present: parseInt(e.target.value) || 0})} className="w-full p-2 border rounded text-gray-900 bg-green-50 font-bold" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Punctual</label>
            <input type="number" value={formData.attendance_punctual} onChange={e => setFormData({...formData, attendance_punctual: parseInt(e.target.value) || 0})} className="w-full p-2 border rounded text-gray-900 bg-green-50 font-bold" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Term Begins</label>
            <input type="text" value={formData.term_begins} onChange={e => setFormData({...formData, term_begins: e.target.value})} placeholder="e.g. 6th April 2026" className="w-full p-2 border rounded text-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Term Ends</label>
            <input type="text" value={formData.term_ends} onChange={e => setFormData({...formData, term_ends: e.target.value})} placeholder="e.g. 6th July 2026" className="w-full p-2 border rounded text-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Next Term Begins</label>
            <input type="text" value={formData.next_term_begins} onChange={e => setFormData({...formData, next_term_begins: e.target.value})} placeholder="e.g. 8th Sept 2026" className="w-full p-2 border rounded text-gray-900" />
          </div>
        </div>
      </div>

      {/* Section 2 & 3: Conduct & Physical Skills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CheckSquare size={20} /> 2. Observations on Conduct
          </h3>
          <div className="space-y-2">
            {CONDUCT_QUALITIES.map(quality => (
              <div key={quality} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                <span className="text-sm font-medium text-gray-700 w-1/3">{quality}</span>
                <div className="flex gap-1">
                  {(['Excellent', 'Good', 'Fair', 'Poor'] as Rating[]).map(rating => (
                    <RatingButton 
                      key={rating} 
                      value={rating} 
                      current={formData.conduct_ratings[quality] || ''} 
                      onClick={() => updateRating('conduct_ratings', quality, rating)} 
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity size={20} /> 3. Performance in Physical Skills
          </h3>
          <div className="space-y-2">
            {PHYSICAL_SKILLS.map(skill => (
              <div key={skill} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                <span className="text-sm font-medium text-gray-700 w-1/3">{skill}</span>
                <div className="flex gap-1">
                  {(['Excellent', 'Good', 'Fair', 'Poor'] as Rating[]).map(rating => (
                    <RatingButton 
                      key={rating} 
                      value={rating} 
                      current={formData.physical_skills[skill] || ''} 
                      onClick={() => updateRating('physical_skills', skill, rating)} 
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 4: Comments */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <MessageSquare size={20} /> 4. Comments & Health
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">General Comments on Health</label>
            <textarea value={formData.health_comment} onChange={e => setFormData({...formData, health_comment: e.target.value})} rows={2} className="w-full p-2 border rounded text-gray-900" placeholder="e.g. Student is fit and healthy..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class Teacher's Comment</label>
            <textarea value={formData.teacher_comment} onChange={e => setFormData({...formData, teacher_comment: e.target.value})} rows={2} className="w-full p-2 border rounded text-gray-900" placeholder="e.g. Good performance..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Head Teacher's Comment {!isAdmin && <span className="text-xs font-bold text-gray-400">(Admin only)</span>}
            </label>
            <textarea
              value={formData.principal_comment}
              onChange={e => setFormData({...formData, principal_comment: e.target.value})}
              rows={2}
              disabled={!isAdmin}
              className={`w-full p-2 border rounded text-gray-900 ${!isAdmin ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
              placeholder={isAdmin ? 'e.g. Keep it up...' : 'Only the admin can edit this comment'}
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          {saving ? 'Saving...' : 'Save Report Card Data'}
        </button>
      </div>
    </div>
  )
}
