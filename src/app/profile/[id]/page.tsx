import Link from 'next/link';
import { Trophy, Users, TrendingUp, MapPin, QrCode, Star, Activity, Calendar } from 'lucide-react';

const mockProfile = {
  id: 'carlos-garcia',
  name: 'Carlos García',
  country: 'Spain',
  city: 'Madrid',
  ranking: 42,
  points: 1850,
  level: 'Intermediate',
  joinedYear: '2023',
  club: 'Padel Madrid Central',
};

const recentMatches = [
  { date: '2026-04-26', partner: 'Ana M.', opponents: 'Luis R. / Sara P.', score: '16-12', result: 'W', tournament: 'Madrid Spring Americano' },
  { date: '2026-04-24', partner: 'Pedro J.', opponents: 'Juan C. / Elena V.', score: '10-16', result: 'L', tournament: 'Madrid Spring Americano' },
  { date: '2026-04-20', partner: 'Maria L.', opponents: 'Diego F. / Isabel B.', score: '16-14', result: 'W', tournament: 'Club Night' },
];

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PlayerProfilePage({ params }: Props) {
  const { id } = await params;

  return (
    <div>
      {/* Profile Header */}
      <section className="bg-slate-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-3xl font-bold">
                CG
              </div>
              <div>
                <h1 className="text-3xl font-bold">{mockProfile.name}</h1>
                <div className="flex items-center gap-2 text-slate-400 mt-1">
                  <MapPin className="w-4 h-4" />
                  {mockProfile.city}, {mockProfile.country} · {mockProfile.club}
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <span className="bg-green-500/20 text-green-400 text-sm px-3 py-1 rounded-full">{mockProfile.level}</span>
                  <span className="text-slate-500 text-sm">Member since {mockProfile.joinedYear}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-slate-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-amber-400">#{mockProfile.ranking}</div>
                <div className="text-xs text-slate-400">Ranking</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-green-400">{mockProfile.points.toLocaleString()}</div>
                <div className="text-xs text-slate-400">Points</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-5 flex flex-col items-center">
                <QrCode className="w-10 h-10 text-green-400 mb-1" />
                <p className="text-xs text-slate-400">Invite</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Matches', value: '47', icon: <Activity className="w-5 h-5 text-blue-500" /> },
                { label: 'Wins', value: '32', icon: <Trophy className="w-5 h-5 text-amber-500" /> },
                { label: 'Win Rate', value: '68%', icon: <TrendingUp className="w-5 h-5 text-green-500" /> },
                { label: 'Tournaments', value: '12', icon: <Calendar className="w-5 h-5 text-purple-500" /> },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                  <div className="flex justify-center mb-2">{stat.icon}</div>
                  <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                  <div className="text-xs text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Recent Matches */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">Recent Matches</h2>
              </div>
              <div className="divide-y divide-slate-50">
                {recentMatches.map((match, i) => (
                  <div key={i} className="px-6 py-4 flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      match.result === 'W' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {match.result}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">{match.tournament}</p>
                      <p className="text-xs text-slate-500">w/ {match.partner} vs {match.opponents}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-bold text-sm ${match.result === 'W' ? 'text-green-600' : 'text-red-500'}`}>{match.score}</p>
                      <p className="text-xs text-slate-400">{match.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Invite via QR */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 text-center">
              <h3 className="font-bold text-lg mb-3">Challenge to a Match</h3>
              <div className="bg-white rounded-xl p-6 flex items-center justify-center mb-3">
                <QrCode className="w-24 h-24 text-slate-900" />
              </div>
              <p className="text-slate-400 text-sm mb-4">Scan to challenge {mockProfile.name.split(' ')[0]} to a game</p>
              <button className="w-full bg-green-500 hover:bg-green-400 text-white px-4 py-2.5 rounded-lg font-semibold transition-colors">
                Send Challenge
              </button>
            </div>

            {/* Career Summary */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h3 className="font-bold text-slate-900 mb-4">Career Summary</h3>
              <div className="space-y-3 text-sm">
                {[
                  { label: 'Club', value: mockProfile.club },
                  { label: 'Best Result', value: '1st Place' },
                  { label: 'Current Streak', value: '3 wins' },
                  { label: 'Favourite Format', value: 'Americano' },
                  { label: 'Member Since', value: mockProfile.joinedYear },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between">
                    <span className="text-slate-500">{item.label}</span>
                    <span className="font-semibold text-slate-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Friend */}
            <button className="w-full flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-4 py-3 rounded-xl font-semibold transition-colors">
              <Users className="w-5 h-5" />
              Add as Friend
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
