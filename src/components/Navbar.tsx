'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, Trophy, ChevronDown, User, LogIn } from 'lucide-react';

const navLinks = [
  {
    label: 'Tournaments',
    href: '/tournaments',
    children: [
      { label: 'All Formats', href: '/tournaments' },
      { label: 'Americano', href: '/tournaments/americano' },
      { label: 'Mexicano', href: '/tournaments/mexicano' },
      { label: 'Round Robin', href: '/tournaments/round-robin' },
      { label: 'Knockout', href: '/tournaments/knockout' },
    ],
  },
  { label: 'Leagues', href: '/leagues' },
  { label: 'Clubs', href: '/clubs' },
  { label: 'Live Scores', href: '/live-scores' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  return (
    <nav className="bg-slate-900 text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <span className="text-white">Padel<span className="text-green-400">MGT</span></span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <div
                key={link.label}
                className="relative"
                onMouseEnter={() => link.children && setActiveDropdown(link.label)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <Link
                  href={link.href}
                  className="flex items-center gap-1 text-slate-300 hover:text-white text-sm font-medium transition-colors py-2"
                >
                  {link.label}
                  {link.children && <ChevronDown className="w-3 h-3" />}
                </Link>
                {link.children && activeDropdown === link.label && (
                  <div className="absolute top-full left-0 bg-white text-slate-800 rounded-lg shadow-xl py-2 min-w-[180px] border border-slate-100">
                    {link.children.map((child) => (
                      <Link
                        key={child.label}
                        href={child.href}
                        className="block px-4 py-2 text-sm hover:bg-green-50 hover:text-green-700 transition-colors"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="flex items-center gap-2 text-slate-300 hover:text-white text-sm font-medium transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Log In
            </Link>
            <Link
              href="/signup"
              className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <User className="w-4 h-4" />
              Sign Up
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden text-slate-300 hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-slate-800 border-t border-slate-700 px-4 py-4 space-y-2">
          {navLinks.map((link) => (
            <div key={link.label}>
              <Link
                href={link.href}
                className="block py-2 text-slate-300 hover:text-white font-medium"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
              {link.children && (
                <div className="pl-4 space-y-1">
                  {link.children.map((child) => (
                    <Link
                      key={child.label}
                      href={child.href}
                      className="block py-1.5 text-sm text-slate-400 hover:text-green-400"
                      onClick={() => setMobileOpen(false)}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="pt-4 border-t border-slate-700 flex flex-col gap-2">
            <Link href="/login" className="text-slate-300 py-2 font-medium" onClick={() => setMobileOpen(false)}>Log In</Link>
            <Link href="/signup" className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold text-center" onClick={() => setMobileOpen(false)}>Sign Up</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
