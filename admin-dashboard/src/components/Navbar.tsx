'use client';

import { authService } from '@/services/auth';
import { LogOut, User } from 'lucide-react';
import { useCurrentUser } from '@/context/current-user-context';

interface NavbarProps {
  user?: {
    userId?: string;
    username?: string;
  };
}

export function Navbar({ user }: NavbarProps) {
  const { currentUser } = useCurrentUser();

  const handleLogout = async () => {
    await authService.logout();
    // Session cleanup and navigation stay on this application's origin.
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-primary-600">AI4Impact</h1>
          <span className="hidden sm:inline text-sm text-gray-500">Admin Dashboard</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden min-w-0 items-center gap-2 text-sm text-gray-600 px-3 py-1.5 rounded-lg bg-gray-50 sm:flex">
            <User size={16} className="text-gray-500" />
            <span className="max-w-[180px] truncate lg:max-w-[320px]">{currentUser?.email || user?.username || 'Admin'}</span>
          </div>
          <button
            aria-label="Logout"
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
