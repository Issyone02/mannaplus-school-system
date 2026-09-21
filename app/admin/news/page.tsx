'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { Newspaper, Plus, Edit, Trash2, X, Upload, Image as ImageIcon, Eye, EyeOff, Loader2, Search } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

interface NewsArticle {
  id: string
  title: string
  slug: string
  category: string
  excerpt: string | null
  content: string
  image_url: string | null
  gallery_urls: string[] | null
  author_name: string | null
  is_published: boolean
  published_at: string | null
  created_at: string
}

const categoryOptions = ['Events', 'Excursion', 'Competition', 'Sports', 'Academics', 'Party', 'Announcement']

const emptyForm = {
  title: '',
  category: 'Events',
  excerpt: '',
  content: '',
  image_url: '',
  gallery_urls: [] as string[],
  author_name: '',
  is_published: false,
}

export default function AdminNewsPage() {
  const { user } = useUser()
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [form, setForm] = useState(emptyForm)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchArticles()
  }, [])

  const fetchArticles = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('news_articles')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) toast.error('Failed to load articles: ' + error.message)
    else setArticles((data || []) as NewsArticle[])
    setLoading(false)
  }

  // ✅ Generates a unique, readable slug
  const generateSlug = async (title: string, excludeId?: string | null) => {
    const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'article'
    let slug = base
    let counter = 2
    for (;;) {
      const { data } = await supabase
        .from('news_articles')
        .select('id')
        .eq('slug', slug)
        .neq('id', excludeId || '00000000-0000-0000-0000-000000000000')
        .maybeSingle()
      if (!data) break
      slug = `${base}-${counter}`
      counter++
      if (counter > 10) { slug = `${base}-${Date.now()}`; break }
    }
    return slug
  }

  // ✅ Upload cover image to Supabase Storage
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return }
    setUploading(true)
    try {
      const path = `news/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]+/g, '')}`
      const { error } = await supabase.storage.from('school-assets').upload(path, file)
      if (error) throw error
      const { data } = supabase.storage.from('school-assets').getPublicUrl(path)
      setForm(prev => ({ ...prev, image_url: data.publicUrl }))
      toast.success('Image uploaded!')
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ✅ NEW: Upload several gallery photos at once
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const newUrls: string[] = []
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue
        const path = `news/${Date.now()}_${Math.random().toString(36).slice(2)}_${file.name.replace(/[^a-zA-Z0-9.\-_]+/g, '')}`
        const { error } = await supabase.storage.from('school-assets').upload(path, file)
        if (error) throw error
        const { data } = supabase.storage.from('school-assets').getPublicUrl(path)
        newUrls.push(data.publicUrl)
      }
      setForm(prev => ({ ...prev, gallery_urls: [...prev.gallery_urls, ...newUrls] }))
      toast.success(`${newUrls.length} photo(s) added to the gallery!`)
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
      input.value = ''
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) { toast.error('Title and content are required'); return }
    setSaving(true)
    try {
      const existing = editingId ? articles.find(a => a.id === editingId) : null
      const author = form.author_name.trim()
        || `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
        || user?.primaryEmailAddress?.emailAddress
        || 'Admin'

      const payload = {
        title: form.title.trim(),
        category: form.category,
        excerpt: form.excerpt.trim() || null,
        content: form.content,
        image_url: form.image_url || null,
        gallery_urls: form.gallery_urls || null,
        author_name: author,
        is_published: form.is_published,
        published_at: form.is_published ? (existing?.published_at || new Date().toISOString()) : null,
        updated_at: new Date().toISOString(),
      }

      if (editingId) {
        const { error } = await supabase.from('news_articles').update(payload).eq('id', editingId)
        if (error) throw error
        toast.success('Article updated!')
      } else {
        const slug = await generateSlug(form.title)
        const { error } = await supabase.from('news_articles').insert([{ ...payload, slug }])
        if (error) throw error
        toast.success('Article created!')
      }
      setShowForm(false)
      setEditingId(null)
      setForm(emptyForm)
      fetchArticles()
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const togglePublish = async (article: NewsArticle) => {
    const nowPublished = !article.is_published
    const { error } = await supabase
      .from('news_articles')
      .update({
        is_published: nowPublished,
        published_at: nowPublished ? (article.published_at || new Date().toISOString()) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', article.id)
    if (error) { toast.error('Failed: ' + error.message); return }
    toast.success(nowPublished ? 'Article published!' : 'Article unpublished')
    fetchArticles()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this article permanently?')) return
    const { error } = await supabase.from('news_articles').delete().eq('id', id)
    if (error) toast.error('Failed: ' + error.message)
    else { toast.success('Article deleted'); fetchArticles() }
  }

  const startEdit = (a: NewsArticle) => {
    setEditingId(a.id)
    setForm({
      title: a.title,
      category: a.category,
      excerpt: a.excerpt || '',
      content: a.content,
      image_url: a.image_url || '',
      gallery_urls: a.gallery_urls || [],
      author_name: a.author_name || '',
      is_published: a.is_published,
    })
    setShowForm(true)
  }

  const filtered = articles.filter(a =>
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <Toaster position="top-right" />

      <div className="flex flex-col md:flex-row justify-between items-center gap-3 md:gap-0 mb-6 text-center md:text-left">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center md:justify-start gap-2"><Newspaper size={28} className="text-green-600" /> News & Events Manager</h1>
          <p className="text-gray-700">Publish school highlights: excursions, competitions, parties & more.</p>
        </div>
        <button onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(true) }} className="flex items-center justify-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-green-700 w-full md:w-auto">
          <Plus size={18} /> New Article
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-6">
        <div className="center-mobile bg-white rounded-xl shadow-md p-4 md:p-6 border border-gray-200">
          <h3 className="text-xl md:text-2xl font-bold text-gray-900">{articles.length}</h3>
          <p className="text-gray-600 text-xs md:text-sm font-medium text-center">Total Articles</p>
        </div>
        <div className="center-mobile bg-green-50 rounded-xl shadow-md p-4 md:p-6 border border-green-200">
          <h3 className="text-xl md:text-2xl font-bold text-green-900">{articles.filter(a => a.is_published).length}</h3>
          <p className="text-green-700 text-xs md:text-sm font-medium text-center">Published</p>
        </div>
        <div className="center-mobile bg-yellow-50 rounded-xl shadow-md p-4 md:p-6 border border-yellow-200">
          <h3 className="text-xl md:text-2xl font-bold text-yellow-900">{articles.filter(a => !a.is_published).length}</h3>
          <p className="text-yellow-700 text-xs md:text-sm font-medium text-center">Drafts</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="relative md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Search articles..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded text-gray-900" />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-600 font-bold">Loading articles...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-600">
          <Newspaper size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="font-bold">No articles yet</p>
          <p className="text-sm">Click "New Article" to publish your first school highlight!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(a => (
            <div key={a.id} className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden flex flex-col">
              {a.image_url ? (
                <img src={a.image_url} alt={a.title} className="h-40 w-full object-cover" />
              ) : (
                <div className="h-40 w-full bg-gray-100 flex items-center justify-center"><ImageIcon className="text-gray-300" size={40} /></div>
              )}
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">{a.category}</span>
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${a.is_published ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>{a.is_published ? 'Published' : 'Draft'}</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{a.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{a.excerpt || a.content.slice(0, 120)}</p>
                <p className="text-xs text-gray-400 mt-auto">{a.author_name || 'Admin'} • {new Date(a.created_at).toLocaleDateString()}</p>
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button onClick={() => togglePublish(a)} className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-bold ${a.is_published ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                    {a.is_published ? <><EyeOff size={12} /> Unpublish</> : <><Eye size={12} /> Publish</>}
                  </button>
                  <button onClick={() => startEdit(a)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100"><Edit size={12} /> Edit</button>
                  <button onClick={() => handleDelete(a.id)} className="px-3 py-1.5 rounded text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100"><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ✅ Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Edit Article' : 'New Article'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Title *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Primary 5 Wins the Inter-House Spelling Bee!" className="w-full p-2 border rounded text-gray-900" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full p-2 border rounded text-gray-900">
                    {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Author</label>
                  <input value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} placeholder="Defaults to your name" className="w-full p-2 border rounded text-gray-900" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Short Summary (shown on cards)</label>
                <textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} rows={2} className="w-full p-2 border rounded text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Full Story *</label>
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={8} required placeholder="Write the full highlight here. Use a blank line between paragraphs." className="w-full p-2 border rounded text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Cover Image</label>
                <div className="flex items-center gap-4 flex-wrap justify-center md:justify-start">
                  {form.image_url ? (
                    <img src={form.image_url} alt="Cover preview" className="h-24 w-36 object-cover rounded-lg border border-gray-200" />
                  ) : (
                    <div className="h-24 w-36 bg-gray-100 rounded-lg flex items-center justify-center"><ImageIcon className="text-gray-300" size={28} /></div>
                  )}
                  <label className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 cursor-pointer">
                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    {form.image_url ? 'Replace Image' : 'Upload Image'}
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                  </label>
                  {form.image_url && (
                    <button type="button" onClick={() => setForm({ ...form, image_url: '' })} className="text-red-600 text-sm font-bold hover:underline">Remove</button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Event Gallery (multiple photos)</label>
                <div className="flex items-center gap-4 flex-wrap mb-3 justify-center md:justify-start">
                  <label className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded font-bold hover:bg-purple-700 cursor-pointer">
                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    Add Photos
                    <input type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="hidden" disabled={uploading} />
                  </label>
                  <span className="text-sm text-gray-500">{form.gallery_urls.length} photo(s) added</span>
                </div>
                {form.gallery_urls.length > 0 && (
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {form.gallery_urls.map((url, i) => (
                      <div key={i} className="relative">
                        <img src={url} alt={`Gallery ${i + 1}`} className="h-20 w-full object-cover rounded-lg border border-gray-200" />
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, gallery_urls: form.gallery_urls.filter((_, idx) => idx !== i) })}
                          className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                          title="Remove photo"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <input id="publish_now" type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="w-4 h-4" />
                <label htmlFor="publish_now" className="text-gray-900 font-medium">Publish immediately (visible on the website & portals)</label>
              </div>
              <div className="flex flex-col-reverse md:flex-row gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 border rounded font-bold text-gray-700 hover:bg-gray-50 w-full md:w-auto">Cancel</button>
                <button type="submit" disabled={saving || uploading} className="flex-1 bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50">
                  {saving ? 'Saving...' : editingId ? 'Update Article' : 'Create Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}