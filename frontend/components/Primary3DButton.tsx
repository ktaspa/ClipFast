"use client";

import Link from "next/link";

export type Primary3DSize = "sm" | "md" | "lg";

export interface Primary3DButtonProps {
  href?: string;
  type?: "button" | "submit";
  children: React.ReactNode;
  size?: Primary3DSize;
  /** Classes on the visible button face (padding, gap, typography). */
  className?: string;
  /** Classes on the outer control (e.g. `w-full`). */
  wrapperClassName?: string;
  disabled?: boolean;
  onClick?: () => void;
}

const padBySize: Record<Primary3DSize, string> = {
  sm: "px-4 py-2 text-[12px]",
  md: "px-5 py-2.5 text-[13px]",
  lg: "px-8 py-3.5 text-[15px]",
};

/**
 * Cluely-style 3D primary control (depth layer + face). Styles live in globals.css (`.btn-3d-primary*`).
 */
export function Primary3DButton({
  href,
  type,
  children,
  size = "md",
  className = "",
  wrapperClassName = "",
  disabled = false,
  onClick,
}: Primary3DButtonProps) {
  const pad = padBySize[size];
  const inner = (
    <>
      <span className="btn-3d-primary-depth" aria-hidden />
      <span className={`btn-3d-primary-face ${pad} ${className}`}>{children}</span>
    </>
  );

  const outer = `btn-3d-primary ${wrapperClassName}`.trim();

  if (href && !disabled) {
    return (
      <Link href={href} className={outer}>
        {inner}
      </Link>
    );
  }

  return (
    <button type={type ?? "button"} disabled={disabled} className={outer} onClick={onClick}>
      {inner}
    </button>
  );
}
