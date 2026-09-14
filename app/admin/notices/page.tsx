'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit, Trash2, Pin, AlertTriangle, Users, X, Save } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

interface Notice {
  id: string
  title: string
  content: string
  audience: 'all' | 'parents' | 'teachers' | 'students' | 'specific_class'
  target_class?: string
  is_pinned: boolean
  is_urgent: boolean
  created_by?: string
  created_at: string
  expires_at?: string
}

interface ClassItem {
  id: string
  class_name: string
  arm: string | null
  department: string | null
}

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([]) // ✅ NEW: Dynamic classes
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAudience, setFilterAudience] = useState<string>('all')

  const audienceOptions = [
    { value: 'all', label: 'Everyone', icon: Users },
    { value: 'parents', label: 'Parents Only', icon: Users },
    { value: 'teachers', label: 'Teachers Only', icon: Users },
    { value: 'students', label: 'Students Only', icon: Users },
    { value: 'specific_class', label: 'Specific Class', icon: Users },
  ]

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    audience: 'all' as 'all' | 'parents' | 'teachers' | 'students' | 'specific_class',
    target_class: '',
    is_pinned: false,
    is_urgent: false,
    expires_at: ''
  })

  useEffect(() => {
    fetchClasses() // ✅ Fetch classes on load
    fetchNotices()
  }, [])

  // ✅ NEW: Fetch classes dynamically from database
  const fetchClasses = async () => {
    const { data, error } = await supabase
      .from('classes')
      .select('id, class_name, arm, department')
      .order('class_name')
    
    if (error) console.error('Failed to load classes', error)
    else setClasses(data || [])
  }

  const fetchNotices = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotices(data || [])
    } catch (error: any) {
      toast.error('Failed to load notices: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingNotice) {
        const { error } = await supabase
          .from('notices')
          .update({
            title: formData.title,
            content: formData.content,
            audience: formData.audience,
            target_class: formData.audience === 'specific_class' ? formData.target_class : null,
            is_pinned: formData.is_pinned,
            is_urgent: formData.is_urgent,
            expires_at: formData.expires_at || null
          })
          .eq('id', editingNotice.id)

        if (error) throw error
        toast.success('Notice updated!')
      } else {
        const { error } = await supabase.from('notices').insert([{
          title: formData.title,
          content: formData.content,
          audience: formData.audience,
          target_class: formData.audience === 'specific_class' ? formData.target_class : null,
          is_pinned: formData.is_pinned,
          is_urgent: formData.is_urgent,
          expires_at: formData.expires_at || null,
          created_by: 'admin'
        }])

        if (error) throw error
        toast.success('Notice created!')
      }

      setShowModal(false)
      setEditingNotice(null)
      setFormData({ title: '', content: '', audience: 'all', target_class: '', is_pinned: false, is_urgent: false, expires_at: '' })
      fetchNotices()
    } catch (error: any) {
      toast.error('Failed: ' + error.message)
    }
  }

  const handleEdit = (notice: Notice) => {
    setEditingNotice(notice)
    setFormData({
      title: notice.title,
      content: notice.content,
      audience: notice.audience,
      target_class: notice.target_class || '',
      is_pinned: notice.is_pinned,
      is_urgent: notice.is_urgent,
      expires_at: notice.expires_at || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this notice?')) return
    try {
      await supabase.from('notices').delete().eq('id', id)
      toast.success('Notice deleted!')
      fetchNotices()
    } catch (error: any) {
      toast.error('Failed: ' + error.message)
    }
  }

  const handleTogglePin = async (notice: Notice) => {
    try {
      await supabase
        .from('notices')
        .update({ is_pinned: !notice.is_pinned })
        .eq('id', notice.id)
      toast.success(notice.is_pinned ? 'Unpinned' : 'Pinned!')
      fetchNotices()
    } catch (error: any) {
      toast.error('Failed: ' + error.message)
    }
  }

  const filteredNotices = notices.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          n.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesAudience = filterAudience === 'all' || n.audience === filterAudience
    return matchesSearch && matchesAudience
  })

  const getAudienceLabel = (audience: string) => {
    const opt = audienceOptions.find(o => o.value === audience)
    return opt?.label || audience
  }

  // ✅ NEW: Helper to format class name beautifully
  const formatClassName = (classId: string) => {
    const cls = classes.find(c => c.id === classId)
    if (!cls) return classId // Fallback to ID if not found
    return `${cls.class_name} ${cls.arm ? `(${cls.arm})` : ''} ${cls.department ? `- ${cls.department}` : ''}`
  }

  if (loading) return <div className="p-8 text-gray-900 font-bold">Loading notices...</div>

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notices & Announcements</h1>
          <p className="text-gray-600">Manage school-wide communications</p>
        </div>
        <button 
          onClick={() => { setEditingNotice(null); setFormData({ title: '', content: '', audience: 'all', target_class: '', is_pinned: false, is_urgent: false, expires_at: '' }); setShowModal(true) }}
          className="bg-blue-600 text-white px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={18}/> Create Notice
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[250px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
            <input 
              type="text" 
              placeholder="Search notices..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded text-gray-900"
            />
          </div>
        </div>
        <div>
          <select 
            value={filterAudience} 
            onChange={(e) => setFilterAudience(e.target.value)}
            className="p-2 border rounded text-gray-900"
          >
            <option value="all">All Audiences</option>
            {audienceOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Notices Grid */}
      <div className="grid gap-4">
        {filteredNotices.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Users size={64} className="mx-auto text-gray-300 mb-4"/>
            <p className="text-gray-900 font-bold text-lg">No notices found</p>
            <p className="text-gray-600">Create your first announcement!</p>
          </div>
        ) : (
          filteredNotices.map(notice => (
            <div 
              key={notice.id} 
              className={`bg-white rounded-lg shadow p-6 border-l-4 ${
                notice.is_pinned ? 'border-yellow-500' :
                notice.is_urgent ? 'border-red-500' :
                'border-blue-500'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900">{notice.title}</h3>
                  {notice.is_pinned && <Pin size={16} className="text-yellow-500"/>}
                  {notice.is_urgent && <AlertTriangle size={16} className="text-red-500"/>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded">
                    {getAudienceLabel(notice.audience)}
                  </span>
                  {notice.target_class && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-bold rounded">
                      {/* ✅ UPDATED: Display formatted class name */}
                      {formatClassName(notice.target_class)}
                    </span>
                  )}
                </div>
              </div>
              
              <p className="text-gray-700 mb-4 whitespace-pre-wrap">{notice.content}</p>
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  <span>Posted: {new Date(notice.created_at).toLocaleDateString()}</span>
                  {notice.expires_at && (
                    <span className="ml-4">Expires: {new Date(notice.expires_at).toLocaleDateString()}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleTogglePin(notice)}
                    className={`p-2 rounded font-bold ${notice.is_pinned ? 'text-yellow-600 bg-yellow-50' : 'text-gray-600 hover:bg-gray-100'}`}
                    title={notice.is_pinned ? 'Unpin' : 'Pin'}
                  >
                    <Pin size={16}/>
                  </button>
                  <button 
                    onClick={() => handleEdit(notice)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded font-bold"
                    title="Edit"
                  >
                    <Edit size={16}/>
                  </button>
                  <button 
                    onClick={() => handleDelete(notice.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded font-bold"
                    title="Delete"
                  >
                    <Trash2 size={16}/>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {editingNotice ? 'Edit Notice' : 'Create Notice'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-700 hover:text-gray-900">
                <X size={24}/>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                  className="w-full p-2 border rounded text-gray-900"
                  placeholder="e.g., PTA Meeting Notice"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
                <textarea 
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  required
                  rows={5}
                  className="w-full p-2 border rounded text-gray-900"
                  placeholder="Enter the full notice content..."
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Audience *</label>
                  <select 
                    value={formData.audience}
                    onChange={(e) => setFormData({...formData, audience: e.target.value as any})}
                    className="w-full p-2 border rounded text-gray-900"
                  >
                    {audienceOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                
                {formData.audience === 'specific_class' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Class</label>
                    <select 
                      value={formData.target_class}
                      onChange={(e) => setFormData({...formData, target_class: e.target.value})}
                      className="w-full p-2 border rounded text-gray-900"
                    >
                      <option value="">Select Class</option>
                      {/* ✅ UPDATED: Dynamic class dropdown */}
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.class_name} {c.arm ? `(${c.arm})` : ''} {c.department ? `- ${c.department}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (Optional)</label>
                  <input 
                    type="date" 
                    value={formData.expires_at}
                    onChange={(e) => setFormData({...formData, expires_at: e.target.value})}
                    className="w-full p-2 border rounded text-gray-900"
                  />
                </div>
              </div>
              
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={formData.is_pinned}
                    onChange={(e) => setFormData({...formData, is_pinned: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">Pin to Top</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={formData.is_urgent}
                    onChange={(e) => setFormData({...formData, is_urgent: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">Mark as Urgent</span>
                </label>
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
                  <Save size={16}/> {editingNotice ? 'Update' : 'Create'} Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}