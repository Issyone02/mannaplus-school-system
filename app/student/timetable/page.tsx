'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Clock } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

export default function StudentTimetablePage() {
  const { user } = useUser()
  const [timetable, setTimetable] = useState<any[]>([])
  const [student, setStudent] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchTimetable()
    }
  }, [user])

  const fetchTimetable = async () => {
    try {
      // 1. Get user record
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', user?.id)
        .single()

      if (!userData) return

      // 2. Get student record
      const { data: studentData } = await supabase
        .from('students')
        .select('id, full_name, class_id')
        .eq('user_id', userData.id)
        .single()

      if (!studentData) return
      setStudent(studentData)

      // 3. Fetch timetable for student's class
      const { data: timetableData } = await supabase
        .from('timetable')
        .select(`
          day_of_week,
          start_time,
          end_time,
          room_number,
          subject:subjects(name)
        `)
        .eq('class_id', studentData.class_id)
        .order('day_of_week')
        .order('start_time')

      setTimetable(timetableData || [])
    } catch (error) {
      console.error('Error fetching timetable:', error)
      toast.error('Failed to load timetable')
    } finally {
      setLoading(false)
    }
  }

  const getDayName = (day: string) => {
    const days: { [key: string]: string } = {
      'monday': 'Monday',
      'tuesday': 'Tuesday',
      'wednesday': 'Wednesday',
      'thursday': 'Thursday',
      'friday': 'Friday',
      'saturday': 'Saturday'
    }
    return days[day] || day
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      <div className="bg-white shadow border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button 
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft size={20}/> Back to Dashboard
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Timetable</h1>
          <p className="text-gray-600">{student?.full_name}</p>
        </div>

        {timetable.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Clock size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600 text-lg">No timetable available yet</p>
            <p className="text-gray-500 text-sm mt-2">Your class timetable will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {days.map(day => {
              const dayClasses = timetable.filter(t => t.day_of_week === day)
              if (dayClasses.length === 0) return null

              return (
                <div key={day} className="bg-white rounded-xl shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 capitalize border-b pb-2">
                    {getDayName(day)}
                  </h2>
                  <div className="space-y-3">
                    {dayClasses.map((slot, index) => (
                      <div key={index} className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                        <p className="font-bold text-gray-900">{slot.subject?.name || 'Unknown'}</p>
                        <p className="text-sm text-gray-700 flex items-center gap-2 mt-1">
                          <Clock size={14} />
                          {slot.start_time} - {slot.end_time}
                        </p>
                        {slot.room_number && (
                          <p className="text-sm text-gray-600 mt-1">Room: {slot.room_number}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}