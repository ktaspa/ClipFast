"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap } from "lucide-react";
import { clsx } from "clsx";

export default function Navbar() {
  const path = usePathname();

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-surface-600 bg-surface-900/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 shadow-lg shadow-violet-500/25 group-hover:shadow-violet-500/40 transition-shadow">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              ClipFast
            </span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            <NavLink href="/" active={path === "/"}>
              Home
            </NavLink>
            <NavLink href="/dashboard" active={path.startsWith("/dashboard") || path.startsWith("/jobs")}>
              Dashboard
            </NavLink>
          </div>

          {/* CTA */}
          <Link
            href="/dashboard"
            className="rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:from-violet-500 hover:to-violet-400 transition-all"
          >
            Start Clipping
          </Link>
        </div>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "px-3 py-2 rounded-md text-sm font-medium transition-colors",
        active
          ? "text-white bg-surface-600"
          : "text-slate-400 hover:text-white hover:bg-surface-700"
      )}
    >
      {children}
    </Link>
  );
}
