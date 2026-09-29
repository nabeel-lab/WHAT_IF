import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ECDAT | Cryptographic Migration Intelligence",
  description: "Enterprise Cryptographic Discovery, Analysis & Migration Intelligence",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0B0F14] text-[#EAF0F6] antialiased`}>
        <div className="flex min-h-screen flex-col bg-[#0B0F14]">
          <header className="border-b border-[#A8B4C2]/15 bg-[#151C25]/85 backdrop-blur-xl sticky top-0 z-40">
            <div className="flex h-14 items-center justify-between px-6">
              <div className="flex items-center space-x-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#60F1D0] shadow-[0_0_10px_#60F1D0]" />
                  <span className="text-base font-bold tracking-wider text-[#EAF0F6]">ECDAT</span>
                </div>
                <span className="text-xs text-[#A8B4C2] border-l border-[#A8B4C2]/20 pl-3 ml-1 font-mono tracking-tight">
                  Cryptographic Investigation Workspace
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#A8B4C2] font-mono">
                <span className="px-2 py-0.5 rounded-full bg-[#1C2632] border border-[#A8B4C2]/15 text-[#60F1D0]">
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
