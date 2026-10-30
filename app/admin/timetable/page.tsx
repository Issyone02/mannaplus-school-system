'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit, Trash2, Save, X, Calendar, Clock, MapPin, User } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

interface TimetableEntry {
  id?: string
  class_id: string
  day_of_week: string
  period_number: number
  start_time: string
  end_time: string
  subject_name: string
  teacher_name?: string
  room_number?: string
  term: string
  session: string
  is_active: boolean
}

interface ClassItem {
  id: string
  class_name: string
  arm: string | null
  department: string | null
  class_level: string
}

interface SessionItem {
  session_name: string
}

// ✅ SMART SCHEDULE CONFIGURATIONS
type ScheduleSlot = { period: number; start: string; end: string; label: string } | { break: true; label: string; start: string; end: string };

// Primary / JSS / SSS Schedule
const seniorSchedule: ScheduleSlot[] = [
  { period: 1, start: '08:15', end: '09:00', label: 'Period 1' },
  { period: 2, start: '09:00', end: '09:45', label: 'Period 2' },
  { period: 3, start: '09:45', end: '10:30', label: 'Period 3' },
  { break: true, label: 'Short Break', start: '10:30', end: '10:45' },
  { period: 4, start: '10:45', end: '11:30', label: 'Period 4' },
  { period: 5, start: '11:30', end: '12:15', label: 'Period 5' },
  { break: true, label: 'Long Break', start: '12:15', end: '12:45' },
  { period: 6, start: '12:45', end: '13:30', label: 'Period 6' },
  { period: 7, start: '13:30', end: '14:15', label: 'Period 7' },
];

// ⚠️ Prep / KG / Nursery Schedule (Edit these times when you finalize them)
const earlyYearsSchedule: ScheduleSlot[] = [
  { period: 1, start: '08:00', end: '08:45', label: 'Period 1' },
  { period: 2, start: '08:45', end: '09:30', label: 'Period 2' },
  { break: true, label: 'Snack Break', start: '09:30', end: '10:00' },
  { period: 3, start: '10:00', end: '10:45', label: 'Period 3' },
  { period: 4, start: '10:45', end: '11:30', label: 'Period 4' },
  { break: true, label: 'Lunch / Rest', start: '11:30', end: '12:15' },
  { period: 5, start: '12:15', end: '13:00', label: 'Period 5' },
];

const getScheduleType = (className: string, classLevel?: string): 'senior' | 'early_years' => {
  const lowerName = (className || '').toLowerCase();
  const lowerLevel = (classLevel || '').toLowerCase();
  if (['nursery', 'kg', 'kindergarten', 'prep', 'creche', 'early years', 'daycare'].some(k => lowerName.includes(k) || lowerLevel.includes(k))) {
    return 'early_years';
  }
  return 'senior';
};

