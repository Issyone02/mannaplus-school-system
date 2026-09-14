'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'

interface StudentAttendanceSummaryProps {
  isOpen: boolean
  onClose: () => void
  student: {
    id: string
    full_name: string
    admission_number: string
  } | null
}

export default function StudentAttendanceSummary({ isOpen, onClose, student }: StudentAttendanceSummaryProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)) // e.g., '2026-07'
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, excused: 0 })
  const [loading, setLoading] = useState(false)

  // Generate month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    return d.toISOString().slice(0, 7)
  })

  useEffect(() => {
    if (isOpen && student) {
      fetchMonthlyStats()
    }
  }, [isOpen, student, selectedMonth])

  const fetchMonthlyStats = async () => {
    if (!student) return
    setLoading(true)
    try {
      const startOfMonth = `${selectedMonth}-01`
      // Get last day of month
      const [year, month] = selectedMonth.split('-').map(Number)
      const lastDay = new Date(year, month, 0).getDate()
      const endOfMonth = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`

      const { data, error } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', student.id)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)

      if (error) throw error

      const counts = { present: 0, absent: 0, late: 0, excused: 0 }
      ;(data || []).forEach((record: any) => {
        const status = record.status as 'present' | 'absent' | 'late' | 'excused'
        if (counts[status] !== undefined) {
          counts[status]++
        }
      })

      setStats(counts)
    } catch (error: any) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !student) return null

  const totalDays = stats.present + stats.absent + stats.late + stats.excused

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Attendance Summary</h2>
            <p className="text-sm text-gray-600 mt-1">
              {student.full_name} <br/>
              <span className="text-gray-500">{student.admission_number}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {/* Month Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Month</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full p-2 border rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500"
          >
            {monthOptions.map((m, index) => (
            <option key={`${m}-${index}`} value={m}>
            {new Date(m + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </option>
            ))}
          </select>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading stats...</div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Present */}
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center">
              <div className="flex justify-center mb-2">
                <CheckCircle size={24} className="text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-700">{stats.present}</p>
              <p className="text-xs text-green-600 font-medium">Present</p>
            </div>

            {/* Absent */}
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-center">
              <div className="flex justify-center mb-2">
                <XCircle size={24} className="text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-700">{stats.absent}</p>
              <p className="text-xs text-red-600 font-medium">Absent</p>
            </div>

            {/* Late */}
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 text-center">
              <div className="flex justify-center mb-2">
                <Clock size={24} className="text-yellow-600" />
              </div>
              <p className="text-2xl font-bold text-yellow-700">{stats.late}</p>
              <p className="text-xs text-yellow-600 font-medium">Late</p>
            </div>

            {/* Excused */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center">
              <div className="flex justify-center mb-2">
                <AlertCircle size={24} className="text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-700">{stats.excused}</p>
              <p className="text-xs text-blue-600 font-medium">Excused</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 border-t pt-4">
          Total marked days: <span className="font-bold text-gray-900">{totalDays}</span>
        </div>
      </div>
    </div>
  )
}