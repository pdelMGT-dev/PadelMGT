import Link from 'next/link';
import { Trophy, Users, Globe, Star, Shield, BarChart3, Plus, Award, ChevronRight, TrendingUp } from 'lucide-react';

const fedStats = [
  { label: 'Registered Players', value: '24,850', icon: <Users className="w-5 h-5 text-blue-500" />, sub: '+1,240 this season' },
  { label: 'Sanctioned Tournaments', value: '342', icon: <Trophy className="w-5 h-5 text-amber-500" />, sub: '28 this month' },
  { label: 'Member Clubs', value: '187', icon: <Globe className="w-5 h-5 text-green-500" />, sub: 'Across 17 regions' },
  { label: 'Active Leagues', value: '34', icon: <BarChart3 className="w-5 h-5 text-purple-500" />, sub: 'National & regional' },
];

const nationalRankings = [
  { pos: 1, player: 'Alejandro Ruiz', club: 'Padel Madrid Central', points: 4200, trend: '+2' },
  { pos: 2, player: 'Carlos García', club: 'Club Padel Barcelona', points: 3980, trend: '0' },
  { pos: 3, player: 'Miguel Torres', club: 'Valencia Stars', points: 3750, trend: '+1' },
  { pos: 4, player: 'Pablo Sánchez', club: 'Padel Madrid Central', points: 3620, trend: '-1' },
  { pos: 5, player: 'Javier Moreno', club: 'Sevilla Pádel', points: 3480, trend: '+3' },
  { pos: 6, player: 'David López', club: 'Barcelona Elite', points: 3310, trend: '-2' },
  { pos: 7, player: 'Rafael Núñez', club: 'Madrid South', points: 3200, trend: '+1' },
  { pos: 8, player: 'Sergio Castro', club: 'Valencia Stars', points: 3050, trend: '0' },
];

const categories = [
  { name: 'Open Men', players: 4200, tournaments: 98, status: 'active' },
  { name: 'Open Women', players: 3800, tournaments: 87, status: 'active' },
  { name: 'Mixed', players: 5200, tournaments: 76, status: 'active' },
  { name: 'Senior +45', players: 2100, tournaments: 42, status: 'active' },
  { name: 'Junior U18', players: 1800, tournaments: 29, status: 'active' },
  { name: 'Wheelchair', players: 450, tournaments: 10, status: 'active' },
];

const pendingApprovals = [
  { name: 'Costa del Sol Open', organizer: 'Málaga Tennis Club', date: '2026-05-15', type: 'Tournament', level: 'Regional' },
  { name: 'Catalonia Summer League', organizer: 'Federació Catalana', date: '2026-06-01', type: 'League', level: 'Regional' },
  { name: 'Youth Championships 2026', organizer: 'Andalucía Padel', date: '2026-07-10', type: 'Championship', level: 'National' },
];

