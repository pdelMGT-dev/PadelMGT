import Link from 'next/link';
import { Trophy, Users, TrendingUp, Calendar, QrCode, Star, ChevronRight, Activity, Award } from 'lucide-react';

const mockPlayer = {
  name: 'Carlos García',
  email: 'carlos@example.com',
  country: 'Spain',
  city: 'Madrid',
  ranking: 42,
  points: 1850,
  level: 'Intermediate',
};

const stats = [
  { label: 'Ranking', value: '#42', icon: <Trophy className="w-5 h-5 text-amber-500" />, change: '+5', positive: true },
  { label: 'Points', value: '1,850', icon: <Star className="w-5 h-5 text-green-500" />, change: '+120', positive: true },
  { label: 'Win Rate', value: '68%', icon: <TrendingUp className="w-5 h-5 text-blue-500" />, change: '+3%', positive: true },
  { label: 'Matches', value: '47', icon: <Activity className="w-5 h-5 text-purple-500" />, change: '+6 this month', positive: true },
];

const recentMatches = [
  { date: '2026-04-26', partner: 'Ana M.', opponents: 'Luis R. / Sara P.', score: '16-12', result: 'W', tournament: 'Madrid Spring Americano' },
  { date: '2026-04-24', partner: 'Pedro J.', opponents: 'Juan C. / Elena V.', score: '10-16', result: 'L', tournament: 'Madrid Spring Americano' },
  { date: '2026-04-20', partner: 'Maria L.', opponents: 'Diego F. / Isabel B.', score: '16-14', result: 'W', tournament: 'Club Night' },
  { date: '2026-04-18', partner: 'Luis R.', opponents: 'Marcos H. / Lucia T.', score: '16-8', result: 'W', tournament: 'Club Night' },
];

const upcomingTournaments = [
  { name: 'Madrid Spring Americano', date: '2026-04-28', format: 'Americano', status: 'Registered' },
  { name: 'Barcelona Open', date: '2026-05-10', format: 'Mexicano', status: 'Open' },
];

const friends = [
  { name: 'Ana Martínez', ranking: 38, status: 'online' },
  { name: 'Luis Rodríguez', ranking: 55, status: 'offline' },
  { name: 'Pedro Jiménez', ranking: 61, status: 'online' },
  { name: 'Maria López', ranking: 74, status: 'offline' },
];

export default function PlayerDashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Dashboard Header */}
      <div className="bg-slate-900 text-white py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-2xl font-bold">
                {mockPlayer.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{mockPlayer.name}</h1>
                <p className="text-slate-400">{mockPlayer.city}, {mockPlayer.country} · {mockPlayer.level}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Player</span>
                  <span className="text-xs text-slate-500">Rank #{mockPlayer.ranking}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-slate-800 rounded-xl p-4 flex flex-col items-center">
                <QrCode className="w-10 h-10 text-green-400 mb-1" />
                <p className="text-xs text-slate-400">My QR Code</p>
              </div>
              <Link
                href="/tournaments"
                className="bg-green-500 hover:bg-green-400 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
              >
                Find Tournament
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-500">{stat.label}</span>
                {stat.icon}
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-1">{stat.value}</div>
              <div className={`text-xs font-medium ${stat.positive ? 'text-green-600' : 'text-red-500'}`}>
                {stat.change}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Performance Chart placeholder */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Performance (Last 6 months)</h2>
              <div className="h-40 flex items-end gap-2">
                {[65, 72, 58, 80, 68, 75].map((val, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-green-500 rounded-t-md"
                      style={{ height: `${val}%` }}
                    />
                    <span className="text-xs text-slate-400">
                      {['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'][i]}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-4 text-sm">
                <span className="flex items-center gap-1.5 text-slate-500"><span className="w-3 h-3 rounded-full bg-green-500" /> Win rate %</span>
              </div>
            </div>

            {/* Recent Matches */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Recent Matches</h2>
                <Link href="/profile/me/matches" className="text-green-600 text-sm font-medium hover:text-green-700">View all</Link>
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
                      <p className="font-semibold text-slate-800 text-sm truncate">{match.tournament}</p>
                      <p className="text-xs text-slate-500">
                        w/ {match.partner} vs {match.opponents}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-bold text-sm ${match.result === 'W' ? 'text-green-600' : 'text-red-500'}`}>
                        {match.score}
                      </p>
                      <p className="text-xs text-slate-400">{match.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Tournaments */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">My Tournaments</h2>
                <Link href="/tournaments" className="text-green-600 text-sm font-medium hover:text-green-700">Find more</Link>
              </div>
              <div className="divide-y divide-slate-50">
                {upcomingTournaments.map((t, i) => (
                  <div key={i} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{t.name}</p>
                        <p className="text-xs text-slate-500">{t.format} · {t.date}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      t.status === 'Registered' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* QR Code Card */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 text-center">
              <h3 className="font-bold text-lg mb-2">Invite to Play</h3>
              <p className="text-slate-400 text-sm mb-4">Share your QR code to invite players to a match or tournament</p>
              <div className="bg-white rounded-xl p-6 flex items-center justify-center mb-3">
                <QrCode className="w-24 h-24 text-slate-900" />
              </div>
              <p className="text-xs text-slate-500">Scan with PadelMGT app</p>
            </div>

            {/* Player Stats */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h3 className="font-bold text-slate-900 mb-4">Career Stats</h3>
              <div className="space-y-3">
                {[
                  { label: 'Matches Played', value: '47' },
                  { label: 'Matches Won', value: '32' },
                  { label: 'Tournaments Played', value: '12' },
                  { label: 'Best Result', value: '1st Place' },
                  { label: 'Current Streak', value: '3W' },
                  { label: 'Points', value: '1,850' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{item.label}</span>
                    <span className="font-semibold text-slate-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Friends */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">Friends</h3>
                <button className="text-green-600 text-sm font-medium">+ Add</button>
              </div>
              <div className="space-y-3">
                {friends.map((friend) => (
                  <div key={friend.name} className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center text-sm font-bold text-slate-600">
                        {friend.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                        friend.status === 'online' ? 'bg-green-500' : 'bg-slate-300'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">{friend.name}</p>
                      <p className="text-xs text-slate-400">Rank #{friend.ranking}</p>
                    </div>
                    <button className="text-xs text-slate-400 hover:text-green-600">
                      <Users className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 text-sm text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1">
                View all friends <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Achievements */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h3 className="font-bold text-slate-900 mb-4">Achievements</h3>
              <div className="space-y-3">
                {[
                  { label: 'First Win', icon: '🏆', earned: true },
                  { label: '10 Matches', icon: '🎯', earned: true },
                  { label: 'Tournament Winner', icon: '🥇', earned: true },
                  { label: '50 Matches', icon: '⚡', earned: false },
                  { label: 'Top 10 Ranking', icon: '⭐', earned: false },
                ].map((a) => (
                  <div key={a.label} className={`flex items-center gap-3 ${a.earned ? '' : 'opacity-40'}`}>
                    <span className="text-xl">{a.icon}</span>
                    <span className={`text-sm ${a.earned ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>{a.label}</span>
                    {a.earned && <Award className="w-3.5 h-3.5 text-green-500 ml-auto" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
