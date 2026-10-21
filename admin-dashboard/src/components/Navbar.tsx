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
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-primary-600">AI4Impact</h1>
          <span className="hidden sm:inline text-sm text-gray-500">Staff console</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden min-w-0 items-center gap-2 text-sm text-gray-600 px-3 py-1.5 rounded-full border border-gray-100 bg-gray-50 sm:flex">
            <User size={16} className="text-gray-500" />
            <span className="max-w-[180px] truncate lg:max-w-[320px]">{currentUser?.email || user?.username || 'Admin'}</span>
          </div>
          <button
            aria-label="Logout"
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
