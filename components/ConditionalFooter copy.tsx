'use client'

import { usePathname } from 'next/navigation'
import Footer from './Footer'

// Portals where the footer must NOT appear
const HIDDEN_PREFIXES = ['/admin', '/teacher', '/parent', '/student', '/dashboard']

export default function ConditionalFooter() {
  const pathname = usePathname()
  const hide = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))
  if (hide) return null
  return <Footer />
}