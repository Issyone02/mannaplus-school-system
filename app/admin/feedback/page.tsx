'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { 
  Inbox, Search, Filter, Send, CheckCircle, XCircle, Trash2, Paperclip, 
  AlertTriangle, Clock, User, ShieldAlert 
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { getThreads, getThreadDetails, postReply, updateThreadStatus, getSignedUrl } from '@/lib/feedback'
import { logAuditEvent } from '@/lib/auditLog'
import { sendNotification } from '@/lib/notifications'

interface Thread {
  id: string
  subject: string
  sender_name: string
  sender_role: 'teacher' | 'parent'
  status: 'open' | 'resolved' | 'archived'
  updated_at: string
  latest_message?: { message_text: string; created_at: string; sender_role: string }[]
}

interface Message {
  id: string
  sender_name: string
  sender_role: 'teacher' | 'parent' | 'admin'
  message_text: string
  attachment_url?: string
  attachment_type?: string
  created_at: string
}

export default function AdminFeedbackPage() {
  const router = useRouter()
  const { user } = useUser()
  const [threads, setThreads] = useState<Thread[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadingChat, setLoadingChat] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replyFile, setReplyFile] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'resolved'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch Threads List
  useEffect(() => {
    fetchThreads()
  }, [filterStatus])

  const fetchThreads = async () => {
    setLoadingList(true)
    try {
      const data = await getThreads('all') // Admin sees all
      setThreads(data)
    } catch (error: any) {
      toast.error('Failed to load inbox: ' + error.message)
    } finally {
      setLoadingList(false)
    }
  }

  // Select Thread & Load Messages
  const handleSelectThread = async (threadId: string) => {
    setSelectedThreadId(threadId)
    setLoadingChat(true)
    setMessages([])
    try {
      const { messages } = await getThreadDetails(threadId)
      
      // Resolve attachment URLs
      const enrichedMessages = await Promise.all(messages.map(async (m: Message) => {
        if (m.attachment_url) {
          const url = await getSignedUrl(m.attachment_url)
          return { ...m, attachment_url: url || undefined }
        }
        return m
      }))
      
      setMessages(enrichedMessages)
    } catch (error: any) {
      toast.error('Failed to load chat: ' + error.message)
    } finally {
      setLoadingChat(false)
    }
  }

  // Send Reply
  const handleSendReply = async () => {
    if (!replyText.trim() && !replyFile) {
      toast.error('Please enter a message or attach a file')
      return
    }
    if (!selectedThreadId) return

    setSending(true)
    try {
      const senderName = user?.fullName || 'Admin'
      
      await postReply({
        threadId: selectedThreadId,
        message: replyText,
        senderId: user!.id,
        senderRole: 'admin',
        senderName: senderName,
        file: replyFile || undefined
      })

      // Audit Log
      await logAuditEvent({
        userEmail: user?.primaryEmailAddress?.emailAddress || '',
        userRole: 'admin',
        action: 'reply_feedback',
        description: `Replied to feedback thread ${selectedThreadId}`,
        entityType: 'feedback',
        entityId: selectedThreadId,
      })

      // Notify Original Sender
      const currentThread = threads.find(t => t.id === selectedThreadId)
      if (currentThread) {
        await sendNotification({
          role: currentThread.sender_role, // teacher or parent
          title: 'Admin Response Received',
          message: `Your inquiry "${currentThread.subject}" has been answered by the administration.`,
          type: 'info',
          link: '/teacher/feedback' // Adjust based on role, simplified here
        })
      }

      toast.success('Reply sent!')
      setReplyText('')
      setReplyFile(null)
      
      // Refresh Chat
      const { messages } = await getThreadDetails(selectedThreadId)
       const enrichedMessages = await Promise.all(messages.map(async (m: Message) => {
        if (m.attachment_url) {
          const url = await getSignedUrl(m.attachment_url)
          return { ...m, attachment_url: url || undefined }
        }
        return m
      }))
      setMessages(enrichedMessages)
      fetchThreads() // Refresh list to update timestamp/status
    } catch (error: any) {
      toast.error('Failed to send: ' + error.message)
    } finally {
      setSending(false)
    }
  }

  // Mark Resolved
  const handleResolve = async () => {
    if (!selectedThreadId) return
    if (!confirm('Mark this thread as RESOLVED? The user will be notified.')) return

    try {
      await updateThreadStatus(selectedThreadId, 'resolved')
      
      await logAuditEvent({
        userEmail: user?.primaryEmailAddress?.emailAddress || '',
        userRole: 'admin',
        action: 'resolve_feedback',
        description: `Resolved feedback thread ${selectedThreadId}`,
        entityType: 'feedback',
        entityId: selectedThreadId,
      })

      toast.success('Thread marked as resolved.')
      fetchThreads()
      setSelectedThreadId(null) // Close detail view
    } catch (error: any) {
      toast.error('Failed to resolve: ' + error.message)
    }
  }

  // Delete Thread (Hard Delete)
  const handleDelete = async () => {
    if (!selectedThreadId) return
    if (!confirm('PERMANENTLY DELETE this conversation? This cannot be undone.')) return

    try {
      const { error } = await supabase.from('feedback_threads').delete().eq('id', selectedThreadId)
      if (error) throw error

      await logAuditEvent({
        userEmail: user?.primaryEmailAddress?.emailAddress || '',
        userRole: 'admin',
        action: 'delete_feedback',
        description: `Deleted feedback thread ${selectedThreadId}`,
        entityType: 'feedback',
        entityId: selectedThreadId,
        severity: 'HIGH',
      })

      toast.success('Conversation deleted.')
      setSelectedThreadId(null)
      fetchThreads()
    } catch (error: any) {
      toast.error('Failed to delete: ' + error.message)
    }
  }

  // Filter Logic
  const filteredThreads = threads.filter(t => {
    const matchesSearch = t.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.sender_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const activeThread = threads.find(t => t.id === selectedThreadId)

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <Toaster position="top-right" />
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Inbox size={32} className="text-blue-600"/> Feedback Inbox
          </h1>
          <p className="text-gray-600">Manage inquiries from Teachers and Parents</p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setFilterStatus('all')} className={`px-3 py-1 rounded text-sm font-bold ${filterStatus==='all'?'bg-blue-600 text-white':'bg-gray-200 text-gray-700'}`}>All</button>
           <button onClick={() => setFilterStatus('open')} className={`px-3 py-1 rounded text-sm font-bold ${filterStatus==='open'?'bg-yellow-500 text-white':'bg-gray-200 text-gray-700'}`}>Open</button>
           <button onClick={() => setFilterStatus('resolved')} className={`px-3 py-1 rounded text-sm font-bold ${filterStatus==='resolved'?'bg-green-600 text-white':'bg-gray-200 text-gray-700'}`}>Resolved</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        
        {/* LEFT COLUMN: THREAD LIST */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow border border-gray-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
              <input 
                type="text" 
                placeholder="Search subjects..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm text-gray-900 placeholder-gray-400 bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {loadingList ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No conversations found.</div>
            ) : (
              filteredThreads.map(thread => (
                <div 
                  key={thread.id}
                  onClick={() => handleSelectThread(thread.id)}
                  className={`p-4 cursor-pointer hover:bg-blue-50 transition-colors ${selectedThreadId === thread.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-gray-900 line-clamp-1">{thread.subject}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ml-2 whitespace-nowrap ${
                      thread.status === 'open' ? 'bg-yellow-100 text-yellow-800' : 
                      thread.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {thread.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <span className="capitalize bg-gray-100 px-1.5 py-0.5 rounded">{thread.sender_role}</span>
                    <span>{thread.sender_name}</span>
                  </div>
                  {thread.latest_message?.[0] && (
                    <p className="text-sm text-gray-600 line-clamp-2 italic">"{thread.latest_message[0].message_text}"</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">{new Date(thread.updated_at).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CHAT VIEW */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow border border-gray-200 flex flex-col overflow-hidden">
          {!selectedThreadId ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Inbox size={64} className="mx-auto mb-4 opacity-20"/>
                <p>Select a conversation to view details</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{activeThread?.subject}</h3>
                  <p className="text-sm text-gray-600">
                    From: <strong>{activeThread?.sender_name}</strong> ({activeThread?.sender_role})
                  </p>
                </div>
                <div className="flex gap-2">
                  {activeThread?.status === 'open' && (
                    <button onClick={handleResolve} className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-green-700">
                      <CheckCircle size={16}/> Resolve
                    </button>
                  )}
                  <button onClick={handleDelete} className="flex items-center gap-1 bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-red-700">
                    <Trash2 size={16}/> Delete
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {loadingChat ? (
                  <div className="text-center py-8 text-gray-500">Loading history...</div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender_role === 'admin'
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-xl p-3 shadow-sm ${
                          isMine ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 border border-gray-200'
                        }`}>
                          <div className="flex justify-between items-center mb-1 gap-4">
                            <span className={`text-xs font-bold ${isMine ? 'text-blue-100' : 'text-gray-500'}`}>
                              {msg.sender_name} • {msg.sender_role.toUpperCase()}
                            </span>
                            <span className={`text-[10px] ${isMine ? 'text-blue-200' : 'text-gray-400'}`}>
                              {new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                          
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.message_text}</p>
                          
                          {msg.attachment_url && (
                            <div className="mt-2 pt-2 border-t border-opacity-20 border-current">
                              {msg.attachment_type?.startsWith('image/') ? (
                                <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
                                  <img src={msg.attachment_url} alt="Attachment" className="max-h-40 rounded object-cover cursor-pointer hover:opacity-90" />
                                </a>
                              ) : (
                                <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs underline">
                                  <Paperclip size={12}/> View Document ({msg.attachment_type?.split('/')[1]?.toUpperCase()})
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 border-t bg-white">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <textarea 
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your response..."
                      rows={2}
                      className="w-full p-2 border rounded-lg text-sm text-gray-900 placeholder-gray-400 bg-white focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <div className="flex items-center gap-2 mt-1">
                       <label className="cursor-pointer text-gray-500 hover:text-gray-700 flex items-center gap-1 text-xs">
                         <Paperclip size={14}/> Attach File (JPG/PNG/PDF)
                         <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={(e) => setReplyFile(e.target.files?.[0] || null)} />
                       </label>
                       {replyFile && <span className="text-xs text-green-600 truncate max-w-[150px]">📎 {replyFile.name}</span>}
                    </div>
                  </div>
                  <button 
                    onClick={handleSendReply}
                    disabled={sending}
                    className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 self-end mb-1"
                  >
                    {sending ? '...' : <Send size={20}/>}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}