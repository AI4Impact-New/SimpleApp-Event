'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Calendar, 
  Vote, 
  FileText, 
  BarChart3,
  UserCog,
  Users,
  BookOpen,
  MessageCircle
} from 'lucide-react';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/events', label: 'Events', icon: Calendar },
  { href: '/dashboard/courses', label: 'Courses', icon: BookOpen },
  { href: '/dashboard/fees', label: 'Fees & payment links', icon: FileText },
  { href: '/dashboard/learning', label: 'Learning Studio', icon: BarChart3 },
  { href: '/dashboard/course-enquiries', label: 'Course Enquiries', icon: MessageCircle },
  { href: '/dashboard/polls', label: 'Polls', icon: Vote },
  { href: '/dashboard/materials', label: 'Materials', icon: FileText },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/admin-users', label: 'Admin Users', icon: UserCog },
  { href: '/dashboard/users', label: 'Users', icon: Users },
];

export function Sidebar() {
  const pathname = usePathname() ?? '';

  return (
    <aside className="w-16 sm:w-56 shrink-0 border-r border-gray-200 bg-white">
      <nav className="p-3">
        <ul className="space-y-0.5">
          {menuItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-label={item.label}
                  title={item.label}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon size={20} className={isActive ? 'text-primary-600' : 'text-gray-500'} />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
