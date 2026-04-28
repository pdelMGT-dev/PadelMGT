import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, Users, Calendar, Trophy, QrCode, ChevronRight } from 'lucide-react';
import { ongoingTournaments } from '@/lib/data';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return ongoingTournaments.map((t) => ({ id: t.id }));
}

const mockMatches = [
  { court: 'Court 1', team1: ['Carlos G.', 'Ana M.'], team2: ['Luis R.', 'Sara P.'], score: '16 - 12', status: 'completed' },
  { court: 'Court 2', team1: ['Pedro J.', 'Maria L.'], team2: ['Juan C.', 'Elena V.'], score: '8 - 6', status: 'live' },
  { court: 'Court 1', team1: ['Diego F.', 'Isabel B.'], team2: ['Marcos H.', 'Lucia T.'], score: null, status: 'upcoming' },
];

const mockStandings = [
  { pos: 1, name: 'Carlos G.', played: 3, won: 3, pts: 42, winRate: 100 },
  { pos: 2, name: 'Ana M.', played: 3, won: 2, pts: 38, winRate: 67 },
  { pos: 3, name: 'Luis R.', played: 3, won: 2, pts: 35, winRate: 67 },
  { pos: 4, name: 'Pedro J.', played: 3, won: 1, pts: 28, winRate: 33 },
  { pos: 5, name: 'Maria L.', played: 3, won: 1, pts: 24, winRate: 33 },
  { pos: 6, name: 'Juan C.', played: 2, won: 0, pts: 18, winRate: 0 },
];

export default async function TournamentDetailPage({ params }: Props) {
  const { id } = await params;
  const tournament = ongoingTournaments.find((t) => t.id === id);
  if (!tournament) notFound();

  return (
    <div>
      {/* Header */}
      <section className="bg-slate-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <nav className="text-slate-400 text-sm mb-4">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/tournaments" className="hover:text-white">Tournaments</Link>
            <span className="mx-2">/</span>
            <span className="text-white">{tournament.name}</span>
          </nav>
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                  tournament.status === 'ongoing'
                    ? 'bg-green-500 text-white'
                    : tournament.status === 'upcoming'
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-600 text-slate-300'
                }`}>
                  {tournament.status === 'ongoing' ? '● LIVE' : tournament.status === 'upcoming' ? 'UPCOMING' : 'COMPLETED'}
                </span>
                <span className="text-slate-400 text-sm">{tournament.format}</span>
              </div>
              <h1 className="text-4xl font-bold mb-2">{tournament.name}</h1>
              <div className="flex flex-wrap gap-4 text-slate-300 text-sm mt-4">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-green-400" />
                  {tournament.club}, {tournament.city}, {tournament.country}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-green-400" />
                  {tournament.startDate}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-green-400" />
                  {tournament.players}/{tournament.maxPlayers} players
                </span>
                <span className="flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-green-400" />
                  {tournament.level}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-center bg-slate-800 rounded-xl p-5 gap-2">
              <QrCode className="w-16 h-16 text-green-400" />
              <p className="text-xs text-slate-400 text-center">Scan to join<br />this tournament</p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main */}
          <div className="lg:col-span-2 space-y-8">
            {/* Matches */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-bold text-slate-900">Matches</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {mockMatches.map((match, i) => (
                  <div key={i} className="px-6 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-xs text-slate-400 font-medium w-16">{match.court}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="text-right flex-1">
                            <p className="font-semibold text-slate-800 text-sm">{match.team1[0]}</p>
                            <p className="text-slate-500 text-xs">{match.team1[1]}</p>
                          </div>
                          <div className="text-center min-w-[80px]">
                            {match.score ? (
                              <span className="font-bold text-slate-900 text-sm bg-slate-100 px-3 py-1 rounded">
                                {match.score}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">vs</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-slate-800 text-sm">{match.team2[0]}</p>
                            <p className="text-slate-500 text-xs">{match.team2[1]}</p>
                          </div>
                        </div>
                      </div>
                      <div className="w-20 text-right">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          match.status === 'live'
                            ? 'bg-green-100 text-green-700'
                            : match.status === 'upcoming'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {match.status === 'live' ? '● Live' : match.status === 'upcoming' ? 'Soon' : 'Done'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Standings */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-bold text-slate-900">Standings</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-6 py-3 text-slate-500 font-medium">#</th>
                      <th className="text-left px-4 py-3 text-slate-500 font-medium">Player</th>
                      <th className="text-center px-4 py-3 text-slate-500 font-medium">P</th>
                      <th className="text-center px-4 py-3 text-slate-500 font-medium">W</th>
                      <th className="text-center px-4 py-3 text-slate-500 font-medium">Pts</th>
                      <th className="text-center px-4 py-3 text-slate-500 font-medium">Win%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {mockStandings.map((row) => (
                      <tr key={row.pos} className={`${row.pos <= 2 ? 'bg-green-50/50' : ''}`}>
                        <td className="px-6 py-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            row.pos === 1 ? 'bg-amber-400 text-white' : row.pos === 2 ? 'bg-slate-300 text-white' : 'text-slate-500'
                          }`}>
                            {row.pos}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{row.name}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{row.played}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{row.won}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-900">{row.pts}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-semibold ${row.winRate >= 50 ? 'text-green-600' : 'text-slate-500'}`}>
                            {row.winRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Tournament Info */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h3 className="font-bold text-slate-900 mb-4">Tournament Details</h3>
              <dl className="space-y-3 text-sm">
                {[
                  { label: 'Format', value: tournament.format },
                  { label: 'Category', value: tournament.category },
                  { label: 'Level', value: tournament.level },
                  { label: 'Players', value: `${tournament.players}/${tournament.maxPlayers}` },
                  { label: 'Date', value: tournament.startDate },
                  ...(tournament.prize ? [{ label: 'Prize', value: tournament.prize }] : []),
                ].map((item) => (
                  <div key={item.label} className="flex justify-between">
                    <dt className="text-slate-500">{item.label}</dt>
                    <dd className="font-semibold text-slate-800">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Join */}
            <div className="bg-green-600 text-white rounded-2xl p-6">
              <h3 className="font-bold text-xl mb-2">Want to join?</h3>
              <p className="text-green-100 text-sm mb-4">
                {tournament.players < tournament.maxPlayers
                  ? `${tournament.maxPlayers - tournament.players} spots remaining`
                  : 'Tournament is full'}
              </p>
              <Link
                href="/signup"
                className="block w-full text-center bg-white text-green-700 px-4 py-3 rounded-lg font-bold hover:bg-green-50 transition-colors"
              >
                Sign Up to Join
              </Link>
            </div>

            {/* Format Link */}
            <Link
              href={`/tournaments/${tournament.formatSlug}`}
              className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-5 card-hover"
            >
              <div>
                <p className="text-xs text-slate-400 mb-1">Format Guide</p>
                <p className="font-bold text-slate-800">How {tournament.format} Works</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
