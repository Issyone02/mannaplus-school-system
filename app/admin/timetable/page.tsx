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
}

interface SessionItem {
  session_name: string
}

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
    { value: 'saturday', label: 'Saturday' },
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
        .select('id, class_name, arm, department')
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
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const periods = [1, 2, 3, 4, 5, 6]
    
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

  if (loading) return <div className="p-8 text-gray-900 font-bold">Loading timetable...</div>

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Timetable Management</h1>
          <p className="text-gray-600">Create and manage class schedules</p>
        </div>
        <button 
          onClick={() => { setEditingEntry(null); setShowModal(true) }}
          className="bg-blue-600 text-white px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={18}/> Add Period
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
            className="p-2 border rounded text-gray-900"
          >
            {termOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
          <select 
            value={selectedSession} 
            onChange={(e) => setSelectedSession(e.target.value)}
            className="p-2 border rounded text-gray-900 min-w-[150px]"
          >
            {sessions.map(s => <option key={s.session_name} value={s.session_name}>{s.session_name}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
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
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(day => (
                <th key={day} className="p-3 text-center font-bold capitalize">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6].map(period => (
              <tr key={period} className="border-t">
                <td className="p-3 font-bold text-gray-900 bg-gray-50">
                  Period {period}
                  <p className="text-xs text-gray-500">0{8 + period - 1}:00 - 0{9 + period - 1}:00</p>
                </td>
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(day => {
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
                              start_time: `0${8 + period - 1}:00`,
                              end_time: `0${9 + period - 1}:00`
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
            ))}
          </tbody>
        </table>
      </div>

      {/* List View (for search results) */}
      {searchTerm && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-bold text-gray-900 mb-3">Search Results</h3>
          <div className="space-y-2">
            {filteredEntries.length === 0 ? (
              <p className="text-gray-500 text-sm">No matching periods found.</p>
            ) : (
              filteredEntries.map(entry => (
                <div key={entry.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-bold text-gray-900">{entry.subject_name}</p>
                    <p className="text-sm text-gray-600">
                      {entry.day_of_week} • Period {entry.period_number} • {entry.start_time} - {entry.end_time}
                    </p>
                    {entry.teacher_name && <p className="text-sm text-gray-600">👨‍🏫 {entry.teacher_name}</p>}
                    {entry.room_number && <p className="text-sm text-gray-600">📍 {entry.room_number}</p>}
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
                    onChange={(e) => setFormData({...formData, period_number: parseInt(e.target.value)})}
                    className="w-full p-2 border rounded text-gray-900"
                  >
                    {[1,2,3,4,5,6].map(p => <option key={p} value={p}>Period {p}</option>)}
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
              
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded font-bold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 flex items-center gap-2"
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