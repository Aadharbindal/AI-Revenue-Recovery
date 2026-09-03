import type { Metadata } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";

import Nav from "@/components/Nav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

// Display face, used only at large sizes: page titles and hero figures.
//
// Inter everywhere is the safe choice and reads as unconsidered - it is the
// face every dashboard defaults to. A high-contrast serif against a dark
// instrument panel does the opposite: it says somebody chose this. It is
// deliberately kept away from small text and anything in a column, where its
// contrast works against legibility and mono's tabular figures win.
const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

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
        className={`${inter.variable} ${mono.variable} ${display.variable} font-sans antialiased`}
      >
        <div className="flex h-screen overflow-hidden">
          <Nav />
          <main className="flex-1 overflow-y-auto grid-plane">{children}</main>
        </div>
      </body>
    </html>
  );
}
