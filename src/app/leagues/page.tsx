'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Search, MapPin, Users, Calendar, ChevronRight, Trophy } from 'lucide-react';
import { leagues, countries, cities } from '@/lib/data';

export default function LeaguesPage() {
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('All Countries');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedStatus, setSelectedStatus] = useState('All');

  const availableCities = cities[selectedCountry] || ['All Cities'];

  const filtered = leagues.filter((l) => {
    const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.organizer.toLowerCase().includes(search.toLowerCase());
    const matchCountry = selectedCountry === 'All Countries' || l.country === selectedCountry;
    const matchCity = selectedCity === 'All Cities' || l.city === selectedCity;
    const matchStatus = selectedStatus === 'All' || l.status === selectedStatus.toLowerCase();
    return matchSearch && matchCountry && matchCity && matchStatus;
  });

  return (
    <div>
      {/* Hero */}
      <section className="bg-slate-900 text-white py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <nav className="text-slate-400 text-sm mb-4">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-white">Leagues</span>
          </nav>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Padel Leagues</h1>
          <p className="text-slate-400 text-lg max-w-2xl">
            Find and join leagues in your area. Multi-week competitions run by clubs, organizations, and federations worldwide.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Search & Filters */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search leagues..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Country */}
            <select
              value={selectedCountry}
              onChange={(e) => { setSelectedCountry(e.target.value); setSelectedCity('All Cities'); }}
              className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {countries.map((c) => <option key={c}>{c}</option>)}
            </select>

            {/* City */}
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {availableCities.map((c) => <option key={c}>{c}</option>)}
            </select>

            {/* Status */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {['All', 'Active', 'Upcoming', 'Completed'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <p className="text-sm text-slate-500 mt-3">{filtered.length} league{filtered.length !== 1 ? 's' : ''} found</p>
        </div>

        {/* League Cards */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">No leagues found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((league) => (
              <div key={league.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden card-hover">
                <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      league.status === 'active'
                        ? 'bg-green-500 text-white'
                        : league.status === 'upcoming'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-600 text-slate-300'
                    }`}>
                      {league.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded-full">{league.category}</span>
                  </div>
                  <h3 className="text-white font-bold text-xl">{league.name}</h3>
                  <p className="text-slate-400 text-sm mt-1">{league.organizer}</p>
                </div>
                <div className="p-6">
                  <p className="text-slate-600 text-sm mb-5">{league.description}</p>
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      {league.city}, {league.country}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Users className="w-4 h-4 text-slate-400" />
                      {league.teams} teams · {league.players} players
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {league.startDate}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Trophy className="w-4 h-4 text-slate-400" />
                      {league.level}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full">Season {league.season}</span>
                    <Link
                      href={`/leagues/${league.id}`}
                      className="flex items-center gap-1 text-green-600 hover:text-green-700 font-semibold text-sm"
                    >
                      View League <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Organizer CTA */}
      <section className="py-12 px-4 bg-slate-900 text-white mt-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-bold mb-1">Running a league?</h3>
            <p className="text-slate-400">Create and manage multi-week competitions with full scheduling, standings, and player management.</p>
          </div>
          <Link
            href="/signup?role=league_organizer"
            className="shrink-0 bg-green-500 hover:bg-green-400 text-white px-8 py-3 rounded-xl font-bold transition-colors"
          >
            Create a League
          </Link>
        </div>
      </section>
    </div>
  );
}