export default function TimetablePage() {
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([]) // ✅ NEW: Dynamic classes
  const [sessions, setSessions] = useState<SessionItem[]>([]) // ✅ NEW: Dynamic sessions
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null)
  
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('First Term')
  const [selectedSession, setSelectedSession] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const termOptions = ['First Term', 'Second Term', 'Third Term']
  const dayOptions = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
  ]

  const [formData, setFormData] = useState<TimetableEntry>({
    class_id: '',
    day_of_week: 'monday',
    period_number: 1,
    start_time: '08:00',
    end_time: '09:00',
    subject_name: '',
    teacher_name: '',
    room_number: '',
    term: 'First Term',
    session: '',
    is_active: true
  })

  // ✅ Fetch classes and sessions on mount
  useEffect(() => {
    fetchData()
  }, [])

  // ✅ Fetch timetable when filters change
  useEffect(() => {
    if (selectedClass && selectedTerm && selectedSession) {
      fetchTimetable()
    }
  }, [selectedClass, selectedTerm, selectedSession])

  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. Fetch Classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, class_name, arm, department, class_level')
        .order('class_name')
      
      if (classesError) throw classesError
      setClasses(classesData || [])
      if (classesData && classesData.length > 0) {
        setSelectedClass(classesData[0].id)
      }

      // 2. Fetch Sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('academic_sessions')
        .select('session_name')
        .order('created_at', { ascending: false })
      
      if (sessionsError) throw sessionsError
      
      if (sessionsData && sessionsData.length > 0) {
        setSessions(sessionsData)
        setSelectedSession(sessionsData[0].session_name)
      } else {
        // Fallback if no sessions exist yet
        const currentYear = new Date().getFullYear()
        const fallback = `${currentYear}/${currentYear + 1}`
        setSessions([{ session_name: fallback }])
        setSelectedSession(fallback)
      }

    } catch (error: any) {
      toast.error('Failed to load initial data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchTimetable = async () => {
    if (!selectedClass || !selectedTerm || !selectedSession) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('timetables')
        .select('*')
        .eq('class_id', selectedClass)
        .eq('term', selectedTerm)
        .eq('session', selectedSession)
        .eq('is_active', true)
        .order('day_of_week')
        .order('period_number')

      if (error) throw error
      setEntries(data || [])
    } catch (error: any) {
      toast.error('Failed to load timetable: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = { 
        ...formData, 
        class_id: selectedClass, 
        term: selectedTerm, 
        session: selectedSession 
      }

      if (editingEntry) {
        const { error } = await supabase
          .from('timetables')
          .update(payload)
          .eq('id', editingEntry.id!)
        if (error) throw error
        toast.success('Timetable updated!')
      } else {
        const { error } = await supabase.from('timetables').insert([payload])
        if (error) throw error
        toast.success('Period added!')
      }

      setShowModal(false)
      setEditingEntry(null)
      setFormData({
        class_id: selectedClass,
        day_of_week: 'monday',
        period_number: 1,
        start_time: '08:00',
        end_time: '09:00',
        subject_name: '',
        teacher_name: '',
        room_number: '',
        term: selectedTerm,
        session: selectedSession,
        is_active: true
      })
      fetchTimetable()
    } catch (error: any) {
      toast.error('Failed: ' + error.message)
    }
  }

  const handleEdit = (entry: TimetableEntry) => {
    setEditingEntry(entry)
    setFormData(entry)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this period?')) return
    try {
      await supabase.from('timetables').update({ is_active: false }).eq('id', id)
      toast.success('Period removed!')
      fetchTimetable()
    } catch (error: any) {
      toast.error('Failed: ' + error.message)
    }
  }

  // Generate timetable grid
  const generateTimetableGrid = () => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    const periods = [1, 2, 3, 4, 5, 6, 7] // ✅ Support up to 7 periods for Senior classes
    
    const grid: Record<string, Record<number, TimetableEntry | null>> = {}
    days.forEach(day => {
      grid[day] = {}
      periods.forEach(period => {
        const entry = entries.find(e => e.day_of_week === day && e.period_number === period)
        grid[day][period] = entry || null
      })
    })
    return grid
  }

  const timetableGrid = generateTimetableGrid()
  const filteredEntries = entries.filter(e => 
    e.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.teacher_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  // ✅ Helper to format class name beautifully
  const formatClassName = (classId: string) => {
    const cls = classes.find(c => c.id === classId)
    if (!cls) return classId
    return `${cls.class_name} ${cls.arm ? `(${cls.arm})` : ''} ${cls.department ? `- ${cls.department}` : ''}`
  }

  // ✅ Determine active schedule based on selected class
  const selectedClassObj = classes.find(c => c.id === selectedClass);
  const scheduleType = selectedClassObj ? getScheduleType(selectedClassObj.class_name, selectedClassObj.class_level) : 'senior';
  const activeSchedule = scheduleType === 'senior' ? seniorSchedule : earlyYearsSchedule;

  if (loading) return <div className="p-8 text-gray-900 font-bold">Loading timetable...</div>

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <Toaster position="top-right" />
      
            {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-3 md:gap-0 mb-6 text-center md:text-left">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Timetable Management</h1>
          <p className="text-gray-600">Create and manage class schedules</p>
        </div>
        <button
          onClick={() => { setEditingEntry(null); setShowModal(true) }}
          className="bg-blue-600 text-white px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-blue-700 w-full md:w-auto justify-center"
        >
          <Plus size={18} /> Add Period
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
          <select 
            value={selectedClass} 
            onChange={(e) => setSelectedClass(e.target.value)}
            className="p-2 border rounded text-gray-900 min-w-[200px]"
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.class_name} {c.arm ? `(${c.arm})` : ''} {c.department ? `- ${c.department}` : ''}
              </option>
            ))}
          </select>
        </div>
                <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
          <select 
            value={selectedTerm} 
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="p-2 border rounded text-gray-900 w-full md:w-auto"
          >
            {termOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
          <select 
            value={selectedSession} 
            onChange={(e) => setSelectedSession(e.target.value)}
            className="p-2 border rounded text-gray-900 w-full md:min-w-[150px]"
          >
            {sessions.map(s => <option key={s.session_name} value={s.session_name}>{s.session_name}</option>)}
          </select>
        </div>
        <div className="col-span-2 md:col-span-1 md:flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <input 
            type="text" 
            placeholder="Search subjects or teachers..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border rounded text-gray-900"
          />
        </div>
      </div>

    
      {/* Timetable Grid */}
      <div className="bg-white rounded-lg shadow overflow-x-auto mb-6">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="p-3 text-left font-bold">Period</th>
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(day => (
                <th key={day} className="p-3 text-center font-bold capitalize">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeSchedule.map((slot, index) => {
              // ✅ Render Break Rows (Spans across all days)
              if (!('period' in slot)) {
                return (
                  <tr key={`break-${index}`} className="bg-yellow-50 border-t border-yellow-200">
                    <td colSpan={7} className="p-2 text-center font-bold text-yellow-800 text-sm">
                      ⏸️ {slot.label} ({slot.start} - {slot.end})
                    </td>
                  </tr>
                );
              }

              // ✅ Render Period Rows
              const period = slot.period;
              return (
                <tr key={period} className="border-t">
                  <td className="p-3 font-bold text-gray-900 bg-gray-50">
                    {slot.label}
                    <p className="text-xs text-gray-500">{slot.start} - {slot.end}</p>
                  </td>
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(day => {
                    const entry = timetableGrid[day]?.[period]
                    return (
                      <td key={`${day}-${period}`} className="p-2 border-l">
                        {entry ? (
                          <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs">
                            <p className="font-bold text-blue-900">{entry.subject_name}</p>
                            {entry.teacher_name && (
                              <p className="text-blue-700 flex items-center gap-1">
                                <User size={10}/> {entry.teacher_name}
                              </p>
                            )}
                            {entry.room_number && (
                              <p className="text-blue-600 flex items-center gap-1">
                                <MapPin size={10}/> {entry.room_number}
                              </p>
                            )}
                            <div className="mt-2 flex gap-1">
                              <button 
                                onClick={() => handleEdit(entry)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Edit size={12}/>
                              </button>
                              <button 
                                onClick={() => handleDelete(entry.id!)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 size={12}/>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setFormData({
                                ...formData,
                                day_of_week: day,
                                period_number: period,
                                start_time: slot.start, // ✅ Auto-fills correct start time
                                end_time: slot.end     // ✅ Auto-fills correct end time
                              })
                              setShowModal(true)
                            }}
                            className="w-full h-full min-h-[80px] border-2 border-dashed border-gray-300 rounded text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors text-xs flex items-center justify-center"
                          >
                            + Add
                          </button>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="md:hidden -mt-4 mb-6 text-xs text-gray-500 text-center">← Swipe the timetable sideways to see all days →</p>

      {/* List View (for search results) */}
      {searchTerm && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-bold text-gray-900 mb-3">Search Results</h3>
          <div className="space-y-2">
            {filteredEntries.length === 0 ? (
              <p className="text-gray-500 text-sm">No matching periods found.</p>
            ) : (
              filteredEntries.map(entry => (
                <div key={entry.id} className="flex flex-wrap justify-between items-start gap-2 p-3 bg-gray-50 rounded">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 break-words">{entry.subject_name}</p>
                    <p className="text-xs md:text-sm text-gray-600">
                      {entry.day_of_week} • Period {entry.period_number} • {entry.start_time} - {entry.end_time}
                    </p>
                    {entry.teacher_name && <p className="text-xs md:text-sm text-gray-600">👨‍🏫 {entry.teacher_name}</p>}
                    {entry.room_number && <p className="text-xs md:text-sm text-gray-600">📍 {entry.room_number}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(entry)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit size={16}/></button>
                    <button onClick={() => handleDelete(entry.id!)} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {editingEntry ? 'Edit Period' : 'Add Period'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-700 hover:text-gray-900">
                <X size={24}/>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                  <select 
                    value={formData.day_of_week}
                    onChange={(e) => setFormData({...formData, day_of_week: e.target.value})}
                    className="w-full p-2 border rounded text-gray-900"
                  >
                    {dayOptions.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                  <select 
                    value={formData.period_number}
                    onChange={(e) => {
                      const pNum = parseInt(e.target.value);
                      const slot = activeSchedule.find(s => !('break' in s) && s.period === pNum) as any;
                      setFormData({
                        ...formData, 
                        period_number: pNum,
                        start_time: slot?.start || formData.start_time, // ✅ Auto-updates time when period changes
                        end_time: slot?.end || formData.end_time
                      });
                    }}
                    className="w-full p-2 border rounded text-gray-900"
                  >
                    {activeSchedule.filter(s => !('break' in s)).map((s: any) => (
                      <option key={s.period} value={s.period}>{s.label} ({s.start} - {s.end})</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input 
                    type="time" 
                    value={formData.start_time}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                    className="w-full p-2 border rounded text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input 
                    type="time" 
                    value={formData.end_time}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                    className="w-full p-2 border rounded text-gray-900"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <input 
                  type="text" 
                  value={formData.subject_name}
                  onChange={(e) => setFormData({...formData, subject_name: e.target.value})}
                  required
                  className="w-full p-2 border rounded text-gray-900"
                  placeholder="e.g., Mathematics"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
                  <input 
                    type="text" 
                    value={formData.teacher_name}
                    onChange={(e) => setFormData({...formData, teacher_name: e.target.value})}
                    className="w-full p-2 border rounded text-gray-900"
                    placeholder="e.g., Mr. Ade"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                  <input 
                    type="text" 
                    value={formData.room_number}
                    onChange={(e) => setFormData({...formData, room_number: e.target.value})}
                    className="w-full p-2 border rounded text-gray-900"
                    placeholder="e.g., Room 101"
                  />
                </div>
              </div>
              
              <div className="flex flex-col-reverse md:flex-row justify-end gap-3 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded font-bold text-gray-700 hover:bg-gray-50 w-full md:w-auto"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 flex items-center justify-center gap-2 w-full md:w-auto"
                >
                  <Save size={16}/> {editingEntry ? 'Update' : 'Add'} Period
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}