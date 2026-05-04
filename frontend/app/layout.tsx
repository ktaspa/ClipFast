import type { Metadata } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const bebasNeue = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas", display: "swap" });

export const metadata: Metadata = {
  title: "AI Video Clipping Platform",
  description: "Paste a YouTube URL and get 5 viral short clips in minutes. AI-powered, auto-captioned, and reframed to 9:16.",
  keywords: ["video clipping", "AI clips", "YouTube shorts", "viral clips", "auto captions"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${bebasNeue.variable} font-sans text-slate-200 antialiased tracking-tight`}
        style={{ backgroundColor: "#030303" }}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
