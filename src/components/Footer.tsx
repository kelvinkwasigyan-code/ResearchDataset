import Link from "next/link";
import { FlaskConical, HardDrive, ShieldCheck } from "lucide-react";

interface FooterProps {
  isAuthenticated: boolean;
}

export function Footer({ isAuthenticated }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-slate-200/80 bg-white text-slate-600">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1 space-y-3">
            <Link
              href="/"
              className="group inline-flex items-center gap-2.5 text-slate-950 transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 text-white shadow-xs">
                <FlaskConical className="h-4 w-4" />
              </div>
              <span className="text-base font-bold tracking-tight">
                Just Research
              </span>
            </Link>
            <p className="text-xs leading-relaxed text-slate-500">
              A local-first dataset repository with immutable versioning,
              SHA-256 verification, in-browser file previews, and APA/BibTeX
              citations.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                <HardDrive className="h-3 w-3 text-indigo-600" />
                Local Storage
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                SHA-256 Verified
              </span>
            </div>
          </div>

          {/* Explore */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              Explore
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
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
                  CSV Datasets
                </Link>
              </li>
              <li>
                <Link
                  href="/?ext=json"
                  className="hover:text-indigo-600 transition-colors"
                >
                  JSON Datasets
                </Link>
              </li>
            </ul>
          </div>

          {/* Publish & Account */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              Contribute
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
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
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              API &amp; Licenses
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
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
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-6 text-xs text-slate-500 sm:flex-row">
          <p>&copy; {year} Just Research. Local-first open data repository.</p>
          <p>Built with Next.js, TypeScript, Prisma &amp; SQLite</p>
        </div>
      </div>
    </footer>
  );
}
