import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Users, Clock, CheckCircle, ChevronRight, Trophy } from 'lucide-react';
import { tournamentFormats, ongoingTournaments } from '@/lib/data';

interface Props {
  params: Promise<{ format: string }>;
}

export async function generateStaticParams() {
  return tournamentFormats.map((f) => ({ format: f.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { format: slug } = await params;
  const fmt = tournamentFormats.find((f) => f.slug === slug);
  return { title: `${fmt?.name ?? 'Format'} – PadelMGT` };
}

export default async function FormatDetailPage({ params }: Props) {
  const { format: slug } = await params;
  const fmt = tournamentFormats.find((f) => f.slug === slug);
  if (!fmt) notFound();

  const related = ongoingTournaments.filter((t) => t.formatSlug === slug).slice(0, 3);
  const otherFormats = tournamentFormats.filter((f) => f.slug !== slug).slice(0, 3);

  return (
    <div>
      {/* Hero */}
      <section className="bg-slate-900 text-white py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <nav className="text-slate-400 text-sm mb-6">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/tournaments" className="hover:text-white">Tournaments</Link>
            <span className="mx-2">/</span>
            <span className="text-white">{fmt.name}</span>
          </nav>
          <div className="flex items-start gap-6">
            <div className="text-6xl">{fmt.icon}</div>
            <div>
              <div className="text-green-400 font-semibold text-sm mb-2 uppercase tracking-wide">{fmt.type} Format</div>
              <h1 className="text-4xl md:text-5xl font-bold mb-3">Padel {fmt.name}</h1>
              <p className="text-slate-300 text-lg max-w-2xl">{fmt.description}</p>
              <div className="flex flex-wrap gap-4 mt-6">
                <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-4 py-2 text-sm">
                  <Users className="w-4 h-4 text-green-400" />
                  <span>{fmt.minPlayers}–{fmt.maxPlayers} players</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-4 py-2 text-sm">
                  <Clock className="w-4 h-4 text-green-400" />
                  <span>{fmt.duration}</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-4 py-2 text-sm">
                  <Trophy className="w-4 h-4 text-green-400" />
                  <span>{fmt.difficulty}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-10">
            {/* How it Works */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">How it Works</h2>
              <ol className="space-y-4">
                {fmt.rules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                      {i + 1}
                    </div>
                    <p className="text-slate-700 pt-1">{rule}</p>
                  </li>
                ))}
              </ol>
            </div>

            {/* Pros */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Why Choose {fmt.name}?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fmt.pros.map((pro, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <p className="text-slate-700 text-sm">{pro}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Ideal For */}
            <div className="bg-green-50 border border-green-200 rounded-2xl p-8">
              <h2 className="text-xl font-bold text-green-900 mb-3">Ideal For</h2>
              <p className="text-green-800">{fmt.idealFor}</p>
            </div>

            {/* Related Tournaments */}
            {related.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Active {fmt.name} Tournaments</h2>
                <div className="space-y-4">
                  {related.map((t) => (
                    <Link
                      key={t.id}
                      href={`/tournaments/detail/${t.id}`}
                      className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-5 card-hover"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            t.status === 'ongoing' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {t.status === 'ongoing' ? '● LIVE' : 'UPCOMING'}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900">{t.name}</h3>
                        <p className="text-sm text-slate-500">{t.club} · {t.city}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">{t.players}/{t.maxPlayers}</div>
                        <div className="text-xs text-slate-400">players</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* CTA */}
            <div className="bg-slate-900 text-white rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-2">Run a {fmt.name}?</h3>
              <p className="text-slate-400 text-sm mb-5">Create a tournament in minutes. Free for up to 12 players.</p>
              <Link
                href="/signup"
                className="block w-full text-center bg-green-500 hover:bg-green-400 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
              >
                Create Tournament
              </Link>
              <Link
                href="/tournaments"
                className="block w-full text-center mt-3 text-slate-400 hover:text-white text-sm transition-colors"
              >
                Browse all tournaments →
              </Link>
            </div>

            {/* Quick Stats */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h3 className="font-bold text-slate-900 mb-4">Format Summary</h3>
              <div className="space-y-3 text-sm">
                {[
                  { label: 'Players', value: `${fmt.minPlayers}–${fmt.maxPlayers}` },
                  { label: 'Duration', value: fmt.duration },
                  { label: 'Level', value: fmt.difficulty },
                  { label: 'Type', value: fmt.type },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-slate-500">{item.label}</span>
                    <span className="font-semibold text-slate-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Other Formats */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h3 className="font-bold text-slate-900 mb-4">Other Formats</h3>
              <div className="space-y-3">
                {otherFormats.map((f) => (
                  <Link
                    key={f.slug}
                    href={`/tournaments/${f.slug}`}
                    className="flex items-center gap-3 hover:bg-slate-50 rounded-lg p-2 -mx-2 transition-colors"
                  >
                    <span className="text-2xl">{f.icon}</span>
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">{f.name}</div>
                      <div className="text-xs text-slate-400">{f.difficulty}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
                  </Link>
                ))}
                <Link href="/tournaments" className="block text-center text-green-600 hover:text-green-700 text-sm font-semibold pt-2">
                  View all formats →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
