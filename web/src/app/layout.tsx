import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Lexora — Dyslexia Screening Platform",
    template: "%s | Lexora",
  },
  description:
    "Lexora is an eye-tracking-based dyslexia screening platform. Non-invasive, research-backed tools to help identify reading difficulties through gaze analysis.",
  keywords: [
    "dyslexia",
    "screening",
    "eye tracking",
    "reading assessment",
    "gaze analysis",
    "education",
  ],
  authors: [{ name: "Lexora Team" }],
  openGraph: {
    title: "Lexora — Dyslexia Screening Platform",
    description:
      "Non-invasive, research-backed dyslexia screening through eye-tracking technology.",
    type: "website",
    siteName: "Lexora",
    locale: "en_US",
  },
};

export const viewport: Viewport = {
  themeColor: "#51513d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
