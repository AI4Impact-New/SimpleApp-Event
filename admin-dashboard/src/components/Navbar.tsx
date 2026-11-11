"use client";

import Link from "next/link";
import { authService } from "@/services/auth";
import { LogOut, User } from "lucide-react";
import { useCurrentUser } from "@/context/current-user-context";

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
          <Link
            href={
              process.env.NEXT_PUBLIC_BATCHES_DEV === "true"
                ? "/dashboard/batches"
                : "/dashboard"
            }
            className="text-lg font-bold tracking-tight text-primary-700"
            aria-label="AI4Impact home"
          >
            AI4Impact
          </Link>
          <span className="hidden sm:inline text-sm text-gray-500">
            {process.env.NEXT_PUBLIC_BATCHES_DEV === "true"
              ? "Dev · Batch preview"
              : "Staff console"}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden min-w-0 items-center gap-2 text-sm text-gray-600 px-3 py-1.5 rounded-full border border-gray-100 bg-gray-50 sm:flex">
            <User size={16} className="text-gray-500" />
            <span className="max-w-[180px] truncate lg:max-w-[320px]">
              {currentUser?.email || user?.username || "Admin"}
            </span>
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
