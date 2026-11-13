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
  CreditCard,
  Menu,
  X,
  Sparkles,
  UserPlus,
} from "lucide-react";
const groups = [
  {
    title: "Workspace",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/dashboard/learning", label: "Learning Studio", icon: BookOpen },
      { href: "/dashboard/courses", label: "Courses", icon: BookOpen },
      { href: "/dashboard/programme", label: "Programme+", icon: Sparkles },
    ],
  },
  {
    title: "Students & payments",
    items: [
      { href: "/dashboard/users", label: "Students & users", icon: Users },
      {
        href: "/dashboard/course-enquiries",
        label: "Course Enquiries",
        icon: MessageCircle,
      },
      {
        href: "/dashboard/onboarding",
        label: "Student onboarding",
        icon: UserPlus,
      },
      {
        href: "/dashboard/fees",
        label: "Fees & payment links",
        icon: FileText,
      },
      {
        href: "/dashboard/payments",
        label: "Payments ledger",
        icon: CreditCard,
      },
    ],
  },
  {
    title: "Engagement",
    items: [
      { href: "/dashboard/events", label: "Events", icon: Calendar },
      { href: "/dashboard/polls", label: "Polls", icon: Vote },
      { href: "/dashboard/materials", label: "Materials", icon: FileText },
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/dashboard/admin-users", label: "Admin Users", icon: UserCog },
      {
        href: "/dashboard/operations",
        label: "Launch readiness",
        icon: BarChart3,
      },
    ],
  },
];
export function Sidebar() {
  const pathname = usePathname() ?? "";
  const [admin, setAdmin] = useState(false);
  const [educator, setEducator] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    let live = true;
    void import("@/services/programme")
      .then(({ programme }) => programme.access())
      .then((r) => {
        if (live) setEducator(r.courses.length > 0);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
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
  useEffect(() => setMobileOpen(false), [pathname]);
  const current = groups
    .flatMap((g) => g.items)
    .find(
      (item) =>
        pathname === item.href ||
        (item.href !== "/dashboard" && pathname.startsWith(item.href + "/")),
    );
  return (
    <aside className="w-full shrink-0 border-b border-slate-200 bg-white sm:w-60 sm:border-b-0 sm:border-r">
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-expanded={mobileOpen}
        aria-controls="workspace-navigation"
        className="flex w-full items-center justify-between px-5 py-3 text-sm font-semibold text-slate-700 sm:hidden"
      >
        <span className="flex items-center gap-2">
          <Menu size={18} />
          Menu{" "}
          <span className="font-normal text-slate-400">
            / {current?.label || "Workspace"}
          </span>
        </span>
        {mobileOpen ? (
          <X size={18} />
        ) : (
          <span className="text-xs text-primary-700">Browse</span>
        )}
      </button>
      <div
        id="workspace-navigation"
        className={`${mobileOpen ? "block" : "hidden"} px-3 py-5 sm:sticky sm:top-[73px] sm:block sm:max-h-[calc(100dvh-73px)] sm:overflow-y-auto sm:px-4`}
      >
        <nav aria-label="Main navigation" className="space-y-6">
          {groups.map((group) => {
            const items = group.items.filter(
              (item) =>
                admin ||
                (educator && item.href === "/dashboard/programme") ||
                item.href === "/dashboard/course-enquiries" ||
                item.href === "/dashboard/onboarding",
            );
            if (!items.length) return null;
            return (
              <div key={group.title}>
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  {group.title}
                </p>
                <ul className="space-y-1">
                  {items.map((item) => {
                    const active =
                      pathname === item.href ||
                      (item.href !== "/dashboard" &&
                        pathname.startsWith(item.href + "/"));
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          aria-current={active ? "page" : undefined}
                          aria-label={item.label}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${active ? "bg-primary-50 text-primary-800 ring-1 ring-inset ring-primary-100" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                        >
                          <Icon
                            size={18}
                            className={
                              active ? "text-primary-700" : "text-slate-400"
                            }
                            aria-hidden="true"
                          />
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
