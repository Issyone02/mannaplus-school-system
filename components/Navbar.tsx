'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { isSignedIn } = useUser();
  const pathname = usePathname();

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
    { name: 'Academics', href: '/academics' },
    { name: 'News & Events', href: '/news' },
    { name: 'Admissions', href: '/admissions' },
    { name: 'Contact', href: '/contact' },
  ];

  // ✅ Active link detection
  // - "/" only matches exactly (so Home isn't active on every page)
  // - Other paths match the path itself AND any sub-pages (e.g., /news/cultural-day still highlights News)
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  // Desktop link styles
  const desktopLinkClass = (href: string) =>
    isActive(href)
      ? 'bg-green-600 text-white px-4 py-1.5 rounded-full font-bold transition-colors'
      : 'text-gray-700 hover:text-green-600 transition-colors font-medium';

  // Mobile link styles
  const mobileLinkClass = (href: string) =>
    isActive(href)
      ? 'block px-3 py-2 bg-green-50 text-green-700 rounded-md font-bold'
      : 'block px-3 py-2 text-gray-700 hover:text-green-600 hover:bg-gray-50 rounded-md font-medium';

  const isDashboardActive = pathname === '/dashboard' || pathname.startsWith('/dashboard/');

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <img
                src="https://mecvtpnqmffqvniioudk.supabase.co/storage/v1/object/public/school-assets/school-logo.png"
                alt="Mannaplus Group of Schools"
                className="h-16 w-24 object-contain"
              />
              <div>
                <h1 className="text-lg font-bold text-gray-900">Mannaplus Group of Schools</h1>
                <p className="text-xs text-gray-500">Ogun, Nigeria</p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={desktopLinkClass(link.href)}
              >
                {link.name}
              </Link>
            ))}

            {/* Auth Controls */}
            <div className="flex items-center space-x-3 ml-4 border-l border-gray-200 pl-4">
              {isSignedIn ? (
                <>
                  <Link
                    href="/dashboard"
                    className={
                      isDashboardActive
                        ? 'bg-green-600 text-white px-4 py-1.5 rounded-full font-bold transition-colors'
                        : 'text-gray-700 hover:text-green-600 font-medium'
                    }
                  >
                    Dashboard
                  </Link>
                  <UserButton />
                </>
              ) : (
                <>
                  <SignInButton mode="modal">
                    <button className="text-gray-700 hover:text-green-600 font-medium">
                      Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium">
                      Sign Up
                    </button>
                  </SignUpButton>
                </>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 hover:text-green-600"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-4 pt-2 pb-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={mobileLinkClass(link.href)}
                onClick={() => setIsOpen(false)}
              >
                {link.name}
              </Link>
            ))}

            <div className="border-t border-gray-200 pt-3 mt-3">
              {isSignedIn ? (
                <>
                  <Link
                    href="/dashboard"
                    className={
                      isDashboardActive
                        ? 'block px-3 py-2 bg-green-50 text-green-700 rounded-md font-bold'
                        : 'block px-3 py-2 text-gray-700 hover:text-green-600 font-medium'
                    }
                    onClick={() => setIsOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <div className="px-3 py-2">
                    <UserButton />
                  </div>
                </>
              ) : (
                <>
                  <SignInButton mode="modal">
                    <button className="block w-full text-left px-3 py-2 text-gray-700 hover:text-green-600">
                      Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="block w-full text-left px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                      Sign Up
                    </button>
                  </SignUpButton>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}