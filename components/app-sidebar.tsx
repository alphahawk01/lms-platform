"use client";

import { useState, useEffect } from "react";
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
  Route,
  Menu,
  X,
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
    name: "Learning Paths",
    href: "/admin/learning-paths",
    icon: Route,
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
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile drawer whenever the route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const sidebarContent = (
    <>
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

      <nav className="flex-1 overflow-y-auto p-4">
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
    </>
  );

  return (
    <>
      {/* Mobile top bar with hamburger */}
      <div className="flex h-16 items-center justify-between border-b border-white/10 bg-pd-navy px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pd-red text-white">
            <GraduationCap size={18} />
          </div>
          <h1 className="text-sm font-extrabold tracking-tight text-white">
            PREMIER<span className="text-pd-red">DATA</span>
          </h1>
        </div>

        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-white transition hover:bg-white/10"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Desktop sidebar (always visible on lg+) */}
      <aside className="hidden min-h-screen w-64 flex-col border-r border-white/10 bg-pd-navy lg:flex">
        {sidebarContent}
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-pd-navy transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-3 rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label="Close menu"
        >
          <X size={22} />
        </button>
        {sidebarContent}
      </aside>
    </>
  );
}
