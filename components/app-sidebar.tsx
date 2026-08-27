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
    href: "/courses",
    icon: BookOpen,
  },
];

const adminNavigation = [
  {
    name: "Course Builder",
    href: "/admin/courses",
    icon: BookOpen,
  },
  {
    name: "Courses",
    href: "/admin/allocations",
    icon: GraduationCap,
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
    <aside className="flex min-h-screen w-64 flex-col border-r border-white/10 bg-pd-navy">
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pd-red text-white">
          <GraduationCap size={22} />
        </div>

        <div>
          <h1 className="font-extrabold tracking-tight text-white">
            PREMIER<span className="text-pd-red">DATA</span>
          </h1>
          <p className="text-xs text-slate-400">Training & Learning</p>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
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
                    ? "bg-pd-red text-white"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
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
            <div className="my-7 border-t border-white/10" />

            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
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
                        ? "bg-pd-red text-white"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
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

      <div className="border-t border-white/10 p-4">
        <Link
          href="/account"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          <Settings size={19} />
          Account
        </Link>

        {isAdmin && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-slate-200">
            <ShieldCheck size={15} />
            Administrator
          </div>
        )}
      </div>
    </aside>
  );
}