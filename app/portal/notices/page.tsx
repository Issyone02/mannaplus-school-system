'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Pin, AlertTriangle, Mail, Calendar, X } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

interface Notice {
  id: string
  title: string
  content: string
  audience: string
  is_pinned: boolean
  is_urgent: boolean
  created_at: string
  expires_at?: string
}

export default function ParentNoticesPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null)
  const [filter, setFilter] = useState<'all' | 'pinned' | 'urgent'>('all')

  useEffect(() => {
    if (isLoaded && user) {
      fetchNotices()
    }
  }, [user, isLoaded, filter])

  const fetchNotices = async () => {
    setLoading(true)
    try {
      const email = user?.emailAddresses[0]?.emailAddress
      if (!email) return

      // Get parent info to determine audience
      const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('email', email)
        .single()

      if (!parent) return

      // Fetch notices visible to parents
      let query = supabase
        .from('notices')
        .select('*')
        .in('audience', ['all', 'parents'])
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

      // Filter by expiry
      const today = new Date().toISOString().split('T')[0]
      query = query.or(`expires_at.is.null,expires_at.gte.${today}`)

      const { data, error } = await query

      if (error) throw error

      // Apply client-side filters
      let filtered = data || []
      if (filter === 'pinned') filtered = filtered.filter(n => n.is_pinned)
      if (filter === 'urgent') filtered = filtered.filter(n => n.is_urgent)

      setNotices(filtered)
    } catch (error: any) {
      toast.error('Failed to load notices: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  if (!isLoaded || loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-900">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
            <ArrowLeft size={20}/> Back to Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">📢 Announcements</h1>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow p-2 mb-6 flex gap-2">
          <button 
            onClick={() => setFilter('all')}
            className={`flex-1 py-2 rounded font-bold text-sm ${filter === 'all' ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            All Notices
          </button>
          <button 
            onClick={() => setFilter('pinned')}
            className={`flex-1 py-2 rounded font-bold text-sm flex items-center justify-center gap-1 ${filter === 'pinned' ? 'bg-yellow-100 text-yellow-800' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Pin size={14}/> Pinned
          </button>
          <button 
            onClick={() => setFilter('urgent')}
            className={`flex-1 py-2 rounded font-bold text-sm flex items-center justify-center gap-1 ${filter === 'urgent' ? 'bg-red-100 text-red-800' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <AlertTriangle size={14}/> Urgent
          </button>
        </div>

        {/* Notices List */}
        <div className="space-y-4">
          {notices.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Mail size={64} className="mx-auto text-gray-300 mb-4"/>
              <p className="text-gray-900 font-bold text-lg">No announcements</p>
              <p className="text-gray-600">Check back later for updates</p>
            </div>
          ) : (
            notices.map(notice => (
              <div 
                key={notice.id}
                onClick={() => setSelectedNotice(notice)}
                className={`bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow border-l-4 ${
                  notice.is_pinned ? 'border-yellow-500' :
                  notice.is_urgent ? 'border-red-500' :
                  'border-blue-500'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">{notice.title}</h3>
                    {notice.is_pinned && <Pin size={16} className="text-yellow-500"/>}
                    {notice.is_urgent && <AlertTriangle size={16} className="text-red-500"/>}
                  </div>
                  <span className="text-sm text-gray-500">{getRelativeTime(notice.created_at)}</span>
                </div>
                
                <p className="text-gray-700 line-clamp-2">{notice.content}</p>
                
                <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                  {notice.expires_at && (
                    <span className="flex items-center gap-1">
                      <Calendar size={14}/>
                      Expires: {new Date(notice.expires_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Notice Detail Modal */}
        {selectedNotice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {selectedNotice.is_pinned && <Pin size={20} className="text-yellow-500"/>}
                  {selectedNotice.is_urgent && <AlertTriangle size={20} className="text-red-500"/>}
                  <h2 className="text-xl font-bold text-gray-900">{selectedNotice.title}</h2>
                </div>
                <button onClick={() => setSelectedNotice(null)} className="text-gray-700 hover:text-gray-900">
                  <X size={24}/>
                </button>
              </div>
              
              <div className="p-6">
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar size={14}/>
                    Posted: {new Date(selectedNotice.created_at).toLocaleDateString()}
                  </span>
                  {selectedNotice.expires_at && (
                    <span className="flex items-center gap-1">
                      <Calendar size={14}/>
                      Expires: {new Date(selectedNotice.expires_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                
                <div className="prose max-w-none">
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedNotice.content}</p>
                </div>
              </div>
              
              <div className="border-t p-4 bg-gray-50">
                <button 
                  onClick={() => setSelectedNotice(null)}
                  className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}