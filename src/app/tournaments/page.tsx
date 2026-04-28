import Link from 'next/link';
import { Trophy, Users, Clock, ChevronRight, Filter } from 'lucide-react';
import { tournamentFormats, ongoingTournaments } from '@/lib/data';

export const metadata = {
  title: 'Tournament Formats – PadelMGT',
  description: 'Explore all padel tournament formats: Americano, Mexicano, Round Robin, Knockout, Swiss and more.',
};

export default function TournamentsPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-slate-900 text-white py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <nav className="text-slate-400 text-sm mb-4">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-white">Tournaments</span>
          </nav>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Tournament Formats</h1>
          <p className="text-slate-400 text-lg max-w-2xl">
            From casual social Americanos to professional knockout brackets — choose the format that fits your event perfectly.
          </p>
        </div>
      </section>

      {/* Formats Grid */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">All Formats</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournamentFormats.map((format) => (
              <Link
                key={format.id}
                href={`/tournaments/${format.slug}`}
                className="bg-white rounded-2xl p-7 shadow-sm border border-slate-100 card-hover group"
              >
                <div className="text-5xl mb-5">{format.icon}</div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-green-600 transition-colors">
                  {format.name}
                </h3>
                <p className="text-slate-500 text-sm mb-5 leading-relaxed">{format.description}</p>
                <div className="border-t border-slate-100 pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Users className="w-4 h-4 text-slate-400" />
                    {format.minPlayers}–{format.maxPlayers} players
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {format.duration}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium">
                      {format.difficulty}
                    </span>
                    <span className="text-green-600 font-semibold text-sm flex items-center gap-1">
                      See details <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Ongoing Tournaments */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Active &amp; Upcoming Tournaments</h2>
            <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
              <Filter className="w-4 h-4" />
              Filter
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex gap-2 mb-6">
            {['All', 'Live', 'Upcoming', 'Completed'].map((tab) => (
              <button
                key={tab}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === 'All'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {ongoingTournaments.map((t) => (
              <Link
                key={t.id}
                href={`/tournaments/detail/${t.id}`}
                className="flex flex-col md:flex-row md:items-center gap-4 bg-white border border-slate-200 rounded-xl p-5 card-hover"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      t.status === 'ongoing'
                        ? 'bg-green-100 text-green-700'
                        : t.status === 'upcoming'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {t.status === 'ongoing' ? '● LIVE' : t.status === 'upcoming' ? 'UPCOMING' : 'COMPLETED'}
                    </span>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{t.format}</span>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{t.category}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{t.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{t.club} · {t.city}, {t.country}</p>
                </div>
                <div className="flex items-center gap-8 text-sm text-slate-600">
                  <div>
                    <div className="font-semibold text-slate-900">{t.players}/{t.maxPlayers}</div>
                    <div className="text-slate-400 text-xs">Players</div>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{t.level}</div>
                    <div className="text-slate-400 text-xs">Level</div>
                  </div>
                  {t.prize && (
                    <div>
                      <div className="font-semibold text-green-600">{t.prize}</div>
                      <div className="text-slate-400 text-xs">Prize</div>
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-slate-900">{t.startDate}</div>
                    <div className="text-slate-400 text-xs">Date</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Create Tournament CTA */}
      <section className="py-12 px-4 bg-green-600 text-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-bold mb-1">Want to run your own tournament?</h3>
            <p className="text-green-100">Create any format in minutes — free for up to 12 players.</p>
          </div>
          <Link
            href="/signup"
            className="shrink-0 bg-white text-green-700 px-8 py-3 rounded-xl font-bold hover:bg-green-50 transition-colors"
          >
            Create a Tournament
          </Link>
        </div>
      </section>
    </div>
  );
}
