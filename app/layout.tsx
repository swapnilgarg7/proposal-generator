import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

/**
 * next/font/google self-hosts these at build time rather than hitting Google at
 * runtime. That matters beyond privacy and latency: the PDF pipeline drives
 * headless Chromium against our own origin, and a font it cannot fetch renders
 * the whole document in fallback serif.
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Sorvex Proposals",
    template: "%s · Sorvex Proposals",
  },
  description:
    "Proposal, e-signature and payment platform for SorvexAI.",
  icons: { icon: "/logo.png" },
  // Internal tool plus tokenised client links; nothing here should be indexed.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
