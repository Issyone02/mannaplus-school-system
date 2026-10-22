'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, ExternalLink } from 'lucide-react'

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'urgent'
  link?: string
  is_read: boolean
  created_at: string
}

export default function NotificationBell({ light = false }: { light?: boolean }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // ✅ Fetch notifications with cache-busting
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?_=' + Date.now()) // Cache-bust
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
        console.log(`🔔 Bell updated: ${data.unreadCount} unread`)
      } else {
        console.error('Failed to fetch notifications:', res.status)
      }
    } catch (error) {
      console.error('Notification fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  // ✅ Initial fetch + polling every 15 seconds (faster than 30s)
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 15000) // Poll every 15s
    return () => clearInterval(interval)
  }, [])

  // ✅ Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ✅ Mark as read AND re-fetch to update count
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: notification.id }),
        })
        
        // ✅ Immediately update local state
        setUnreadCount(prev => Math.max(0, prev - 1))
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        )
      } catch (error) {
        console.error('Failed to mark as read:', error)
      }
    }

    // Navigate if link exists
    if (notification.link) {
      router.push(notification.link)
    }
    
    setIsOpen(false)
  }

  // ✅ Mark all as read AND re-fetch
  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length === 0) return

    try {
      await Promise.all(
        unreadIds.map(id => 
          fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
          })
        )
      )
      
      // ✅ Immediately update local state
      setUnreadCount(0)
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      
      // ✅ Re-fetch to sync with server
      await fetchNotifications()
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

  const getIconColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-500 bg-green-50'
      case 'warning': return 'text-yellow-500 bg-yellow-50'
      case 'urgent': return 'text-red-500 bg-red-50'
      default: return 'text-blue-500 bg-blue-50'
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-full transition-colors ${
          light 
            ? 'text-white hover:bg-white/10' 
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        }`}
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-bold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500 text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No notifications yet</div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors flex gap-3 ${
                    !notification.is_read ? 'bg-blue-50/30' : ''
                  }`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getIconColor(notification.type)}`}>
                    <Bell size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${!notification.is_read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1.5"></span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-gray-400">{getTimeAgo(notification.created_at)}</span>
                      {notification.link && <ExternalLink size={10} className="text-gray-400" />}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}