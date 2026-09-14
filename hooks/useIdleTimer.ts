import { useEffect, useRef, useState, useCallback } from 'react'

export const useIdleTimer = (timeoutMs: number, warningMs: number) => {
  const [status, setStatus] = useState<'active' | 'warning' | 'idle'>('active')
  const [timeLeft, setTimeLeft] = useState(timeoutMs)

  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  const clearTimers = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }

  const startTimer = useCallback(() => {
    clearTimers()
    setStatus('active')
    
    let remaining = timeoutMs
    setTimeLeft(remaining)

    // Strict countdown: decreases every second regardless of user activity
    countdownRef.current = setInterval(() => {
      remaining -= 1000
      setTimeLeft(remaining)

      // Trigger warning when time is low
      if (remaining <= warningMs && remaining > 0) {
        setStatus('warning')
      }

      // Trigger idle/logout when time is up
      if (remaining <= 0) {
        setStatus('idle')
        clearTimers()
      }
    }, 1000)
  }, [timeoutMs, warningMs])

  // This is the ONLY way to reset the timer now
  const extendSession = useCallback(() => {
    startTimer()
  }, [startTimer])

  useEffect(() => {
    startTimer() // Start immediately on mount
    return () => clearTimers()
  }, [startTimer])

  return { status, timeLeft, extendSession }
}