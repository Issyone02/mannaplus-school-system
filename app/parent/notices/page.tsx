'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Bell, AlertTriangle, Info, Pin } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

export default function ParentNoticesPage() {
  const router = useRouter()
  const { user } = useUser()
  const [notices, setNotices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchNotices()
    }
  }, [user])

  const fetchNotices = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', user?.id)
        .single()

      if (!userData) return

      // Fetch notices meant for parents or everyone
      const { data: noticesData, error } = await supabase
        .from('notices')
        .select('*')
        .or('audience.eq.all,audience.eq.parents')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotices(noticesData || [])
    } catch (error) {
      console.error('Error fetching notices:', error)
      toast.error('Failed to load notices')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      <div className="bg-white shadow border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft size={20}/> Back to Dashboard
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Notices & Announcements</h1>
          <p className="text-gray-600">Important updates from the school administration</p>
        </div>

        {notices.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Bell size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600 text-lg">No notices available</p>
            <p className="text-gray-500 text-sm mt-2">Check back later for updates</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notices.map((notice) => (
              <div key={notice.id} className={`bg-white rounded-xl shadow-md p-6 border-l-4 ${
                notice.is_urgent ? 'border-red-500' : 'border-purple-500'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full ${notice.is_urgent ? 'bg-red-100' : 'bg-purple-100'}`}>
                    {notice.is_urgent ? (
                      <AlertTriangle size={24} className="text-red-600" />
                    ) : (
                      <Info size={24} className="text-purple-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-xl font-bold text-gray-900">{notice.title}</h3>
                      {notice.is_pinned && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded flex items-center gap-1">
                          <Pin size={12} /> Pinned
                        </span>
                      )}
                      {notice.is_urgent && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded">
                          Urgent
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 mb-3 whitespace-pre-wrap">{notice.content}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                      <span>📅 Posted: {new Date(notice.created_at).toLocaleDateString()}</span>
                      {notice.expires_at && (
                        <span>⏰ Expires: {new Date(notice.expires_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}