'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  DollarSign,
  Bell,
  Calendar,
  Settings,
  LogOut,
  Activity,
  User,
  Menu,
  X,
  ArrowRightLeft,
  MailOpen,
  Newspaper,
} from 'lucide-react';
import { useClerk } from '@clerk/nextjs';

const menuItems = [
  { name: 'Overview', href: '/admin', icon: LayoutDashboard },
  { name: 'Students', href: '/admin/students', icon: Users },
  { name: 'Teachers', href: '/admin/teachers', icon: Users },
  { name: 'Attendance', href: '/admin/attendance', icon: Calendar },
  { name: 'Parents', href: '/admin/parents', icon: Users },
  { name: 'Classes', href: '/admin/classes', icon: BookOpen },
  { name: 'Results', href: '/admin/results', icon: GraduationCap },
  { name: 'Promotion', href: '/admin/promotion', icon: ArrowRightLeft },
  { name: 'Fee Payments', href: '/admin/fees', icon: DollarSign },
  { name: 'Notices', href: '/admin/notices', icon: Bell },
  { name: 'Timetable', href: '/admin/timetable', icon: Calendar },
  { name: 'Audit Logs', href: '/admin/audit-logs', icon: Activity },
  { name: 'Enquiries', href: '/admin/enquiries', icon: MailOpen },
  { name: 'User Management', href: '/admin/users', icon: Settings },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
   { name: 'News & Events', href: '/admin/news', icon: Newspaper },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  // Automatically close the sidebar when the route changes
  useEffect(() => {
    closeMenu();
  }, [pathname]);

  // ✅ Listen for open-menu event from the mobile top bar
  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener('open-admin-sidebar', handler);
    return () => window.removeEventListener('open-admin-sidebar', handler);
  }, []);

  return (
    <>
      {/* 1. Mobile Hamburger Button (Hidden on Desktop) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-[60] p-2 bg-green-800 text-white rounded-lg shadow-lg md:hidden"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      )}

      {/* 2. Mobile Backdrop (Hidden on Desktop) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[55] md:hidden"
          onClick={closeMenu}
        />
      )}

      {/* 3. The Sidebar itself */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-[58] w-64 bg-green-800 text-white flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-6 border-b border-green-700">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-lg shadow-sm">
              <BookOpen size={24} className="text-green-800" /> 
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">Mannaplus Group</h1>
              <p className="text-xs text-green-200">Admin Portal</p>
            </div>
          </div>
          
          {/* Close button for mobile */}
          <button onClick={closeMenu} className="md:hidden text-green-200 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Menu */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeMenu} // Close menu on click
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-green-700 text-white font-bold shadow-sm'
                    : 'text-green-100 hover:bg-green-700 hover:text-white'
                }`}
              >
                <item.icon size={20} className="flex-shrink-0" />
                <span className="font-medium whitespace-nowrap">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-green-700 flex-shrink-0 bg-green-800">
          <button
            onClick={() => signOut()}
            className="flex items-center space-x-3 px-4 py-3 w-full rounded-lg text-green-100 hover:bg-green-700 hover:text-white transition-colors"
          >
            <LogOut size={20} className="flex-shrink-0" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}