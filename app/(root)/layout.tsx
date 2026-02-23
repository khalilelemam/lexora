import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import Navbar from "@/components/ui/Navbar";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import Footer from "@/components/ui/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Exia",
  description: "exia is reading assessment tool for students and teachers",
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
        {/* Wrapping everything in a flex container */}
        <div className="relative flex flex-col min-h-screen">
          <AuroraBackground />
          <Navbar />

          {/* 'flex-grow' or 'flex-1' tells this main area 
            to take up all available space, pushing the footer down.
          */}
          <main className="flex-grow relative z-10">{children}</main>

          <Footer />
        </div>
      </body>
    </html>
  );
}
