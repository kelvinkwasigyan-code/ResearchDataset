"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Database,
  FlaskConical,
  FolderOpen,
  LogOut,
  Menu,
  Plus,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

interface NavbarProps {
  user: {
    userId: string;
    name: string;
    email: string;
    isAdmin?: boolean;
  } | null;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(e: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    window.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  async function handleLogout() {
    setLoggingOut(true);
    setMenuOpen(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-30 border-b border-amber-300/60 bg-[#F2E6D0]/75 backdrop-blur-md"
    >
      <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 sm:gap-7">
          <Link
            href="/"
            className="group flex items-center gap-2 sm:gap-2.5 text-slate-900 transition-colors"
          >
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-teal-500 text-white shadow-sm ring-1 ring-indigo-600/15 group-hover:from-indigo-700 group-hover:to-teal-600 transition-all">
              <FlaskConical className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[15px] font-bold tracking-tight text-slate-900">
                Just Research
              </span>
              <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                Open Data Source
              </span>
            </div>
          </Link>

          <nav className="hidden sm:flex items-center gap-1">
            {user && (
              <Link
                href="/?mine=true"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-white/60 hover:text-slate-900 transition-colors"
              >
                My Datasets
              </Link>
            )}
            {user?.isAdmin && (
              <Link
                href="/admin"
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  pathname === "/admin"
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-teal-700 hover:bg-white/60"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                Admin Portal
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          {user ? (
            <>
              <Link
                href="/datasets/new"
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-all"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Publish</span>
              </Link>
              <div className="hidden md:flex items-center gap-2 rounded-full border border-amber-200/70 bg-white/80 py-1 pl-1.5 pr-3 text-sm text-slate-700">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-teal-500 text-[11px] font-semibold text-white">
                  {getInitials(user.name)}
                </span>
                <span className="max-w-[140px] truncate text-xs font-medium text-slate-700">
                  {user.name}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-amber-200/70 bg-white/80 px-3 py-2 text-xs font-medium text-slate-600 hover:border-amber-300 hover:bg-white hover:text-slate-900 disabled:opacity-50 transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign out</span>
              </button>
            </>
          ) : (
            !menuOpen && (
              <>
                <Link
                  href="/auth/login"
                  className="hidden sm:inline-flex rounded-lg px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-white/60 hover:text-slate-900 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/register"
                  className="hidden sm:inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-all"
                >
                  Get started
                </Link>
              </>
            )
          )}

          {/* Hamburger Pop-Down Toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-label="Toggle navigation menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-amber-300/70 bg-white/80 text-slate-700 hover:bg-white hover:text-slate-900 transition-all duration-200 cursor-pointer"
          >
            <span
              className={`inline-flex transition-transform duration-300 ease-out ${
                menuOpen ? "rotate-90" : "rotate-0"
              }`}
            >
              {menuOpen ? (
                <X className="h-4.5 w-4.5" />
              ) : (
                <Menu className="h-4.5 w-4.5" />
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Pop-Down Menu Panel (smooth CSS Grid height + slide + fade) */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          menuOpen
            ? "grid-rows-[1fr] opacity-100 border-t border-amber-300/60 shadow-md"
            : "grid-rows-[0fr] opacity-0 pointer-events-none"
        } bg-[#F2E6D0]/85 backdrop-blur-md`}
      >
        <div className="overflow-hidden">
          <div
            className={`mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              menuOpen ? "translate-y-0" : "-translate-y-3"
            }`}
          >
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 md:grid-cols-4">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-white/75 hover:text-indigo-700 transition-colors"
            >
              <Database className="h-4 w-4 text-indigo-600" />
              All Datasets
            </Link>
            <Link
              href="/?sort=downloads"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-white/75 hover:text-indigo-700 transition-colors"
            >
              <TrendingDown className="h-4 w-4 text-teal-600" />
              Most Downloaded
            </Link>
            <Link
              href="/?sort=views"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-white/75 hover:text-indigo-700 transition-colors"
            >
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Most Viewed
            </Link>
            <Link
              href={user ? "/datasets/new" : "/auth/login"}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-white/75 hover:text-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4 text-indigo-600" />
              Publish Dataset
            </Link>

            {user && (
              <Link
                href="/?mine=true"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-white/75 hover:text-indigo-700 transition-colors"
              >
                <FolderOpen className="h-4 w-4 text-indigo-600" />
                My Datasets
              </Link>
            )}

            {user?.isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-teal-800 hover:bg-white/75 transition-colors"
              >
                <ShieldCheck className="h-4 w-4 text-teal-600" />
                Admin Portal
              </Link>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-amber-300/60 pt-3">
            {user ? (
              <>
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-teal-500 text-[11px] font-semibold text-white">
                    {getInitials(user.name)}
                  </span>
                  <span className="font-semibold text-slate-900">
                    {user.name}
                  </span>
                  <span className="text-slate-500">({user.email})</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/70 bg-white/85 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white hover:text-slate-900 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </>
            ) : (
              <div className="flex w-full items-center justify-end gap-2">
                <Link
                  href="/auth/login"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg border border-amber-300/70 bg-white/85 px-4 py-2 text-center text-xs font-semibold text-slate-700 hover:bg-white transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-center text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
                >
                  Get started
                </Link>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </header>
  );
}
