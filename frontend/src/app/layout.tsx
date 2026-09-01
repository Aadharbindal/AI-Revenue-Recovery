import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "RecoverOS | Revenue Recovery",
  description: "Detect. Diagnose. Recover. Prove it.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${mono.variable} font-sans antialiased bg-[#0E0E10] text-gray-200`}>
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <aside className="w-64 bg-[#18181B] border-r border-gray-800 flex flex-col">
            <div className="p-6">
              <h1 className="text-xl font-bold text-white tracking-tight">Recover<span className="text-blue-500">OS</span></h1>
              <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-mono">Buildathon T03</p>
            </div>
            <nav className="flex-1 px-4 space-y-2 mt-4">
              <a href="/" className="block px-4 py-2 rounded bg-gray-800 text-white font-medium text-sm">Command Center</a>
              <a href="/run" className="block px-4 py-2 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition font-medium text-sm">Live Batch</a>
              <a href="/guardrails" className="block px-4 py-2 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition font-medium text-sm">Guardrails</a>
              <a href="/experiment" className="block px-4 py-2 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition font-medium text-sm">Experiment (A/B)</a>
              <a href="/exceptions" className="block px-4 py-2 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition font-medium text-sm">Exceptions</a>
            </nav>
            <div className="p-4 border-t border-gray-800 text-xs text-gray-500 font-mono">
              Status: <span className="text-green-500">Operational</span>
            </div>
          </aside>
          
          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
