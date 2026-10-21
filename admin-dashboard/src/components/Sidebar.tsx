"use client";

import { useEffect, useState } from "react";
import { isAdminFromToken } from "@/utils/jwt";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Vote,
  FileText,
  BarChart3,
  UserCog,
  Users,
  BookOpen,
  MessageCircle,
} from "lucide-react";

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/events", label: "Events", icon: Calendar },
  { href: "/dashboard/courses", label: "Courses", icon: BookOpen },
  { href: "/dashboard/fees", label: "Fees & payment links", icon: FileText },
  { href: "/dashboard/learning", label: "Learning Studio", icon: BarChart3 },
  {
    href: "/dashboard/course-enquiries",
    label: "Course Enquiries",
    icon: MessageCircle,
  },
  { href: "/dashboard/polls", label: "Polls", icon: Vote },
  { href: "/dashboard/materials", label: "Materials", icon: FileText },
  { href: "/dashboard/operations", label: "Launch readiness", icon: BarChart3 },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/admin-users", label: "Admin Users", icon: UserCog },
  { href: "/dashboard/users", label: "Users", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname() ?? "";
  const [admin, setAdmin] = useState(false);
  useEffect(
    () =>
      setAdmin(
        isAdminFromToken(
          localStorage.getItem("auth_id_token") ||
            localStorage.getItem("auth_token") ||
            "",
        ),
      ),
    [],
  );

  const groups = [
    { title: 'Workspace', paths: ['/dashboard', '/dashboard/learning', '/dashboard/courses', '/dashboard/course-enquiries', '/dashboard/fees'] },
    { title: 'Engagement', paths: ['/dashboard/events', '/dashboard/polls', '/dashboard/materials', '/dashboard/analytics'] },
    { title: 'Administration', paths: ['/dashboard/admin-users', '/dashboard/users', '/dashboard/operations'] },
  ];
  return <aside className="w-16 shrink-0 border-r border-gray-200 bg-white sm:w-60">
    <div className="sticky top-[65px] max-h-[calc(100vh-65px)] overflow-y-auto px-2 py-5 sm:px-4">
      <div className="mb-6 hidden px-3 sm:block"><p className="text-xs font-semibold tracking-widest text-primary-600 uppercase">AI4Impact workspace</p><p className="mt-2 text-xs text-gray-400">Learning, people and progress</p></div>
      <nav aria-label="Main navigation" className="space-y-6">{groups.map(group => {
        const items=group.paths.map(path=>menuItems.find(item=>item.href===path)!).filter(item=>admin||item.href==='/dashboard/course-enquiries');
        if(!items.length)return null;
        return <div key={group.title}><p className="mb-2 hidden px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 sm:block">{group.title}</p><ul className="space-y-1">{items.map(item=>{
          const active=pathname===item.href||(item.href!=='/dashboard'&&pathname.startsWith(item.href+'/'));
          const Icon=item.icon;
          return <li key={item.href}><Link href={item.href} aria-label={item.label} title={item.label} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active?'bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-100':'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}><Icon size={18} className={active?'text-primary-600':'text-gray-400'}/><span className="hidden sm:inline">{item.label}</span>{active&&<span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-primary-500 sm:block"/>}</Link></li>;
        })}</ul></div>;
      })}</nav>
    </div>
  </aside>;
}
