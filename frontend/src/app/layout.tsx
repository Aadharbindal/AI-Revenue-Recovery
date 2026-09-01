import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import Nav from "@/components/Nav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "RecoverOS",
  description:
    "Failed-payment recovery with bounded, audited, measured interventions. The LLM never touches a rupee.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${mono.variable} font-sans antialiased`}
      >
        <div className="flex h-screen overflow-hidden">
          <Nav />
          <main className="flex-1 overflow-y-auto grid-plane">{children}</main>
        </div>
      </body>
    </html>
  );
}
