import Link from 'next/link'
import { getServerSupabase } from '@/lib/supabase'
import { Calendar, User, ArrowRight, Newspaper } from 'lucide-react'

// Always fetch fresh articles on every request (n0 stale built-time cache)
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'News & Events | Mannaplus Group of Schools',
  description: 'Stay up to date with school highlights — excursions, competitions, parties, and academic achievements at Mannaplus Group of Schools.',
}

interface Article {
  id: string
  title: string
  slug: string
  category: string
  excerpt: string | null
  content: string
  image_url: string | null
  author_name: string | null
  published_at: string | null
  created_at: string
}

export default async function NewsPage() {
  const supabase = getServerSupabase()
  const { data: articles } = await supabase
    .from('news_articles')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false })

  const allArticles = (articles || []) as Article[]
  const featured = allArticles[0]
  const rest = allArticles.slice(1)

  return (
    <div className="public-page min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-green-700 to-green-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-600/40 rounded-full text-green-100 text-sm font-bold mb-4">
            <Newspaper size={16} /> School News & Events
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Highlights from Mannaplus</h1>
          <p className="max-w-2xl mx-auto text-green-100 text-lg">
            Excursions, competitions, parties, sports, and academic achievements —
            follow the vibrant life of our school community.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {allArticles.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow">
            <Newspaper size={48} className="mx-auto text-gray-300 mb-3" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No news yet</h2>
            <p className="text-gray-600">Check back soon — our first stories are on the way!</p>
          </div>
        ) : (
          <>
            {/* Featured Article */}
            {featured && (
              <Link href={`/news/${featured.slug}`} className="block mb-10 group">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden md:grid md:grid-cols-2 border border-gray-200 hover:shadow-xl transition-shadow">
                  <div className="h-64 md:h-full bg-gray-100 relative">
                    {featured.image_url ? (
                      <img src={featured.image_url} alt={featured.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Newspaper size={64} className="text-gray-300" /></div>
                    )}
                    <span className="absolute top-4 left-4 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">⭐ Featured</span>
                  </div>
                  <div className="p-8 flex flex-col justify-center">
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full w-fit mb-3">{featured.category}</span>
                    <h2 className="text-3xl font-bold text-gray-900 mb-3 group-hover:text-green-700 transition-colors">
                      {featured.title}
                    </h2>
                    <p className="text-gray-600 mb-4">{featured.excerpt || featured.content.slice(0, 200) + '...'}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      <span className="flex items-center gap-1"><User size={14} /> {featured.author_name || 'Admin'}</span>
                      <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(featured.published_at || featured.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                    <span className="inline-flex items-center gap-2 text-green-700 font-bold group-hover:gap-3 transition-all">
                      Read the full story <ArrowRight size={18} />
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {/* Rest of the articles */}
            {rest.length > 0 && (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">More Stories</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rest.map(article => (
                    <Link key={article.id} href={`/news/${article.slug}`} className="group">
                      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden h-full flex flex-col hover:shadow-lg transition-shadow">
                        <div className="h-48 bg-gray-100">
                          {article.image_url ? (
                            <img src={article.image_url} alt={article.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Newspaper size={40} className="text-gray-300" /></div>
                          )}
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-bold rounded-full w-fit mb-2">{article.category}</span>
                          <h3 className="font-bold text-gray-900 mb-2 group-hover:text-green-700 transition-colors">{article.title}</h3>
                          <p className="text-sm text-gray-600 mb-3 flex-1">{article.excerpt || article.content.slice(0, 100) + '...'}</p>
                          <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                            <span>{article.author_name || 'Admin'}</span>
                            <span>{new Date(article.published_at || article.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}