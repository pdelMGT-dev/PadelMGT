import Link from 'next/link';
import { Trophy, Users, Calendar, Plus, Upload, ChevronRight, Globe, BarChart3 } from 'lucide-react';

const leagueStats = [
  { label: 'Active Teams', value: '12', icon: <Users className="w-5 h-5 text-amber-500" />, sub: '48 players total' },
  { label: 'Match Days', value: '11', icon: <Calendar className="w-5 h-5 text-blue-500" />, sub: '5 remaining' },
  { label: 'Clubs Participating', value: '6', icon: <Globe className="w-5 h-5 text-green-500" />, sub: 'Across 3 cities' },
  { label: 'Season Progress', value: '55%', icon: <BarChart3 className="w-5 h-5 text-purple-500" />, sub: 'On schedule' },
];

const standings = [
  { pos: 1, team: 'Padel Madrid A', played: 10, won: 8, drawn: 1, lost: 1, pts: 25, diff: '+42' },
  { pos: 2, team: 'Barcelona Elite', played: 10, won: 7, drawn: 2, lost: 1, pts: 23, diff: '+31' },
  { pos: 3, team: 'Valencia Stars', played: 10, won: 6, drawn: 1, lost: 3, pts: 19, diff: '+18' },
  { pos: 4, team: 'Madrid South', played: 10, won: 5, drawn: 2, lost: 3, pts: 17, diff: '+12' },
  { pos: 5, team: 'Barça B Club', played: 10, won: 4, drawn: 1, lost: 5, pts: 13, diff: '-5' },
  { pos: 6, team: 'Sevilla Pádel', played: 10, won: 3, drawn: 0, lost: 7, pts: 9, diff: '-28' },
];

const upcomingMatchdays = [
  { day: 'Match Day 12', date: '2026-05-04', matches: 6, clubs: ['Madrid Central', 'Club Barcelona'] },
  { day: 'Match Day 13', date: '2026-05-11', matches: 6, clubs: ['Valencia Club', 'Padel Madrid'] },
  { day: 'Match Day 14', date: '2026-05-18', matches: 6, clubs: ['TBD'] },
];

const categories = [
  { name: 'Open Men', teams: 4, status: 'active' },
  { name: 'Open Women', teams: 4, status: 'active' },
  { name: 'Mixed', teams: 4, status: 'active' },
  { name: 'Senior +45', teams: 2, status: 'upcoming' },
];

export default function LeagueDashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 text-white py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-amber-500 rounded-xl flex items-center justify-center">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="text-amber-400 text-xs font-semibold uppercase tracking-wide mb-1">League Organizer Dashboard</div>
                <h1 className="text-2xl font-bold">Liga Nacional de Pádel España</h1>
                <p className="text-slate-400">Season 2026 · Madrid, Spain · Real Federación Española de Pádel</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
                <Upload className="w-4 h-4" /> Import Teams
              </button>
              <button className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors">
                <Plus className="w-4 h-4" /> Schedule Matches
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {leagueStats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-500">{stat.label}</span>
                {stat.icon}
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-1">{stat.value}</div>
              <div className="text-xs text-slate-400">{stat.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Standings Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">League Standings</h2>
                <div className="flex gap-2">
                  {categories.slice(0, 3).map((cat) => (
                    <button key={cat.name} className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      cat.name === 'Open Men' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}>
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-6 py-3 text-slate-500 font-medium">#</th>
                      <th className="text-left px-4 py-3 text-slate-500 font-medium">Team</th>
                      <th className="text-center px-3 py-3 text-slate-500 font-medium">P</th>
                      <th className="text-center px-3 py-3 text-slate-500 font-medium">W</th>
                      <th className="text-center px-3 py-3 text-slate-500 font-medium">D</th>
                      <th className="text-center px-3 py-3 text-slate-500 font-medium">L</th>
                      <th className="text-center px-3 py-3 text-slate-500 font-medium">+/-</th>
                      <th className="text-center px-4 py-3 text-slate-500 font-medium">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {standings.map((row) => (
                      <tr key={row.pos} className={row.pos <= 2 ? 'bg-amber-50/40' : ''}>
                        <td className="px-6 py-3">
                          <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold ${
                            row.pos === 1 ? 'bg-amber-400 text-white' :
                            row.pos === 2 ? 'bg-slate-400 text-white' :
                            row.pos <= 4 ? 'bg-green-100 text-green-700' : 'text-slate-400'
                          }`}>
                            {row.pos}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{row.team}</td>
                        <td className="px-3 py-3 text-center text-slate-600">{row.played}</td>
                        <td className="px-3 py-3 text-center text-slate-600">{row.won}</td>
                        <td className="px-3 py-3 text-center text-slate-500">{row.drawn}</td>
                        <td className="px-3 py-3 text-center text-slate-500">{row.lost}</td>
                        <td className={`px-3 py-3 text-center text-xs font-semibold ${
                          row.diff.startsWith('+') ? 'text-green-600' : 'text-red-500'
                        }`}>{row.diff}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-900">{row.pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Upcoming Match Days */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Upcoming Match Days</h2>
                <button className="flex items-center gap-1 text-amber-600 text-sm font-medium hover:text-amber-700">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
              <div className="divide-y divide-slate-50">
                {upcomingMatchdays.map((day, i) => (
                  <div key={i} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{day.day}</p>
                        <p className="text-xs text-slate-500">{day.date} · {day.matches} matches · {day.clubs.join(', ')}</p>
                      </div>
                    </div>
                    <button className="flex items-center gap-1 text-slate-400 hover:text-amber-600 text-sm transition-colors">
                      Manage <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Categories */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">Categories</h3>
                <button className="text-amber-600 text-sm font-medium">+ Add</button>
              </div>
              <div className="space-y-3">
                {categories.map((cat, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{cat.name}</p>
                      <p className="text-xs text-slate-400">{cat.teams} teams</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      cat.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {cat.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Participating Clubs */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">Clubs</h3>
                <button className="text-amber-600 text-sm font-medium">+ Invite</button>
              </div>
              <div className="space-y-3">
                {[
                  { name: 'Padel Madrid Central', city: 'Madrid' },
                  { name: 'Club Padel Barcelona', city: 'Barcelona' },
                  { name: 'Valencia Padel Club', city: 'Valencia' },
                  { name: 'Madrid South Club', city: 'Madrid' },
                  { name: 'Barça B Padel', city: 'Barcelona' },
                  { name: 'Sevilla Pádel Club', city: 'Seville' },
                ].map((club, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                      <Globe className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{club.name}</p>
                      <p className="text-xs text-slate-400">{club.city}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Import Banner */}
            <div className="bg-amber-500 text-white rounded-2xl p-6">
              <Upload className="w-8 h-8 mb-3" />
              <h3 className="font-bold text-lg mb-2">Import Team/Player Data</h3>
              <p className="text-amber-100 text-sm mb-4">Upload rosters via CSV. Players will be automatically invited to the platform.</p>
              <button className="w-full bg-white text-amber-700 px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-amber-50 transition-colors">
                Upload CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
