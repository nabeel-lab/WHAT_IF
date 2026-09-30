import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ECDAT | Enterprise Cryptographic Investigation Platform",
  description: "Deterministic discovery, call-graph reachability, dynamic runtime evidence & post-quantum migration simulation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0B0F14] text-[#EAF0F6] antialiased selection:bg-[#60F1D0]/30 selection:text-[#EAF0F6]">
        <div className="flex min-h-screen flex-col bg-[#0B0F14] spatial-canvas">
          {/* Global Instrument Bar */}
          <header className="border-b border-[#A8B4C2]/15 glass-dock sticky top-0 z-40" style={{ borderRadius: 0 }}>
            <div className="flex h-14 items-center justify-between px-6 max-w-7xl mx-auto w-full">
              <Link href="/" className="flex items-center space-x-3 group">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#60F1D0] shadow-[0_0_10px_#60F1D0] group-hover:scale-110 transition-transform" />
                  <span className="text-base font-extrabold tracking-wider text-[#EAF0F6]">ECDAT</span>
                </div>
                <span className="text-xs text-[#A8B4C2] border-l border-[#A8B4C2]/20 pl-3 ml-1 font-mono tracking-tight group-hover:text-[#EAF0F6] transition-colors">
                  Enterprise Cryptographic Investigation Platform
                </span>
              </Link>
              <div className="flex items-center gap-3 text-xs font-mono">
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1C2632]/80 border border-[#A8B4C2]/15 text-[#A8B4C2]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#60F1D0] animate-pulse" />
                  <span>NIST PQC READY</span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#1C2632] border border-[#60F1D0]/30 text-[#60F1D0] shadow-[0_0_12px_rgba(96,241,208,0.12)]">
                  v2.0-spatial
                </span>
              </div>
            </div>
          </header>
          <main className="flex-1 flex flex-col">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
