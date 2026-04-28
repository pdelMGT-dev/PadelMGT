import Link from 'next/link';
import { Trophy, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 font-bold text-xl mb-4">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <span className="text-white">Padel<span className="text-green-400">MGT</span></span>
            </Link>
            <p className="text-sm leading-relaxed">
              The complete platform for managing padel tournaments, leagues, clubs, and player rankings worldwide.
            </p>
            <div className="flex gap-3 mt-4">
              {['f', 'in', 'ig', 'tw'].map((s) => (
                <div key={s} className="w-8 h-8 rounded-full bg-slate-700 hover:bg-green-600 flex items-center justify-center cursor-pointer transition-colors text-xs font-bold text-white">
                  {s}
                </div>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-white font-semibold mb-4">Platform</h4>
            <ul className="space-y-2 text-sm">
              {[
                { label: 'Tournaments', href: '/tournaments' },
                { label: 'Leagues', href: '/leagues' },
                { label: 'Clubs', href: '/clubs' },
                { label: 'Live Scores', href: '/live-scores' },
                { label: 'Rankings', href: '/rankings' },
              ].map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="hover:text-green-400 transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For Users */}
          <div>
            <h4 className="text-white font-semibold mb-4">For Users</h4>
            <ul className="space-y-2 text-sm">
              {[
                { label: 'Players', href: '/signup?role=player' },
                { label: 'Club Managers', href: '/signup?role=club_manager' },
                { label: 'League Organizers', href: '/signup?role=league_organizer' },
                { label: 'Federations', href: '/signup?role=federation' },
                { label: 'Sign Up', href: '/signup' },
              ].map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="hover:text-green-400 transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 mt-0.5 text-green-500 shrink-0" />
                <span>hello@padelmgt.com</span>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 mt-0.5 text-green-500 shrink-0" />
                <span>+34 91 000 0000</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-green-500 shrink-0" />
                <span>Madrid, Spain</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
          <p>© 2026 PadelMGT. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-green-400 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-green-400 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
