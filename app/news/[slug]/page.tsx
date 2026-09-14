import Link from 'next/link'
import { getServerSupabase } from '@/lib/supabase'
import { Calendar, User, ArrowLeft, Share2, Newspaper, Tag } from 'lucide-react'
import ShareButton from '@/components/ShareButton'

// ✅ Render fresh on every request so new articles work immediately
export const dynamic = 'force-dynamic'

interface Article {
  id: string
  title: string
  slug: string
  category: string
  excerpt: string | null
  content: string
  image_url: string | null
  gallery_urls: string[] | null
  author_name: string | null
  published_at: string | null
  created_at: string
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = getServerSupabase()
  const { data } = await supabase
    .from('news_articles')
    .select('title, excerpt')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!data) return { title: 'Article Not Found' }
  return {
    title: `${data.title} | Mannaplus News`,
    description: data.excerpt || `Read "${data.title}" on the Mannaplus Group of Schools news page.`,
  }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = getServerSupabase()

  const { data: article } = await supabase
    .from('news_articles')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-12 max-w-md text-center">
          <Newspaper size={48} className="mx-auto text-gray-300 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Article Not Found</h1>
          <p className="text-gray-600 mb-6">This article may have been removed or is not yet published.</p>
          <Link href="/news" className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-green-700">
            <ArrowLeft size={16} /> Back to News
          </Link>
        </div>
      </div>
    )
  }

  const a = article as Article
  const paragraphs = a.content.split('\n').filter(p => p.trim())
  const publishedDate = new Date(a.published_at || a.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const { data: recent } = await supabase
    .from('news_articles')
    .select('id, title, slug, category, image_url, published_at, created_at')
    .eq('is_published', true)
    .neq('id', a.id)
    .order('published_at', { ascending: false })
    .limit(3)

  const recentArticles = (recent || []) as Array<{
    id: string; title: string; slug: string; category: string
    image_url: string | null; published_at: string | null; created_at: string
  }>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2 text-sm text-gray-600">
          <Link href="/news" className="flex items-center gap-1 hover:text-green-700 font-medium">
            <ArrowLeft size={14} /> News & Events
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-500 truncate">{a.title}</span>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-4 py-10">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full flex items-center gap-1">
              <Tag size={12} /> {a.category}
            </span>
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <Calendar size={14} /> {publishedDate}
            </span>
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <User size={14} /> {a.author_name || 'Admin'}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">{a.title}</h1>
          {a.excerpt && (
            <p className="text-xl text-gray-600 leading-relaxed italic">{a.excerpt}</p>
          )}
        </header>

        {a.image_url && (
          <div className="mb-8 rounded-2xl overflow-hidden shadow-lg">
            <img src={a.image_url} alt={a.title} className="w-full h-auto max-h-[500px] object-cover" />
          </div>
        )}

        {(a.gallery_urls || []).length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📸 Event Gallery</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(a.gallery_urls || []).map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={url}
                    alt={`${a.title} photo ${i + 1}`}
                    className="w-full h-40 object-cover rounded-xl border border-gray-200 hover:opacity-90 transition-opacity"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="prose prose-lg max-w-none text-gray-800 leading-relaxed">
          {paragraphs.map((para, idx) => (
            <p key={idx} className="mb-5 text-lg text-gray-800 leading-relaxed">{para}</p>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Share2 size={18} className="text-gray-500" />
            <span className="text-sm text-gray-600 font-medium">Share this story:</span>
            <ShareButton title={a.title} />
          </div>
          <Link href="/news" className="text-green-700 font-bold hover:text-green-900 flex items-center gap-1">
            <ArrowLeft size={16} /> Back to all news
          </Link>
        </div>
      </article>

      {recentArticles.length > 0 && (
        <section className="bg-white border-t border-gray-200 py-12 mt-10">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">More Recent Stories</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recentArticles.map(r => (
                <Link key={r.id} href={`/news/${r.slug}`} className="group">
                  <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden h-full hover:shadow-md transition-shadow">
                    <div className="h-40 bg-gray-100">
                      {r.image_url ? (
                        <img src={r.image_url} alt={r.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Newspaper size={32} className="text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <span className="text-xs font-bold text-green-700 uppercase">{r.category}</span>
                      <h3 className="font-bold text-gray-900 mt-1 group-hover:text-green-700 transition-colors">
                        {r.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(r.published_at || r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}