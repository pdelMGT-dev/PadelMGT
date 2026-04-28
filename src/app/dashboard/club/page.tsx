import Link from 'next/link';
import { Trophy, Users, Calendar, TrendingUp, Plus, Upload, Settings, ChevronRight, Building2, Star } from 'lucide-react';

const clubStats = [
  { label: 'Active Members', value: '450', icon: <Users className="w-5 h-5 text-blue-500" />, change: '+12 this month' },
  { label: 'Courts', value: '8', icon: <Building2 className="w-5 h-5 text-green-500" />, change: '6 available now' },
  { label: 'Tournaments This Month', value: '4', icon: <Trophy className="w-5 h-5 text-amber-500" />, change: '+1 vs last month' },
  { label: 'Club Rating', value: '4.8', icon: <Star className="w-5 h-5 text-purple-500" />, change: '↑ 0.1 this month' },
];

const recentTournaments = [
  { name: 'Madrid Spring Americano', date: '2026-04-28', format: 'Americano', players: '12/12', status: 'ongoing' },
  { name: 'Club Night Mexicano', date: '2026-04-21', format: 'Mexicano', players: '16/16', status: 'completed' },
  { name: 'Easter Knockout Cup', date: '2026-04-14', format: 'Knockout', players: '8/8', status: 'completed' },
];

const recentMembers = [
  { name: 'Carlos García', joined: '2026-04-20', level: 'Intermediate', status: 'active' },
  { name: 'Ana Martínez', joined: '2026-04-18', level: 'Advanced', status: 'active' },
  { name: 'Luis Rodríguez', joined: '2026-04-15', level: 'Beginner', status: 'pending' },
  { name: 'María López', joined: '2026-04-10', level: 'Intermediate', status: 'active' },
];

const staff = [
  { name: 'Club Admin', role: 'Owner', email: 'admin@club.com', permissions: 'Full access' },
  { name: 'Tournament Manager', role: 'Staff', email: 'tm@club.com', permissions: 'Tournaments only' },
  { name: 'Events Coordinator', role: 'Staff', email: 'events@club.com', permissions: 'Events & Promotions' },
];

export default function ClubDashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 text-white py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="text-blue-400 text-xs font-semibold uppercase tracking-wide mb-1">Club Manager Dashboard</div>
                <h1 className="text-2xl font-bold">Padel Madrid Central</h1>
                <p className="text-slate-400">Madrid, Spain · 8 Courts · 450 Members</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
                <Upload className="w-4 h-4" /> Import Players
              </button>
              <Link
                href="/tournaments/new"
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" /> New Tournament
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {clubStats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-500">{stat.label}</span>
                {stat.icon}
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-1">{stat.value}</div>
              <div className="text-xs text-slate-400">{stat.change}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Create Tournament', icon: <Trophy className="w-5 h-5" />, color: 'bg-amber-50 text-amber-600 hover:bg-amber-100' },
                  { label: 'Add Member', icon: <Users className="w-5 h-5" />, color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
                  { label: 'Import Players', icon: <Upload className="w-5 h-5" />, color: 'bg-green-50 text-green-600 hover:bg-green-100' },
                  { label: 'Club Settings', icon: <Settings className="w-5 h-5" />, color: 'bg-slate-100 text-slate-600 hover:bg-slate-200' },
                ].map((action) => (
                  <button key={action.label} className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-colors ${action.color}`}>
                    {action.icon}
                    <span className="text-xs font-medium text-center">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tournaments */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Club Tournaments</h2>
                <button className="flex items-center gap-1 text-blue-600 text-sm font-medium hover:text-blue-700">
                  <Plus className="w-4 h-4" /> New
                </button>
              </div>
              <div className="divide-y divide-slate-50">
                {recentTournaments.map((t, i) => (
                  <div key={i} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center">
                        <Trophy className="w-4 h-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{t.name}</p>
                        <p className="text-xs text-slate-500">{t.format} · {t.players} players · {t.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        t.status === 'ongoing' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {t.status === 'ongoing' ? '● LIVE' : 'Done'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Members */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Recent Members</h2>
                <div className="flex gap-2">
                  <button className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm">
                    <Upload className="w-3.5 h-3.5" /> Import CSV
                  </button>
                  <button className="flex items-center gap-1 text-blue-600 text-sm font-medium">
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-6 py-3 text-slate-500 font-medium">Name</th>
                      <th className="text-left px-4 py-3 text-slate-500 font-medium">Level</th>
                      <th className="text-left px-4 py-3 text-slate-500 font-medium">Joined</th>
                      <th className="text-left px-4 py-3 text-slate-500 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentMembers.map((m, i) => (
                      <tr key={i}>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600">
                              {m.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span className="font-medium text-slate-800">{m.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{m.level}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{m.joined}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            m.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {m.status}
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
            {/* Court Availability */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h3 className="font-bold text-slate-900 mb-4">Court Availability</h3>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((court) => {
                  const status = court <= 2 ? 'occupied' : court <= 4 ? 'reserved' : 'available';
                  return (
                    <div key={court} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-slate-700">Court {court}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        status === 'available' ? 'bg-green-100 text-green-700' :
                        status === 'reserved' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Staff Management */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">Staff</h3>
                <button className="text-blue-600 text-sm font-medium">+ Add Staff</button>
              </div>
              <div className="space-y-3">
                {staff.map((s, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                      {s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.permissions}</p>
                    </div>
                    <span className={`text-xs shrink-0 px-2 py-0.5 rounded-full ${
                      s.role === 'Owner' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {s.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Import Players Banner */}
            <div className="bg-blue-600 text-white rounded-2xl p-6">
              <Upload className="w-8 h-8 mb-3" />
              <h3 className="font-bold text-lg mb-2">Import Player Data</h3>
              <p className="text-blue-100 text-sm mb-4">Upload a CSV with player details. The system will automatically contact them to join the platform.</p>
              <button className="w-full bg-white text-blue-700 px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-50 transition-colors">
                Upload CSV File
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
