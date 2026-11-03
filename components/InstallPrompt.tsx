'use client'

import { useState, useEffect } from 'react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
      <p className="font-bold mb-2">Install Mannaplus App</p>
      <p className="text-sm mb-3">Add to your home screen for quick access</p>
      <div className="flex gap-2">
        <button
          onClick={handleInstall}
          className="bg-white text-green-600 px-4 py-2 rounded font-bold hover:bg-gray-100"
        >
          Install
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          className="bg-gray-700 text-white px-4 py-2 rounded font-bold hover:bg-gray-600"
        >
          Later
        </button>
      </div>
    </div>
  )
}