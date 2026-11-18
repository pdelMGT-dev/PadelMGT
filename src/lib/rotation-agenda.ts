// rotation-agenda.ts — helpers for rotation americano nights: roster parsing
// (pasted from Excel/WhatsApp), round start times, and per-player agendas.

import type { ActiveGame, GameRound } from './game-engine';

/** Lowercase, accent-free, single-spaced — for matching names and categories. */
export function normalizeName(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** "18:00" + n rounds of fixedMinutes → "18:45". Null unless the game is time-boxed. */
export function roundStartTime(game: ActiveGame, roundNum: number): string | null {
  const sc = game.scoreConfig;
  if (sc.roundLengthMode !== 'fixed_time' || !sc.fixedMinutes || !game.time) return null;
  const [h, m] = game.time.split(':').map(n => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const total = h * 60 + m + (roundNum - 1) * sc.fixedMinutes;
  const hh = Math.floor(((total % 1440) + 1440) % 1440 / 60);
  const mm = ((total % 60) + 60) % 60;
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, '0')}`;
}

export interface AgendaItem {
  round: number;
  time: string | null;
  court: number;
  category?: string;
  partnerId: string;
  rivalIds: string[];
}

export function buildAgenda(game: ActiveGame, rounds: GameRound[], playerId: string): AgendaItem[] {
  const items: AgendaItem[] = [];
  for (const r of rounds) {
    for (const c of r.courts) {
      const mine = c.pair1.includes(playerId) ? c.pair1 : c.pair2.includes(playerId) ? c.pair2 : null;
      if (!mine) continue;
      items.push({
        round: r.num,
        time: roundStartTime(game, r.num),
        court: c.courtNum,
        category: c.category,
        partnerId: mine.find(id => id !== playerId) ?? '',
        rivalIds: mine === c.pair1 ? c.pair2 : c.pair1,
      });
    }
  }
  return items;
}

function formatDate(date: string): string {
  if (!date) return '';
  const d = new Date(`${date}T00:00:00`);
  return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** WhatsApp-ready text of one player's agenda. */
export function agendaText(game: ActiveGame, rounds: GameRound[], playerId: string, nameOf: (id: string) => string): string {
  const items = buildAgenda(game, rounds, playerId);
  const head = `🎾 *${game.name}*${game.date ? ` — ${formatDate(game.date)}` : ''}${game.club ? ` · ${game.club}` : ''}`;
  if (items.length === 0) return `${head}\n*${nameOf(playerId)}*: sin partidos asignados.`;
  const lines = items.map(it =>
    `• R${it.round}${it.time ? ` ${it.time}` : ''} · Cancha ${it.court} · con ${nameOf(it.partnerId)} vs ${it.rivalIds.map(nameOf).join(' / ')}`,
  );
  return `${head}\n*${nameOf(playerId)}* (${items.length} juego${items.length !== 1 ? 's' : ''}):\n${lines.join('\n')}`;
}

// ── Roster parsing ───────────────────────────────────────────────────────────

export interface RosterRow {
  name: string;
  category?: string;   // matched against the game's categories
  quota?: number;      // games to play; undefined = automatic
  skip?: boolean;      // "No juega"
}

const STATUS_WORDS = new Set(['juega', 'pendiente', 'confirmada', 'confirmado', 'activa', 'activo']);

/**
 * One player per line. Columns can be separated by tabs (pasted from Excel),
 * commas, semicolons or "|". Each token is recognised by what it is, not by
 * position: a category name, a game count (number, "Mucho", "Poco"),
 * "No juega", or part of the name. A leading number is treated as an ID.
 *   "Ana Olivares, Tercera, 5"   "Lexy	Collado	Cuarta	Poco"
 *   "1 | Lexy | Collado | Cuarta | Poco | Juega | 2"
 */
export function parseRoster(text: string, categories: string[], mucho: number, poco: number): RosterRow[] {
  const catByNorm = new Map(categories.map(c => [normalizeName(c), c]));
  const rows: RosterRow[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const tokens = line.split(/\t|,|;|\|/).map(t => t.trim()).filter(Boolean);
    let category: string | undefined;
    let pref: number | undefined;
    let skip = false;
    const numbers: Array<{ value: number; index: number }> = [];
    const nameParts: string[] = [];
    let nameDone = false; // free text after the data columns is a note, not the name
    tokens.forEach((tok, index) => {
      const norm = normalizeName(tok);
      const seen = () => { if (nameParts.length > 0) nameDone = true; };
      if (/^\d+$/.test(norm)) { numbers.push({ value: parseInt(norm, 10), index }); seen(); return; }
      if (catByNorm.has(norm)) { category = catByNorm.get(norm); seen(); return; }
      if (norm === 'mucho') { pref = mucho; seen(); return; }
      if (norm === 'poco') { pref = poco; seen(); return; }
      if (norm === 'no juega' || norm === 'no') { skip = true; seen(); return; }
      if (STATUS_WORDS.has(norm)) { seen(); return; }
      if (!nameDone) nameParts.push(tok);
    });
    // A number in the first column is an ID; otherwise the last number is the game count.
    const counts = numbers.filter(n => !(n.index === 0 && tokens.length > 1));
    const quota = counts.length > 0 ? counts[counts.length - 1].value : pref;
    const name = nameParts.join(' ').replace(/\s+/g, ' ').trim();
    if (!name) continue;
    rows.push({ name, category, quota, ...(skip || quota === 0 ? { skip: true } : {}) });
  }
  return rows;
}
