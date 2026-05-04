"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, Scissors } from "lucide-react";
import { Primary3DButton } from "@/components/Primary3DButton";

const ease = [0.4, 0, 0.2, 1] as const;

const linkClass =
  "text-[13px] font-medium text-white transition-[opacity,color] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] hover:opacity-80";

export default function Navbar() {
  const path = usePathname();
  const isDash = path?.startsWith("/dashboard") || path?.startsWith("/jobs");

  return (
    <motion.header
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease }}
      className="pointer-events-none fixed left-0 right-0 top-5 z-[100] flex justify-center px-4"
    >
      <div
        className="pointer-events-auto flex w-full max-w-3xl items-center gap-3 rounded-full border border-white/10 bg-white/[0.05] py-2 pl-4 pr-2 shadow-[0_8px_40px_rgba(0,0,0,0.45)] backdrop-blur-[12px] [-webkit-backdrop-filter:blur(12px)] transition-[background-color,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] sm:max-w-4xl"
      >
        <Link
          href="/"
          className="flex shrink-0 items-center transition-opacity duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] hover:opacity-90"
          aria-label="Home"
        >
          <Image
            src="/logo.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
            priority
          />
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-6 md:flex" aria-label="Main">
          <Link href="/" className={linkClass}>
            Home
          </Link>
          <Link href="/dashboard" className={`flex items-center gap-1.5 ${linkClass}`}>
            <LayoutDashboard className="h-3.5 w-3.5 opacity-90" />
            Dashboard
          </Link>
        </nav>

        <Primary3DButton href="/dashboard" size="sm" className="shrink-0 gap-1">
          <Scissors className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{isDash ? "Workspace" : "Start clipping"}</span>
          <span className="sm:hidden">Clip</span>
        </Primary3DButton>
      </div>
    </motion.header>
  );
}
