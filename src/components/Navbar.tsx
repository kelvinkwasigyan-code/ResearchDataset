"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { FlaskConical, LogOut, Plus } from "lucide-react";

interface NavbarProps {
  user: { userId: string; name: string; email: string } | null;
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

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-7">
          <Link
            href="/"
            className="group flex items-center gap-2.5 text-slate-950 transition-colors"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 text-white shadow-sm ring-1 ring-slate-950/10 group-hover:from-indigo-600 group-hover:to-indigo-800 transition-all">
              <FlaskConical className="h-4.5 w-4.5" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[15px] font-bold tracking-tight text-slate-950">
                Just Research
              </span>
              <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">
                Open Data Repository
              </span>
            </div>
          </Link>

          <nav className="hidden sm:flex items-center gap-1">
            <Link
              href="/"
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname === "/"
                  ? "bg-slate-100 text-slate-950"
                  : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-950"
              }`}
            >
              Explore
            </Link>
            {user && (
              <Link
                href="/?mine=true"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100/80 hover:text-slate-950 transition-colors"
              >
                My Datasets
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          {user ? (
            <>
              <Link
                href="/datasets/new"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3.5 py-2 text-sm font-medium text-white shadow-xs hover:bg-slate-800 transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>Publish</span>
              </Link>
              <div className="hidden md:flex items-center gap-2 rounded-full border border-slate-200/90 bg-slate-50/80 py-1 pl-1.5 pr-3 text-sm text-slate-700">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-semibold text-white">
                  {getInitials(user.name)}
                </span>
                <span className="max-w-[140px] truncate text-xs font-medium text-slate-800">
                  {user.name}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 disabled:opacity-50 transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100/80 hover:text-slate-950 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/auth/register"
                className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-slate-800 transition-all"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
