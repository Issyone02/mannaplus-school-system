'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

/**
 * Portal routes where the public Navbar should be HIDDEN on mobile.
 * On desktop (md+), the Navbar remains visible for navigation consistency.
 */
const PORTAL_PREFIXES = ['/admin', '/teacher', '/parent', '/student', '/portal'];

export default function ConditionalNavbar() {
  const pathname = usePathname();
  const isInsidePortal = PORTAL_PREFIXES.some(p => pathname.startsWith(p));

  // Inside portals: render Navbar only on desktop (md+), hide on mobile
  if (isInsidePortal) {
    return (
      <div className="hidden md:block">
        <Navbar />
      </div>
    );
  }

  // On public pages: render full Navbar on all screen sizes
  return <Navbar />;
}