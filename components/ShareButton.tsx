'use client'

import toast from 'react-hot-toast'

export default function ShareButton({ title }: { title: string }) {
  const handleShare = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard!')
    } catch {
      // user cancelled share or clipboard blocked — ignore
    }
  }

  return (
    <button
      onClick={handleShare}
      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-full font-bold hover:bg-blue-700"
    >
      Copy Link
    </button>
  )
}