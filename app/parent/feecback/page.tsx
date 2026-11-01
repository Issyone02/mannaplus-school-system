'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { 
  Plus, Send, CheckCircle, Paperclip, MessageSquare, X, Loader2 
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { getThreads, getThreadDetails, postReply, updateThreadStatus, getSignedUrl, createThread } from '@/lib/feedback'

interface Thread {
  id: string
  subject: string
  status: 'open' | 'resolved' | 'archived'
  updated_at: string
  sender_name: string
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

export default function ParentFeedbackPage() {
  const { user, isLoaded } = useUser()
  const [threads, setThreads] = useState<Thread[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadingChat, setLoadingChat] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replyFile, setReplyFile] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  
  // New Thread Modal State
  const [showNewModal, setShowNewModal] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [newFile, setNewFile] = useState<File | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (isLoaded && user) fetchMyThreads()
  }, [isLoaded, user])

  const fetchMyThreads = async () => {
    setLoadingList(true)
    try {
      const data = await getThreads('parent')
      const myThreads = data.filter(t => t.sender_id === user?.id || t.sender_name === user?.fullName)
      setThreads(myThreads)
    } catch (error: any) {
      console.error(error)
      toast.error('Failed to load feedback history')
    } finally {
      setLoadingList(false)
    }
  }

  const handleSelectThread = async (threadId: string) => {
    setSelectedThreadId(threadId)
    setLoadingChat(true)
    setMessages([])
    try {
      const { messages } = await getThreadDetails(threadId)
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

  const handleSendReply = async () => {
    if (!replyText.trim() && !replyFile) {
      toast.error('Please enter a message or attach a file')
      return
    }
    if (!selectedThreadId || !user) return

    setSending(true)
    try {
      await postReply({
        threadId: selectedThreadId,
        message: replyText,
        senderId: user.id,
        senderRole: 'parent',
        senderName: user.fullName || 'Parent',
        file: replyFile || undefined
      })

      toast.success('Reply sent!')
      setReplyText('')
      setReplyFile(null)
      
      const { messages } = await getThreadDetails(selectedThreadId)
      const enrichedMessages = await Promise.all(messages.map(async (m: Message) => {
        if (m.attachment_url) {
          const url = await getSignedUrl(m.attachment_url)
          return { ...m, attachment_url: url || undefined }
        }
        return m
      }))
      setMessages(enrichedMessages)
      fetchMyThreads()
    } catch (error: any) {
      toast.error('Failed to send: ' + error.message)
    } finally {
      setSending(false)
    }
  }

  const handleMarkResolved = async () => {
    if (!selectedThreadId) return
    if (!confirm('Mark this inquiry as RESOLVED?')) return

    try {
      await updateThreadStatus(selectedThreadId, 'resolved')
      toast.success('Inquiry marked as resolved.')
      fetchMyThreads()
      setSelectedThreadId(null)
    } catch (error: any) {
      toast.error('Failed to resolve: ' + error.message)
    }
  }

  const handleCreateNewThread = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubject.trim() || !newMessage.trim()) {
      toast.error('Subject and Message are required')
      return
    }
    if (!user) return

    setCreating(true)
    try {
      await createThread({
        subject: newSubject,
        message: newMessage,
        senderId: user.id,
        senderRole: 'parent',
        senderName: user.fullName || 'Parent',
        file: newFile || undefined
      })

      toast.success('Inquiry submitted successfully!')
      setShowNewModal(false)
      setNewSubject('')
      setNewMessage('')
      setNewFile(null)
      fetchMyThreads()
    } catch (error: any) {
      toast.error('Failed to submit: ' + error.message)
    } finally {
      setCreating(false)
    }
  }

  if (!isLoaded) return <div className="p-8 text-center">Loading...</div>

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <Toaster position="top-right" />
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare size={32} className="text-purple-600"/> Contact Admin
          </h1>
          <p className="text-gray-600">Ask questions or report issues</p>
        </div>
        <button 
          onClick={() => setShowNewModal(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-purple-700"
        >
          <Plus size={18}/> New Inquiry
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        
        {/* LEFT COLUMN: MY THREADS LIST */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow border border-gray-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
             <h3 className="font-bold text-gray-900">My Conversations</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {loadingList ? (
              <div className="p-8 text-center text-gray-500"><Loader2 className="animate-spin mx-auto"/></div>
            ) : threads.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <MessageSquare size={48} className="mx-auto mb-2 opacity-20"/>
                <p>No inquiries yet.</p>
              </div>
            ) : (
              threads.map(thread => (
                <div 
                  key={thread.id}
                  onClick={() => handleSelectThread(thread.id)}
                  className={`p-4 cursor-pointer hover:bg-purple-50 transition-colors ${selectedThreadId === thread.id ? 'bg-purple-50 border-l-4 border-purple-600' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-gray-900 line-clamp-1">{thread.subject}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ml-2 whitespace-nowrap ${
                      thread.status === 'open' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {thread.status.toUpperCase()}
                    </span>
                  </div>
                  {thread.latest_message?.[0] && (
                    <p className="text-sm text-gray-600 line-clamp-2 italic mt-1">"{thread.latest_message[0].message_text}"</p>
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
                <MessageSquare size={64} className="mx-auto mb-4 opacity-20"/>
                <p>Select a conversation to view details</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">
                    {threads.find(t => t.id === selectedThreadId)?.subject}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Status: <strong className={threads.find(t => t.id === selectedThreadId)?.status === 'open' ? 'text-yellow-600' : 'text-green-600'}>
                      {threads.find(t => t.id === selectedThreadId)?.status?.toUpperCase()}
                    </strong>
                  </p>
                </div>
                {threads.find(t => t.id === selectedThreadId)?.status === 'open' && (
                  <button 
                    onClick={handleMarkResolved}
                    className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-green-700"
                  >
                    <CheckCircle size={16}/> Mark Resolved
                  </button>
                )}
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {loadingChat ? (
                  <div className="text-center py-8 text-gray-500"><Loader2 className="animate-spin mx-auto"/></div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender_role === 'parent'
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-xl p-3 shadow-sm ${
                          isMine ? 'bg-purple-600 text-white' : 'bg-white text-gray-900 border border-gray-200'
                        }`}>
                          <div className="flex justify-between items-center mb-1 gap-4">
                            <span className={`text-xs font-bold ${isMine ? 'text-purple-100' : 'text-gray-500'}`}>
                              {msg.sender_name} • {msg.sender_role.toUpperCase()}
                            </span>
                            <span className={`text-[10px] ${isMine ? 'text-purple-200' : 'text-gray-400'}`}>
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
                      placeholder="Type your reply..."
                      rows={2}
                      className="w-full p-2 border rounded-lg text-sm text-gray-900 placeholder-gray-400 bg-white focus:ring-2 focus:ring-purple-500 resize-none"
                    />
                    <div className="flex items-center gap-2 mt-1">
                       <label className="cursor-pointer text-gray-500 hover:text-gray-700 flex items-center gap-1 text-xs">
                         <Paperclip size={14}/> Attach File
                         <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={(e) => setReplyFile(e.target.files?.[0] || null)} />
                       </label>
                       {replyFile && <span className="text-xs text-green-600 truncate max-w-[150px]">📎 {replyFile.name}</span>}
                    </div>
                  </div>
                  <button 
                    onClick={handleSendReply}
                    disabled={sending}
                    className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 self-end mb-1"
                  >
                    {sending ? <Loader2 className="animate-spin"/> : <Send size={20}/>}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* NEW INQUIRY MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">New Inquiry</h2>
              <button onClick={() => setShowNewModal(false)}><X size={24}/></button>
            </div>
            <form onSubmit={handleCreateNewThread} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Subject *</label>
                <input 
                  type="text" 
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g., Question about Fees"
                  className="w-full p-2 border rounded text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Message *</label>
                <textarea 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="How can we help you?"
                  rows={4}
                  className="w-full p-2 border rounded text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Attachment (Optional)</label>
                <input 
                  type="file" 
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
                <p className="text-xs text-gray-400 mt-1">Max 5MB. JPG, PNG, PDF only.</p>
              </div>
              <button 
                type="submit" 
                disabled={creating}
                className="w-full bg-purple-600 text-white py-2 rounded font-bold hover:bg-purple-700 disabled:opacity-50"
              >
                {creating ? 'Submitting...' : 'Submit Inquiry'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}