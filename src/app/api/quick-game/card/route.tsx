import { NextRequest } from 'next/server';
import { ImageResponse } from 'next/og';
import { serviceClient } from '@/lib/supabase-server';
import { generateFixedPairsRounds } from '@/lib/game-engine';
import type { ActiveGame, GameRound, ScoreConfig } from '@/lib/game-engine';

// Public, unauthenticated schedule-card image for a Juego Rápido — the
// downloadable/shareable "Cronograma Completo" as a portrait PNG, meant for
// WhatsApp groups and email embeds. Reads the game straight from Supabase
// (quick_games.data jsonb) rather than trusting a client-supplied payload,
// same trust model as the other public share pages (/l/[code], /t/[code]).

const BLACK = '#111111';
const TURF = '#1eaa52';
const COURT_BLUE = '#1a4ed8';
const GREY_400 = '#9ca3af';
const GREY_100 = '#f3f4f6';

const DEUCE_LABEL: Record<string, string> = {
  oro: 'Punto de oro en 40-40',
  ventaja: 'Ventaja en 40-40',
  plata: 'Punto de plata en 40-40',
  ipf: 'Regla IPF en 40-40',
};

const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado', all: 'Todos los niveles',
};

function ruleTexts(sc: ScoreConfig): string[] {
  const rules: string[] = [];
  if (sc.roundLengthMode === 'fixed_time' && sc.fixedMinutes) {
    rules.push(`${sc.fixedMinutes} min por ronda`);
  } else if (sc.type === 'traditional') {
    rules.push(`Set a ${sc.gamesPerSet ?? 6} games`);
  } else {
    rules.push(`${sc.target ?? 24} puntos`);
  }
  if (sc.type === 'traditional') {
    rules.push(DEUCE_LABEL[sc.deuce ?? 'oro'] ?? DEUCE_LABEL.oro);
    if (sc.tiebreak) rules.push(`Empate: súper tie-break a ${sc.tiebreak}`);
  }
  rules.push('Mismo formato en todas las canchas');
  return rules;
}

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(n => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const total = h * 60 + m + minutes;
  const wrapped = ((total % 1440) + 1440) % 1440;
  const hh = Math.floor(wrapped / 60).toString().padStart(2, '0');
  const mm = (wrapped % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

export async function GET(request: NextRequest) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return new Response('Missing id', { status: 400 });

  const svc = serviceClient();
  if (!svc) return new Response('Service unavailable', { status: 503 });

  const { data: row } = await svc.from('quick_games').select('data').eq('id', id).maybeSingle();
  const game = (row as { data?: ActiveGame } | null)?.data;
  if (!game || game.pairType !== 'parejas') return new Response('Not found', { status: 404 });

  let rounds: GameRound[] = game.rounds ?? [];
  if (rounds.length === 0 && game.fixedPairs && game.fixedPairs.length > 0) {
    const orderedPlayers = game.fixedPairs.flatMap(pa =>
      [game.players.find(p => p.id === pa.player1Id), game.players.find(p => p.id === pa.player2Id)].filter((p): p is NonNullable<typeof p> => !!p)
    );
    rounds = generateFixedPairsRounds(orderedPlayers, game.courts, game.maxRoundsPerTeam);
  }
  if (rounds.length === 0) return new Response('Schedule not ready', { status: 404 });

  const nameById = new Map(game.players.map(p => [p.id, p.name] as const));
  const pairLabel = (ids: string[]) => ids.map(pid => (nameById.get(pid) ?? '?').split(' ')[0]).join(' / ');

  let leagueName: string | null = null;
  let leagueLogoUrl: string | null = null;
  if (game.leagueId) {
    const { data: league } = await svc.from('player_leagues').select('name, logo_url').eq('id', game.leagueId).maybeSingle();
    if (league) {
      leagueName = (league as { name?: string }).name ?? null;
      leagueLogoUrl = (league as { logo_url?: string }).logo_url ?? null;
    }
  }

  const isFixedTime = game.scoreConfig.roundLengthMode === 'fixed_time' && !!game.scoreConfig.fixedMinutes;
  const roundMinutes = game.scoreConfig.fixedMinutes ?? 0;
  const dateLabel = game.date
    ? new Date(`${game.date}T00:00:00`).toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()
    : '';
  const timeLabel = isFixedTime && game.time
    ? `${game.time} – ${addMinutes(game.time, roundMinutes * rounds.length)}`
    : game.time ? `Desde las ${game.time}` : '';
  const rules = ruleTexts(game.scoreConfig);

  // Dynamic height so the card fits any number of rounds/courts.
  const HEADER_H = 300;
  const FOOTER_H = 140 + Math.ceil(rules.length / 2) * 30;
  const roundsHeight = rounds.reduce((sum, r) => sum + 54 + r.courts.length * 58 + 14, 0);
  const height = HEADER_H + roundsHeight + FOOTER_H + 40;
  const width = 1080;

  return new ImageResponse(
    (
      <div style={{ width, height, display: 'flex', flexDirection: 'column', background: '#faf7f0', fontFamily: 'sans-serif' }}>
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '40px 48px 28px', borderBottom: `3px solid ${BLACK}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {leagueLogoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={leagueLogoUrl} width={56} height={56} style={{ borderRadius: 28, objectFit: 'cover' }} alt="" />
              )}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 26, fontWeight: 800, textTransform: 'uppercase', letterSpacing: -0.5, color: BLACK }}>
                  {leagueName ?? game.name}
                </div>
                {leagueName && <div style={{ fontSize: 15, color: GREY_400, marginTop: 2 }}>{game.club}</div>}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              {dateLabel && <div style={{ fontSize: 15, fontWeight: 700, color: BLACK }}>{dateLabel}</div>}
              {timeLabel && <div style={{ fontSize: 14, color: GREY_400, marginTop: 4 }}>{timeLabel}</div>}
              {game.levelLabel && <div style={{ fontSize: 12, color: TURF, fontWeight: 700, marginTop: 6, textTransform: 'uppercase' }}>{LEVEL_LABEL[game.levelLabel] ?? game.levelLabel}</div>}
            </div>
          </div>
          <div style={{ fontSize: 13, color: GREY_400 }}>{[game.club, game.city].filter(Boolean).join(' · ')}</div>
        </div>

        {/* Rounds */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 48px 0' }}>
          {rounds.map(round => (
            <div key={round.num} style={{ display: 'flex', flexDirection: 'column', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 17, background: BLACK, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800 }}>
                  {round.num}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: GREY_400, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Ronda {round.num}
                  {isFixedTime && ` · ${addMinutes(game.time ?? '00:00', (round.num - 1) * roundMinutes)} - ${addMinutes(game.time ?? '00:00', round.num * roundMinutes)}`}
                </div>
              </div>
              {round.courts.map(court => (
                <div key={court.courtNum} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: GREY_100, marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: COURT_BLUE, textTransform: 'uppercase', width: 92 }}>Cancha {court.courtNum}</div>
                  <div style={{ flex: 1, fontSize: 16, fontWeight: 700, color: BLACK }}>{pairLabel(court.pair1)}</div>
                  <div style={{ fontSize: 12, color: GREY_400, fontWeight: 700 }}>VS</div>
                  <div style={{ flex: 1, fontSize: 16, fontWeight: 700, color: BLACK, textAlign: 'right' }}>{pairLabel(court.pair2)}</div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Footer: format rules */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto', padding: '24px 48px 36px', borderTop: `3px solid ${BLACK}` }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: GREY_400, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Formato de juego</div>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {rules.map((r, i) => (
              <div key={i} style={{ display: 'flex', width: '50%', fontSize: 14, color: BLACK, fontWeight: 600, marginBottom: 12, paddingRight: 12 }}>
                • {r}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { width, height },
  );
}
