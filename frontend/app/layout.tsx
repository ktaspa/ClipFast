import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ClipFast — AI Video Clipping Platform",
  description:
    "Paste a YouTube URL and get 5 viral short clips in minutes. AI-powered, auto-captioned, and reframed to 9:16.",
  keywords: ["video clipping", "AI clips", "YouTube shorts", "viral clips", "auto captions"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} bg-surface-900 text-slate-200 antialiased`}>
        {children}
      </body>
    </html>
  );
}
