import Link from "next/link";
import { FlaskConical, HardDrive, ShieldCheck } from "lucide-react";

interface FooterProps {
  isAuthenticated: boolean;
}

export function Footer({ isAuthenticated }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-amber-300/60 bg-[#F2E6D0] text-slate-700">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-2">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 text-slate-900 transition-colors"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-teal-500 text-white shadow-xs">
                <FlaskConical className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-bold tracking-tight">
                Just Research
              </span>
            </Link>
            <p className="text-xs leading-snug text-slate-600">
              Local-first dataset repository with immutable versioning, SHA-256
              verification, previews, and citations.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/70 bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                <HardDrive className="h-3 w-3 text-indigo-600" />
                Local Storage
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/70 bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                SHA-256 Verified
              </span>
            </div>
          </div>

          {/* Explore */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-900">
              Explore
            </h3>
            <ul className="mt-2 space-y-1 text-xs">
              <li>
                <Link
                  href="/"
                  className="hover:text-indigo-600 transition-colors"
                >
                  Browse All Datasets
                </Link>
              </li>
              <li>
                <Link
                  href="/?sort=downloads"
                  className="hover:text-indigo-600 transition-colors"
                >
                  Most Downloaded
                </Link>
              </li>
              <li>
                <Link
                  href="/?sort=views"
                  className="hover:text-indigo-600 transition-colors"
                >
                  Most Viewed
                </Link>
              </li>
              <li>
                <Link
                  href="/?ext=csv"
                  className="hover:text-indigo-600 transition-colors"
                >
                  CSV &amp; JSON Datasets
                </Link>
              </li>
            </ul>
          </div>

          {/* Publish & Account */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-900">
              Contribute
            </h3>
            <ul className="mt-2 space-y-1 text-xs">
              <li>
                <Link
                  href="/datasets/new"
                  className="hover:text-indigo-600 transition-colors"
                >
                  Publish New Dataset
                </Link>
              </li>
              {isAuthenticated ? (
                <li>
                  <Link
                    href="/?mine=true"
                    className="hover:text-indigo-600 transition-colors"
                  >
                    My Datasets
                  </Link>
                </li>
              ) : (
                <>
                  <li>
                    <Link
                      href="/auth/login"
                      className="hover:text-indigo-600 transition-colors"
                    >
                      Sign In
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/auth/register"
                      className="hover:text-indigo-600 transition-colors"
                    >
                      Create Account
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Developer & Licenses */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-900">
              API &amp; Licenses
            </h3>
            <ul className="mt-2 space-y-1 text-xs">
              <li>
                <a
                  href="/api/datasets"
                  className="hover:text-indigo-600 transition-colors"
                >
                  Datasets JSON API
                </a>
              </li>
              <li>
                <Link
                  href="/?license=CC-BY-4.0"
                  className="hover:text-indigo-600 transition-colors"
                >
                  CC-BY-4.0 Datasets
                </Link>
              </li>
              <li>
                <Link
                  href="/?license=CC0-1.0"
                  className="hover:text-indigo-600 transition-colors"
                >
                  CC0-1.0 Public Domain
                </Link>
              </li>
              <li>
                <Link
                  href="/?license=MIT"
                  className="hover:text-indigo-600 transition-colors"
                >
                  MIT Licensed
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-6 flex flex-col items-center justify-between gap-2 border-t border-amber-300/60 pt-4 text-[11px] text-slate-600 sm:flex-row">
          <p>&copy; {year} Just Research. Local-first open data repository.</p>
          <p>Built with Next.js, TypeScript, Prisma &amp; SQLite</p>
        </div>
      </div>
    </footer>
  );
}
