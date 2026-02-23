import React from "react";
import Image from "next/image";
import Link from "next/link";

const Navbar = () => {
  return (
    // 'fixed' makes it stay at the top. 'backdrop-blur' blurs the content underneath.
    <header className="fixed top-0 inset-x-0 z-50 w-full bg-white/30 backdrop-blur-lg border-b border-white/20">
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.svg"
            alt="Exia Logo"
            width={100}
            height={30}
            className="object-contain"
          />
        </Link>

        {/* Semantic Navigation Links */}
        <ul className="hidden md:flex items-center gap-8">
          <li>
            <Link
              href="/#how-it-works"
              className="text-sm font-bold text-slate-800 hover:text-pink-500 transition-colors"
            >
              How it works
            </Link>
          </li>
          <li>
            <Link
              href="/#adventure"
              className="text-sm font-bold text-slate-800 hover:text-pink-500 transition-colors"
            >
              Adventure
            </Link>
          </li>
          <li>
            <Link
              href="/#mission"
              className="text-sm font-bold text-slate-800 hover:text-pink-500 transition-colors"
            >
              Mission
            </Link>
          </li>
        </ul>

        {/* Action Button */}
        <Link
          href="/login"
          className="bg-[#1a1f2e] text-white px-6 py-2.5 rounded-full text-sm font-bold hover:opacity-90 transition-opacity"
        >
          Login
        </Link>
      </nav>
    </header>
  );
};

export default Navbar;
