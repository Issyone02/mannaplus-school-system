'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Edit3,
  CheckSquare,
  Calendar,
  Bell,
  LogOut,
  Menu,
  X,
  PenLine,
} from 'lucide-react';
import { useClerk } from '@clerk/nextjs';

const menuItems = [
  { name: 'Dashboard', href: '/teacher/dashboard', icon: LayoutDashboard },
  { name: 'My Signature', href: '/teacher/signature', icon: PenLine },
  { name: 'My Students', href: '/teacher/students', icon: Users },
  { name: 'Mark Attendance', href: '/teacher/attendance', icon: CheckSquare },
  { name: 'Enter Results', href: '/teacher/results', icon: Edit3 },
  { name: 'Timetable', href: '/teacher/timetable', icon: Calendar },
  { name: 'Notices', href: '/teacher/notices', icon: Bell },
];

export default function TeacherSidebar() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 bg-blue-800 text-white rounded-lg shadow-lg md:hidden"
      >
        <Menu size={24} />
      </button>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeMenu}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-blue-800 text-white flex flex-col transform transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        {/* Header */}
        <div className="p-6 border-b border-blue-700 flex-shrink-0 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-white">Teacher Portal</h1>
            <p className="text-sm text-blue-200">Mannaplus Group of Schools</p>
          </div>
          {/* Close button for mobile */}
          <button onClick={closeMenu} className="md:hidden text-blue-200 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeMenu}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-700 text-white font-bold'
                    : 'text-blue-100 hover:bg-blue-700'
                }`}
              >
                <item.icon size={20} className="flex-shrink-0" />
                <span className="font-medium whitespace-nowrap">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-blue-700 flex-shrink-0">
          <button
            onClick={() => signOut()}
            className="flex items-center space-x-3 px-4 py-3 w-full rounded-lg text-blue-100 hover:bg-blue-700 transition-colors"
          >
            <LogOut size={20} className="flex-shrink-0" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}