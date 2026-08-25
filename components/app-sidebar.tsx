"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Users,
  BarChart3,
  Settings,
  ShieldCheck,
} from "lucide-react";

type AppSidebarProps = {
  isAdmin: boolean;
};

const learnerNavigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "My Learning",
    href: "/learning",
    icon: BookOpen,
  },
  {
    name: "Courses",
    href: "/courses",
    icon: GraduationCap,
  },
];

const adminNavigation = [
  {
    name: "Course Builder",
    href: "/admin/courses",
    icon: BookOpen,
  },
  {
    name: "People",
    href: "/admin/people",
    icon: Users,
  },
  {
    name: "Reports",
    href: "/admin/reports",
    icon: BarChart3,
  },
];

export function AppSidebar({ isAdmin }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex min-h-screen w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-20 items-center gap-3 border-b border-slate-200 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
          <GraduationCap size={22} />
        </div>

        <div>
          <h1 className="font-bold text-slate-900">LMS Platform</h1>
          <p className="text-xs text-slate-500">Training & Learning</p>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Learning
        </p>

        <div className="space-y-1">
          {learnerNavigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon size={19} />
                {item.name}
              </Link>
            );
          })}
        </div>

        {isAdmin && (
          <>
            <div className="my-7 border-t border-slate-200" />

            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Administration
            </p>

            <div className="space-y-1">
              {adminNavigation.map((item) => {
                const Icon = item.icon;
                const active = pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      active
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Icon size={19} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <Settings size={19} />
          Settings
        </Link>

        {isAdmin && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
            <ShieldCheck size={15} />
            Administrator
          </div>
        )}
      </div>
    </aside>
  );
}