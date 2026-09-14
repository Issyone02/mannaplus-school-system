'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Newspaper, ArrowRight } from 'lucide-react'

interface NewsItem {
  id: string
  title: string
  slug: string
  category: string
  image_url: string | null
  published_at: string | null
  created_at: string
}

export default function NewsHighlights({ limit = 3 }: { limit?: number }) {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNews = async () => {
      const { data } = await supabase
        .from('news_articles')
        .select('id, title, slug, category, image_url, published_at, created_at')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(limit)
      setItems((data || []) as NewsItem[])
      setLoading(false)
    }
    fetchNews()
  }, [limit])

  if (loading || items.length === 0) return null

  return (
    <div className="bg-white rounded-xl shadow p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Newspaper size={20} className="text-green-600" /> Latest School Highlights
        </h2>
        <Link href="/news" className="text-green-700 text-sm font-bold hover:text-green-900 flex items-center gap-1">
          View All <ArrowRight size={14} />
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map(n => (
          <Link key={n.id} href={`/news/${n.slug}`} className="group">
            <div className="rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
              <div className="h-28 bg-gray-100">
                {n.image_url ? (
                  <img src={n.image_url} alt={n.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Newspaper size={28} className="text-gray-300" /></div>
                )}
              </div>
              <div className="p-3 flex-1 flex flex-col">
                <span className="text-[10px] font-bold text-green-700 uppercase">{n.category}</span>
                <p className="text-sm font-bold text-gray-900 group-hover:text-green-700 transition-colors">{n.title}</p>
                <p className="text-[11px] text-gray-500 mt-auto pt-2">{new Date(n.published_at || n.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}