export default function FederationDashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 text-white py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-purple-600 rounded-xl flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="text-purple-400 text-xs font-semibold uppercase tracking-wide mb-1">Federation Dashboard</div>
                <h1 className="text-2xl font-bold">Real Federación Española de Pádel</h1>
                <p className="text-slate-400">Spain · National Governing Body · Season 2026</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
                <Award className="w-4 h-4" /> Certify Club
              </button>
              <button className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors">
                <Plus className="w-4 h-4" /> Sanction Tournament
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {fedStats.map((stat) => (
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
            {/* National Rankings */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">National Rankings — Open Men</h2>
                <div className="flex gap-2">
                  <Link href="/rankings" className="text-purple-600 text-sm font-medium hover:text-purple-700">
                    View all rankings →
                  </Link>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-6 py-3 text-slate-500 font-medium">#</th>
                      <th className="text-left px-4 py-3 text-slate-500 font-medium">Player</th>
                      <th className="text-left px-4 py-3 text-slate-500 font-medium">Club</th>
                      <th className="text-center px-4 py-3 text-slate-500 font-medium">Points</th>
                      <th className="text-center px-4 py-3 text-slate-500 font-medium">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {nationalRankings.map((row) => (
                      <tr key={row.pos} className={row.pos <= 3 ? 'bg-purple-50/30' : ''}>
                        <td className="px-6 py-3">
                          <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold ${
                            row.pos === 1 ? 'bg-amber-400 text-white' :
                            row.pos === 2 ? 'bg-slate-300 text-white' :
                            row.pos === 3 ? 'bg-orange-400 text-white' : 'text-slate-500'
                          }`}>
                            {row.pos}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{row.player}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{row.club}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-900">{row.points.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-bold flex items-center justify-center gap-0.5 ${
                            row.trend.startsWith('+') ? 'text-green-600' :
                            row.trend === '0' ? 'text-slate-400' : 'text-red-500'
                          }`}>
                            <TrendingUp className="w-3 h-3" />
                            {row.trend}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pending Approvals */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Pending Approvals</h2>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">{pendingApprovals.length} pending</span>
              </div>
              <div className="divide-y divide-slate-50">
                {pendingApprovals.map((item, i) => (
                  <div key={i} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        item.type === 'Tournament' ? 'bg-amber-50' :
                        item.type === 'League' ? 'bg-blue-50' : 'bg-purple-50'
                      }`}>
                        <Trophy className={`w-5 h-5 ${
                          item.type === 'Tournament' ? 'text-amber-500' :
                          item.type === 'League' ? 'text-blue-500' : 'text-purple-500'
                        }`} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.organizer} · {item.date} · {item.level}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{item.type}</span>
                      <button className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-green-400 transition-colors">
                        Approve
                      </button>
                      <button className="text-xs bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-semibold hover:bg-red-200 transition-colors">
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Categories Overview */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">Categories</h3>
                <button className="text-purple-600 text-sm font-medium">+ Add</button>
              </div>
              <div className="space-y-3">
                {categories.map((cat, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{cat.name}</p>
                      <p className="text-xs text-slate-400">{cat.players.toLocaleString()} players · {cat.tournaments} tournaments</p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                      {cat.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h3 className="font-bold text-slate-900 mb-4">Federation Actions</h3>
              <div className="space-y-2">
                {[
                  { label: 'Update National Rankings', icon: <BarChart3 className="w-4 h-4" />, color: 'text-purple-600 hover:bg-purple-50' },
                  { label: 'Sanction New Tournament', icon: <Trophy className="w-4 h-4" />, color: 'text-amber-600 hover:bg-amber-50' },
                  { label: 'Certify Club', icon: <Shield className="w-4 h-4" />, color: 'text-blue-600 hover:bg-blue-50' },
                  { label: 'Issue Player License', icon: <Award className="w-4 h-4" />, color: 'text-green-600 hover:bg-green-50' },
                  { label: 'Generate Reports', icon: <Star className="w-4 h-4" />, color: 'text-slate-600 hover:bg-slate-50' },
                ].map((action) => (
                  <button key={action.label} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${action.color}`}>
                    {action.icon}
                    {action.label}
                    <ChevronRight className="w-4 h-4 ml-auto opacity-40" />
                  </button>
                ))}
              </div>
            </div>

            {/* Season Overview */}
            <div className="bg-purple-600 text-white rounded-2xl p-6">
              <Globe className="w-8 h-8 mb-3" />
              <h3 className="font-bold text-lg mb-2">Season 2026 Progress</h3>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm text-purple-200">
                  <span>Season completion</span>
                  <span>55%</span>
                </div>
                <div className="w-full bg-purple-800 rounded-full h-2">
                  <div className="bg-white h-2 rounded-full" style={{ width: '55%' }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-purple-700 rounded-lg p-3 text-center">
                  <div className="font-bold text-lg">342</div>
                  <div className="text-purple-300 text-xs">Tournaments</div>
                </div>
                <div className="bg-purple-700 rounded-lg p-3 text-center">
                  <div className="font-bold text-lg">24.8K</div>
                  <div className="text-purple-300 text-xs">Players</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
