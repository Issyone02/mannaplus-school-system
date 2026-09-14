'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'

interface AttendanceRecord {
  date: string
  status: 'present' | 'absent' | 'late' | 'excused'
}

interface StudentAttendanceCalendarProps {
  studentId: string
  compact?: boolean
}

export default function StudentAttendanceCalendar({ studentId, compact = false }: StudentAttendanceCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAttendance()
  }, [studentId, currentMonth])

  const fetchAttendance = async () => {
    setLoading(true)
    try {
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
        .toISOString()
        .split('T')[0]
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0]

      const { data, error } = await supabase
        .from('attendance')
        .select('date, status')
        .eq('student_id', studentId)
        .gte('date', startDate)
        .lte('date', endDate)

      if (error) throw error
      setAttendance(data || [])
    } catch (error) {
      console.error('Failed to load attendance:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay()
  }

  const getAttendanceForDay = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return attendance.find(a => a.date === dateStr)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500 hover:bg-green-600'
      case 'absent': return 'bg-red-500 hover:bg-red-600'
      case 'late': return 'bg-yellow-500 hover:bg-yellow-600'
      case 'excused': return 'bg-blue-500 hover:bg-blue-600'
      default: return 'bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle size={compact ? 10 : 14} className="text-white"/>
      case 'absent': return <XCircle size={compact ? 10 : 14} className="text-white"/>
      case 'late': return <Clock size={compact ? 10 : 14} className="text-white"/>
      case 'excused': return <AlertCircle size={compact ? 10 : 14} className="text-white"/>
      default: return null
    }
  }

  const renderCalendar = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)
    const days = []

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className={`${compact ? 'h-16' : 'h-24'} bg-gray-50 border border-gray-100`}></div>)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayAttendance = getAttendanceForDay(day)
      const isToday = new Date().toDateString() === new Date(year, month, day).toDateString()

      days.push(
        <div 
          key={day} 
          className={`${compact ? 'h-16' : 'h-24'} border border-gray-200 p-1 relative transition-all ${
            isToday ? 'ring-2 ring-blue-400 ring-offset-1' : ''
          }`}
        >
          <div className={`font-bold ${compact ? 'text-xs' : 'text-sm'} mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
            {day}
          </div>
          
          {dayAttendance ? (
            <div className={`${getStatusColor(dayAttendance.status)} ${compact ? 'h-[calc(100%-20px)]' : 'h-[calc(100%-24px)]'} rounded flex flex-col items-center justify-center`}>
              {getStatusIcon(dayAttendance.status)}
              {!compact && (
                <span className="text-xs font-bold text-white capitalize mt-0.5">
                  {dayAttendance.status}
                </span>
              )}
            </div>
          ) : (
            <div className={`text-gray-400 ${compact ? 'text-[10px]' : 'text-xs'} text-center mt-1`}>No record</div>
          )}
        </div>
      )
    }

    return days
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      {/* Calendar Header with Month Selector */}
<div className="flex justify-between items-center p-3 border-b border-gray-200 bg-gray-50">
  <button 
    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
    className="p-1.5 hover:bg-gray-200 rounded transition-colors"
  >
    <ChevronLeft size={20}/>
  </button>
  
  {/* Month & Year Selector */}
  <div className="flex items-center gap-2">
    <select
      value={currentMonth.getMonth()}
      onChange={(e) => {
        const newMonth = parseInt(e.target.value)
        setCurrentMonth(new Date(currentMonth.getFullYear(), newMonth, 1))
      }}
      className="text-sm font-bold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1"
    >
      {Array.from({ length: 12 }, (_, i) => (
        <option key={i} value={i}>
          {new Date(0, i).toLocaleDateString('en-US', { month: 'long' })}
        </option>
      ))}
    </select>
    
    <select
      value={currentMonth.getFullYear()}
      onChange={(e) => {
        const newYear = parseInt(e.target.value)
        setCurrentMonth(new Date(newYear, currentMonth.getMonth(), 1))
      }}
      className="text-sm font-bold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1"
    >
      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
        <option key={year} value={year}>{year}</option>
      ))}
    </select>
  </div>
  
  <button 
    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
    className="p-1.5 hover:bg-gray-200 rounded transition-colors"
  >
    <ChevronRight size={20}/>
  </button>
</div>

      {/* Calendar Grid */}
      <div className="p-3">
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className={`text-center font-bold ${compact ? 'text-[10px]' : 'text-sm'} py-1.5 bg-gray-100 rounded`}>
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {loading ? (
            <div className="col-span-7 text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading calendar...</p>
            </div>
          ) : (
            renderCalendar()
          )}
        </div>
      </div>
    </div>
  )
}