'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Search, MapPin, Users, Star, Phone, Mail, ChevronRight, Building2 } from 'lucide-react';
import { clubs, countries, cities } from '@/lib/data';

export default function ClubsPage() {
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('All Countries');
  const [selectedCity, setSelectedCity] = useState('All Cities');

  const availableCities = cities[selectedCountry] || ['All Cities'];

  const filtered = clubs.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase());
    const matchCountry = selectedCountry === 'All Countries' || c.country === selectedCountry;
    const matchCity = selectedCity === 'All Cities' || c.city === selectedCity;
    return matchSearch && matchCountry && matchCity;
  });

  return (
    <div>
      {/* Hero */}
      <section className="bg-slate-900 text-white py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <nav className="text-slate-400 text-sm mb-4">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-white">Clubs</span>
          </nav>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Padel Clubs</h1>
          <p className="text-slate-400 text-lg max-w-2xl">
            Find padel clubs near you. Search by country and city to discover courts, book sessions, and join tournaments.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Search & Filters */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search clubs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <select
              value={selectedCountry}
              onChange={(e) => { setSelectedCountry(e.target.value); setSelectedCity('All Cities'); }}
              className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {countries.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {availableCities.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <p className="text-sm text-slate-500 mt-3">{filtered.length} club{filtered.length !== 1 ? 's' : ''} found</p>
        </div>

        {/* Club Cards */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">No clubs found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((club) => (
              <div key={club.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden card-hover">
                {/* Club color header */}
                <div className="h-28 bg-gradient-to-br from-green-700 to-slate-700 flex items-center justify-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-slate-900 text-lg leading-tight">{club.name}</h3>
                    <div className="flex items-center gap-1 text-amber-500 text-sm font-bold shrink-0 ml-2">
                      <Star className="w-4 h-4 fill-current" />
                      {club.rating}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {club.address}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 text-center text-green-500 font-bold text-xs">◼</span>
                        {club.courts} courts
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {club.members} members
                      </span>
                    </div>
                  </div>

                  {/* Amenities */}
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {club.amenities.slice(0, 4).map((a) => (
                      <span key={a} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{a}</span>
                    ))}
                    {club.amenities.length > 4 && (
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">+{club.amenities.length - 4}</span>
                    )}
                  </div>

                  {/* Contact */}
                  <div className="border-t border-slate-100 pt-4 space-y-2 mb-4">
                    {club.phone && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Phone className="w-3.5 h-3.5 text-green-500" /> {club.phone}
                      </div>
                    )}
                    {club.email && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Mail className="w-3.5 h-3.5 text-green-500" /> {club.email}
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/clubs/${club.id}`}
                    className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                  >
                    View Club <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Register CTA */}
      <section className="py-12 px-4 bg-green-600 text-white mt-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-bold mb-1">Manage a padel club?</h3>
            <p className="text-green-100">Register your club and start managing tournaments, members, and events.</p>
          </div>
          <Link
            href="/signup?role=club_manager"
            className="shrink-0 bg-white text-green-700 px-8 py-3 rounded-xl font-bold hover:bg-green-50 transition-colors"
          >
            Register Your Club
          </Link>
        </div>
      </section>
    </div>
  );
}
