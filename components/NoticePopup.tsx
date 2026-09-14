'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Bell, AlertTriangle, Pin } from 'lucide-react'

interface NoticePopupProps {
  userRole: 'student' | 'parent'
  userId: string
  classId?: string
  onClose?: () => void;
}

export default function NoticePopup({ userRole, userId, classId, onClose }: NoticePopupProps) {
  const [notices, setNotices] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    fetchUnreadNotices()
  }, [userRole, userId, classId])

  const fetchUnreadNotices = async () => {
    try {
      let audienceFilter = ''
      if (userRole === 'student') {
        audienceFilter = `audience.eq.all,audience.eq.students`
      } else if (userRole === 'parent') {
        audienceFilter = `audience.eq.all,audience.eq.parents`
      }

      if (classId) {
        audienceFilter += `,target_class.eq.${classId}`
      }

      const { data: noticesData, error } = await supabase
        .from('notices')
        .select('*')
        .or(audienceFilter)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        console.error('Error fetching notices:', error)
        return
      }

      const seenNotices = JSON.parse(localStorage.getItem(`seen_notices_${userId}`) || '[]')
      const unreadNotices = noticesData?.filter((notice) => !seenNotices.includes(notice.id)) || []

      if (unreadNotices.length > 0) {
        setNotices(unreadNotices)
        setIsOpen(true)
        setCurrentIndex(0)
      }
    } catch (error) {
      console.error('Error fetching notices:', error)
    }
  }

  const handleClose = () => {
    const currentNotice = notices[currentIndex]
    const seenNotices = JSON.parse(localStorage.getItem(`seen_notices_${userId}`) || '[]')
    
    if (currentNotice && !seenNotices.includes(currentNotice.id)) {
      seenNotices.push(currentNotice.id)
      localStorage.setItem(`seen_notices_${userId}`, JSON.stringify(seenNotices))
    }

    if (currentIndex < notices.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      setIsOpen(false)
      onClose?.()
    }
  }

  const handleSkip = () => {
    const remainingNotices = notices.slice(currentIndex)
    const seenNotices = JSON.parse(localStorage.getItem(`seen_notices_${userId}`) || '[]')
    
    remainingNotices.forEach((notice) => {
      if (!seenNotices.includes(notice.id)) {
        seenNotices.push(notice.id)
      }
    })
    
    localStorage.setItem(`seen_notices_${userId}`, JSON.stringify(seenNotices))
    setIsOpen(false)
    onClose?.()
  }

  if (!isOpen || notices.length === 0) return null

  const currentNotice = notices[currentIndex]

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${currentNotice.is_urgent ? 'bg-red-100' : 'bg-blue-100'}`}>
              {currentNotice.is_urgent ? (
                <AlertTriangle size={24} className="text-red-600" />
              ) : (
                <Bell size={24} className="text-blue-600" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Notice {currentIndex + 1} of {notices.length}</h2>
              <p className="text-sm text-gray-500">
                {currentNotice.is_pinned && 'Pinned • '}
                {new Date(currentNotice.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button 
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <h3 className="text-xl font-bold text-gray-900">{currentNotice.title}</h3>
            {currentNotice.is_urgent && (
              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded">
                Urgent
              </span>
            )}
            {currentNotice.audience && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded capitalize">
                {currentNotice.audience === 'all' ? 'Everyone' : currentNotice.audience}
              </span>
            )}
          </div>
          
          <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap mb-4">
            {currentNotice.content}
          </p>

          {currentNotice.expires_at && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <p className="text-sm text-yellow-800">
                <span className="font-bold">⏰ Expires:</span> {new Date(currentNotice.expires_at).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
          >
            {currentIndex < notices.length - 1 ? 'Next Notice →' : 'Got it!'}
          </button>
          
          {notices.length > 1 && (
            <div className="flex gap-1">
              {notices.map((_, idx) => (
                <div 
                  key={idx}
                  className={`w-2 h-2 rounded-full ${idx === currentIndex ? 'bg-blue-600' : 'bg-gray-300'}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}