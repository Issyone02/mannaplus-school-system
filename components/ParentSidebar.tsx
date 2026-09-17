'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Bell,
  LogOut,
  X,
} from 'lucide-react';
import { useClerk } from '@clerk/nextjs';

// ✅ Only link to pages that actually exist
const menuItems = [
  { name: 'Dashboard', href: '/parent', icon: LayoutDashboard },
  { name: 'Notices', href: '/parent/notices', icon: Bell },
];

export default function ParentSidebar() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  // ✅ Listen for open-menu event from the mobile top bar (parent layout)
  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener('open-parent-sidebar', handler);
    return () => window.removeEventListener('open-parent-sidebar', handler);
  }, []);

  // ✅ Auto-close the drawer when the route changes
  useEffect(() => {
    closeMenu();
  }, [pathname]);

  return (
    <>
      {/* ✅ Old fixed hamburger REMOVED — the mobile top bar in app/parent/layout.tsx
          now owns the hamburger, so nothing covers the school logo anymore. */}

      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeMenu}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-purple-800 text-white flex flex-col transform transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        {/* Header */}
        <div className="p-6 border-b border-purple-700 flex-shrink-0 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-white">Parent Portal</h1>
            <p className="text-sm text-purple-200">Mannaplus Group of Schools</p>
          </div>
          {/* Close button for mobile */}
          <button onClick={closeMenu} className="md:hidden text-purple-200 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            // Consider both exact match and root path as active for Dashboard
            const isActive = pathname === item.href || (item.href === '/parent' && pathname === '/parent');
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeMenu}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-purple-700 text-white font-bold'
                    : 'text-purple-100 hover:bg-purple-700'
                }`}
              >
                <item.icon size={20} className="flex-shrink-0" />
                <span className="font-medium whitespace-nowrap">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-purple-700 flex-shrink-0">
          <button
            onClick={() => signOut()}
            className="flex items-center space-x-3 px-4 py-3 w-full rounded-lg text-purple-100 hover:bg-purple-700 transition-colors"
          >
            <LogOut size={20} className="flex-shrink-0" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}