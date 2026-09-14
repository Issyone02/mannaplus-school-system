'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useUser, useClerk } from '@clerk/nextjs'
import { AlertTriangle, LogOut } from 'lucide-react'

// ✅ Defaults (adjust anytime)
const IDLE_LIMIT_MS = 45 * 60 * 1000          // 45 minutes idle → logout
const WARNING_WINDOW_MS = 2 * 60 * 1000      // warning shows with 2 minutes left
const WARNING_AT_MS = IDLE_LIMIT_MS - WARNING_WINDOW_MS // warning after 43 min idle

export default function IdleTimeout() {
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()

  const [warning, setWarning] = useState(false)
  const [remainingMs, setRemainingMs] = useState(WARNING_WINDOW_MS)

  const lastActivityRef = useRef<number>(Date.now())
  const warningRef = useRef(false)
  const userRef = useRef(user)

  warningRef.current = warning
  userRef.current = user

  const doLogout = useCallback(() => {
    signOut({ redirectUrl: '/sign-in' })
  }, [signOut])

  // ✅ Timestamp-based evaluation — immune to timer throttling
  const evaluate = useCallback(() => {
    if (!userRef.current) return
    const idle = Date.now() - lastActivityRef.current

    if (!warningRef.current) {
      if (idle >= WARNING_AT_MS) {
        setWarning(true)
        setRemainingMs(Math.max(0, IDLE_LIMIT_MS - idle))
      }
    } else {
      const remaining = IDLE_LIMIT_MS - idle
      setRemainingMs(Math.max(0, remaining))
      if (remaining <= 0) doLogout()
    }
  }, [doLogout])

  // Reset whenever login state changes
  useEffect(() => {
    if (isLoaded) {
      lastActivityRef.current = Date.now()
      setWarning(false)
    }
  }, [isLoaded, user?.id])

  // ✅ Activity listeners (mouse + keyboard + TOUCH for mobile/tablets)
  useEffect(() => {
    const onActivity = () => {
      if (warningRef.current) return // ⛔ Once warning shows, activity is IGNORED
      lastActivityRef.current = Date.now()
    }

    let lastMove = 0
    const onMove = () => {
      const now = Date.now()
      if (now - lastMove > 1000) { lastMove = now; onActivity() } // throttle mousemove
    }

    const events: [string, EventListener][] = [
      ['mousemove', onMove],
      ['mousedown', onActivity],
      ['keydown', onActivity],
      ['touchstart', onActivity],   // ✅ mobile/tablet
      ['touchmove', onActivity],    // ✅ mobile/tablet
      ['scroll', onActivity],
      ['wheel', onActivity],
    ]
    events.forEach(([evt, fn]) => window.addEventListener(evt, fn, { passive: true }))
    return () => events.forEach(([evt, fn]) => window.removeEventListener(evt, fn))
  }, [])

  // Main-thread tick (1s)
  useEffect(() => {
    const id = setInterval(evaluate, 1000)
    return () => clearInterval(id)
  }, [evaluate])

  // ✅ WEB WORKER heartbeat — keeps the logic alive when the browser is minimized/hidden
  useEffect(() => {
    let worker: Worker | null = null
    try {
      const code = `setInterval(function(){ postMessage('tick'); }, 1000);`
      const blob = new Blob([code], { type: 'application/javascript' })
      worker = new Worker(URL.createObjectURL(blob))
      worker.onmessage = () => evaluate()
    } catch {
      worker = null
    }
    return () => worker?.terminate()
  }, [evaluate])

  // ✅ Instant catch-up the moment the user returns from a minimized browser
  useEffect(() => {
    const onVisible = () => evaluate()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [evaluate])

  const stayLoggedIn = () => {
    lastActivityRef.current = Date.now()
    setWarning(false)
  }

  const mins = Math.floor(remainingMs / 60000)
  const secs = Math.floor((remainingMs % 60000) / 1000)

  if (!isLoaded || !user || !warning) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center">
          <AlertTriangle className="text-yellow-600" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Are you still there?</h2>
        <p className="text-gray-600 mb-6">
          You have been inactive. For your security, you will be logged out in:
        </p>
        <div className="text-5xl font-bold text-red-600 mb-6 tabular-nums">
          {mins}:{secs.toString().padStart(2, '0')}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={stayLoggedIn} className="bg-green-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-green-700">
            Stay Logged In
          </button>
          <button onClick={doLogout} className="bg-red-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-red-700 flex items-center justify-center gap-2">
            <LogOut size={16} /> Logout Now
          </button>
        </div>
      </div>
    </div>
  )
}