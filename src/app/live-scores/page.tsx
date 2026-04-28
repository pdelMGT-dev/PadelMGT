'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Activity, RefreshCw } from 'lucide-react';

const initialMatches = [
  {
    id: '1',
    tournament: 'Madrid Spring Americano',
    court: 'Court 1',
    team1: { players: ['Carlos G.', 'Ana M.'], score: 16 },
    team2: { players: ['Luis R.', 'Sara P.'], score: 12 },
    status: 'completed',
    round: 'Round 3',
  },
  {
    id: '2',
    tournament: 'Madrid Spring Americano',
    court: 'Court 2',
    team1: { players: ['Pedro J.', 'Maria L.'], score: 9 },
    team2: { players: ['Juan C.', 'Elena V.'], score: 7 },
    status: 'live',
    round: 'Round 3',
  },
  {
    id: '3',
    tournament: 'Barcelona Mexicano Cup',
    court: 'Court A',
    team1: { players: ['Sergio B.', 'Laura H.'], score: 5 },
    team2: { players: ['Miguel O.', 'Carmen D.'], score: 8 },
    status: 'live',
    round: 'Round 2',
  },
  {
    id: '4',
    tournament: 'London Padel League',
    court: 'Court 1',
    team1: { players: ['James W.', 'Sophie T.'], score: 6 },
    team2: { players: ['Oliver M.', 'Emma R.'], score: 6 },
    status: 'live',
    round: 'Match Day 5',
  },
  {
    id: '5',
    tournament: 'Madrid Spring Americano',
    court: 'Court 1',
    team1: { players: ['Diego F.', 'Isabel B.'], score: 0 },
    team2: { players: ['Marcos H.', 'Lucia T.'], score: 0 },
    status: 'upcoming',
    round: 'Round 4',
  },
  {
    id: '6',
    tournament: 'Barcelona Mexicano Cup',
    court: 'Court B',
    team1: { players: ['Raul P.', 'Nuria G.'], score: 0 },
    team2: { players: ['Alvaro S.', 'Marta F.'], score: 0 },
    status: 'upcoming',
    round: 'Round 3',
  },
];

export default function LiveScoresPage() {
  const [matches, setMatches] = useState(initialMatches);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    const interval = setInterval(() => {
      setMatches((prev) =>
        prev.map((m) => {
          if (m.status !== 'live') return m;
          const delta1 = Math.random() > 0.6 ? 1 : 0;
          const delta2 = Math.random() > 0.6 ? 1 : 0;
          return {
            ...m,
            team1: { ...m.team1, score: Math.min(m.team1.score + delta1, 24) },
            team2: { ...m.team2, score: Math.min(m.team2.score + delta2, 24) },
          };
        })
      );
      setLastUpdated(new Date());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filter === 'All' ? matches : matches.filter((m) => m.status === filter.toLowerCase());

  const liveCount = matches.filter((m) => m.status === 'live').length;

  return (
    <div>
      {/* Hero */}
      <section className="bg-slate-900 text-white py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <nav className="text-slate-400 text-sm mb-4">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-white">Live Scores</span>
          </nav>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Live Scores</h1>
              <p className="text-slate-400">
                {liveCount} match{liveCount !== 1 ? 'es' : ''} live now · Updates every 3 seconds
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex gap-2">
            {['All', 'Live', 'Upcoming', 'Completed'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === tab
                    ? tab === 'Live' ? 'bg-green-500 text-white' : 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab === 'Live' && <span className="mr-1.5">●</span>}
                {tab}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <RefreshCw className="w-4 h-4" />
            Updated {lastUpdated.toLocaleTimeString()}
          </div>
        </div>

        {/* Match Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((match) => (
            <div
              key={match.id}
              className={`bg-white rounded-2xl border overflow-hidden ${
                match.status === 'live' ? 'border-green-300 shadow-md shadow-green-50' : 'border-slate-200'
              }`}
            >
              {/* Match Header */}
              <div className={`px-5 py-3 flex items-center justify-between ${
                match.status === 'live'
                  ? 'bg-green-500 text-white'
                  : match.status === 'upcoming'
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                <div className="flex items-center gap-2 text-sm font-medium">
                  {match.status === 'live' && <span className="w-2 h-2 bg-white rounded-full animate-pulse" />}
                  <span>{match.status === 'live' ? 'LIVE' : match.status === 'upcoming' ? 'UPCOMING' : 'COMPLETED'}</span>
                </div>
                <div className="text-xs opacity-80">{match.tournament} · {match.round}</div>
              </div>

              {/* Score */}
              <div className="px-5 py-5">
                <div className="text-xs text-slate-400 font-medium mb-3">{match.court}</div>
                <div className="space-y-3">
                  {[match.team1, match.team2].map((team, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800">{team.players[0]}</p>
                        <p className="text-sm text-slate-500">{team.players[1]}</p>
                      </div>
                      <div className={`text-3xl font-bold w-14 text-right ${
                        match.status !== 'upcoming' && team.score > (i === 0 ? match.team2 : match.team1).score
                          ? 'text-green-600'
                          : 'text-slate-700'
                      }`}>
                        {match.status === 'upcoming' ? '-' : team.score}
                      </div>
                    </div>
                  ))}
                </div>
                {match.status === 'live' && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-green-500 h-1.5 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.round(((match.team1.score + match.team2.score) / 24) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1 text-center">
                      {match.team1.score + match.team2.score} / 24 points played
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">No matches in this category</p>
          </div>
        )}
      </div>
    </div>
  );
}
