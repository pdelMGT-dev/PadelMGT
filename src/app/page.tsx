import Link from 'next/link';
import { Trophy, Users, Shield, Star, ChevronRight, Globe, Zap, BarChart3, QrCode } from 'lucide-react';
import { ongoingTournaments, tournamentFormats } from '@/lib/data';

export default function HomePage() {
  const featured = ongoingTournaments.slice(0, 3);

  return (
    <div>
      {/* Hero */}
      <section className="gradient-hero text-white py-24 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-full px-4 py-1.5 text-green-400 text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            The #1 Padel Management Platform
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Manage Every<br />
            <span className="text-green-400">Padel Game</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10">
            Create tournaments, run leagues, manage clubs, and track rankings — all in one platform. Built for players, club managers, league organizers, and federations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors"
            >
              Get Started Free
              <ChevronRight className="w-5 h-5" />
            </Link>
            <Link
              href="/tournaments"
              className="inline-flex items-center gap-2 border border-slate-600 hover:border-green-500 text-slate-300 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors"
            >
              Browse Tournaments
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-3xl mx-auto">
            {[
              { label: 'Players', value: '50,000+' },
              { label: 'Tournaments', value: '12,000+' },
              { label: 'Clubs', value: '1,500+' },
              { label: 'Countries', value: '45+' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-green-400">{stat.value}</div>
                <div className="text-slate-400 text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tournament Formats */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900">Tournament Formats</h2>
            <p className="text-slate-500 mt-3 text-lg">Choose the format that fits your event perfectly</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournamentFormats.map((format) => (
              <Link
                key={format.id}
                href={`/tournaments/${format.slug}`}
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 card-hover group"
              >
                <div className="text-4xl mb-4">{format.icon}</div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-green-600 transition-colors">
                  {format.name}
                </h3>
                <p className="text-slate-500 text-sm mb-4 line-clamp-2">{format.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">{format.difficulty}</span>
                  <span className="text-slate-400">{format.minPlayers}–{format.maxPlayers} players</span>
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/tournaments" className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold">
              See all formats <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Ongoing Tournaments */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-4xl font-bold text-slate-900">Live & Upcoming</h2>
              <p className="text-slate-500 mt-2 text-lg">Tournaments happening now and soon</p>
            </div>
            <Link href="/tournaments" className="hidden md:inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featured.map((t) => (
              <Link
                key={t.id}
                href={`/tournaments/detail/${t.id}`}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm card-hover overflow-hidden"
              >
                <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      t.status === 'ongoing'
                        ? 'bg-green-500 text-white'
                        : t.status === 'upcoming'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-600 text-slate-300'
                    }`}>
                      {t.status === 'ongoing' ? '● LIVE' : t.status === 'upcoming' ? 'UPCOMING' : 'COMPLETED'}
                    </span>
                    <span className="text-slate-400 text-xs">{t.format}</span>
                  </div>
                  <h3 className="text-white font-bold text-lg">{t.name}</h3>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Globe className="w-4 h-4 text-slate-400" />
                    {t.club} · {t.city}, {t.country}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Users className="w-4 h-4 text-slate-400" />
                    {t.players}/{t.maxPlayers} players · {t.level}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{t.category}</span>
                    {t.prize && <span className="text-green-600 font-bold text-sm">{t.prize}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* User Roles */}
      <section className="py-20 px-4 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold">Built for Everyone in Padel</h2>
            <p className="text-slate-400 mt-3 text-lg">One platform, tailored for every role</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Users className="w-8 h-8" />,
                title: 'Players',
                color: 'bg-green-500',
                href: '/signup?role=player',
                description: 'Find matches, track your stats, join tournaments, and connect with other players via QR code.',
                features: ['Personal dashboard', 'Match history & stats', 'Player rankings', 'QR code invites', 'Friend connections'],
              },
              {
                icon: <Shield className="w-8 h-8" />,
                title: 'Club Managers',
                color: 'bg-blue-500',
                href: '/signup?role=club_manager',
                description: 'Manage your club, organize tournaments, upload player rosters, and promote events.',
                features: ['Club dashboard', 'Tournament creation', 'Player upload & contact', 'Staff management', 'Event promotion'],
              },
              {
                icon: <Trophy className="w-8 h-8" />,
                title: 'League Organizers',
                color: 'bg-amber-500',
                href: '/signup?role=league_organizer',
                description: 'Run multi-week competitions across multiple clubs with full league management tools.',
                features: ['League dashboard', 'Multi-club support', 'Schedule management', 'Team/player uploads', 'Automated standings'],
              },
              {
                icon: <Star className="w-8 h-8" />,
                title: 'Federations',
                color: 'bg-purple-500',
                href: '/signup?role=federation',
                description: 'Manage national rankings, sanction tournaments, and govern the sport at every level.',
                features: ['National rankings', 'Tournament sanctioning', 'Multi-category management', 'Federation reports', 'Official certifications'],
              },
            ].map((role) => (
              <div key={role.title} className="bg-slate-800 rounded-2xl p-6 border border-slate-700 flex flex-col">
                <div className={`w-14 h-14 ${role.color} rounded-xl flex items-center justify-center text-white mb-4`}>
                  {role.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{role.title}</h3>
                <p className="text-slate-400 text-sm mb-4">{role.description}</p>
                <ul className="space-y-2 mb-6 flex-1">
                  {role.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={role.href}
                  className="block text-center bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors mt-auto"
                >
                  Get Started →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold text-slate-900">Everything You Need</h2>
            <p className="text-slate-500 mt-3 text-lg">Powerful features that make padel management effortless</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <QrCode className="w-6 h-6 text-green-600" />,
                title: 'QR Code Invites',
                desc: 'Players can invite others to matches or tournaments instantly by scanning a QR code, just like at padelfast.com.',
              },
              {
                icon: <Zap className="w-6 h-6 text-green-600" />,
                title: 'Live Scoring',
                desc: 'Follow matches in real-time with live score updates, court-by-court tracking, and match timelines.',
              },
              {
                icon: <BarChart3 className="w-6 h-6 text-green-600" />,
                title: 'Rankings & Stats',
                desc: 'Automated ranking calculations per category. Full match statistics and historical performance data per player.',
              },
              {
                icon: <Users className="w-6 h-6 text-green-600" />,
                title: 'Player Management',
                desc: 'Upload bulk player data via CSV. System automatically contacts players to join the platform.',
              },
              {
                icon: <Globe className="w-6 h-6 text-green-600" />,
                title: 'Multi-Club Leagues',
                desc: 'Run leagues spanning multiple clubs and cities. Full schedule generation and standings management.',
              },
              {
                icon: <Shield className="w-6 h-6 text-green-600" />,
                title: 'Role-Based Access',
                desc: 'Granular permissions for every role. Club admins can create sub-admins for specific tasks.',
              },
            ].map((f) => (
              <div key={f.title} className="flex gap-4">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">{f.title}</h3>
                  <p className="text-slate-500 text-sm">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 gradient-green text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-green-100 text-lg mb-8">
            Join thousands of players, clubs, and organizers already using PadelMGT.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-white text-green-700 px-10 py-4 rounded-xl font-bold text-lg hover:bg-green-50 transition-colors"
          >
            Create Your Free Account
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
