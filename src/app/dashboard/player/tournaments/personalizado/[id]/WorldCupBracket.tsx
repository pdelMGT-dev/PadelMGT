'use client';
import React, { useState, useMemo } from 'react';
import {
  saveBracketResult,
  generateBracket,
  scheduleBracket,
  saveControlPanel,
  type PersonalizadoTournament,
  type BracketMatch,
  type MatchResult,
  type SetScore,
} from '@/lib/personalizado-store';
import { useToast } from '@/components/ToastProvider';

// ── Layout constants ──────────────────────────────────────────────────────────

const CARD_H = 88;
const BASE_GAP = 16;
const CONN_W = 20; // connector arm width in px

// ── Inline ResultForm ─────────────────────────────────────────────────────────

interface ResultFormProps {
  matchId: string;
  teamAId: string;
  teamBId: string;
  result?: MatchResult;
  teamName: (id: string) => string;
  saving: boolean;
  onSave: (matchId: string, result: MatchResult) => void;
  onCancel: () => void;
}

function ResultForm({
  matchId, teamAId, teamBId, result, teamName, saving, onSave, onCancel,
}: ResultFormProps) {
  const initial = result
    ? result.sets.map(s => ({ a: String(s.a), b: String(s.b) }))
    : [{ a: '', b: '' }, { a: '', b: '' }];

  const [sets, setSets] = useState<{ a: string; b: string }[]>(initial);
  const [walkover, setWalkover] = useState<string>(result?.walkover ? result.winnerId : '');

  const setVal = (idx: number, side: 'a' | 'b', val: string) => {
    setSets(prev => {
      const next = [...prev];
      while (next.length <= idx) next.push({ a: '', b: '' });
      next[idx] = { ...next[idx], [side]: val };
      return next;
    });
  };

  const scored2 = sets.slice(0, 2).filter(s => s.a !== '' && s.b !== '');
  let s2A = 0, s2B = 0;
  for (const s of scored2) {
    if (parseInt(s.a) > parseInt(s.b)) s2A++;
    else if (parseInt(s.b) > parseInt(s.a)) s2B++;
  }
  const needsSet3 = scored2.length === 2 && s2A === s2B;
  const hasSet3Val = sets[2]?.a !== '' || sets[2]?.b !== '';
  const showSet3 = needsSet3 || hasSet3Val;

  function computeWinner(): string | null {
    const played = sets.filter(s => s.a !== '' && s.b !== '');
    if (played.length === 0) return null;
    let wA = 0, wB = 0;
    for (const s of played) {
      if (parseInt(s.a) > parseInt(s.b)) wA++;
      else if (parseInt(s.b) > parseInt(s.a)) wB++;
    }
    if (wA > wB) return teamAId;
    if (wB > wA) return teamBId;
    return null;
  }

  const winner = walkover ? walkover : computeWinner();
  const canSave = Boolean(winner);

  function handleSave() {
    if (!canSave) return;
    if (walkover) {
      onSave(matchId, { sets: [], winnerId: walkover, walkover: true });
    } else {
      const parsedSets: SetScore[] = sets
        .filter(s => s.a !== '' && s.b !== '')
        .map(s => ({ a: parseInt(s.a), b: parseInt(s.b) }));
      onSave(matchId, { sets: parsedSets, winnerId: winner!, walkover: false });
    }
  }

  const inputStyle: React.CSSProperties = {
    width: 44, textAlign: 'center', border: '1px solid #e0e0e0',
    padding: '5px 2px', fontSize: 14, fontWeight: 700, outline: 'none',
    background: '#fff', color: '#111',
  };

  const woBtn = (tid: string): React.CSSProperties => ({
    fontSize: 10, padding: '4px 10px', cursor: 'pointer', fontWeight: 700,
    letterSpacing: '0.06em', textTransform: 'uppercase' as const,
    border: `1px solid ${walkover === tid ? '#111' : '#ddd'}`,
    background: walkover === tid ? '#111' : 'transparent',
    color: walkover === tid ? '#d6ff00' : '#888',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #f0f0f0' }}>
      {/* Walkover */}
      <div style={{ marginBottom: 10 }}>
        <div style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: '#999', marginBottom: 5,
        }}>
          Walkover / Retiro
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <button style={woBtn(teamAId)} onClick={() => setWalkover(prev => prev === teamAId ? '' : teamAId)}>
            {teamName(teamAId)} gana W.O.
          </button>
          <button style={woBtn(teamBId)} onClick={() => setWalkover(prev => prev === teamBId ? '' : teamBId)}>
            {teamName(teamBId)} gana W.O.
          </button>
        </div>
      </div>

      {/* Set scores */}
      {!walkover && (
        <div style={{ marginBottom: 10 }}>
          {[0, 1, 2].map(idx => {
            if (idx === 2 && !showSet3) return null;
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <span style={{ fontSize: 10, color: '#999', fontWeight: 600, width: 32, flexShrink: 0 }}>
                  Set {idx + 1}
                </span>
                <input
                  type="number" min="0" max="99" style={inputStyle}
                  value={sets[idx]?.a ?? ''}
                  onChange={e => setVal(idx, 'a', e.target.value)}
                />
                <span style={{ color: '#bbb', fontWeight: 700, fontSize: 14 }}>–</span>
                <input
                  type="number" min="0" max="99" style={inputStyle}
                  value={sets[idx]?.b ?? ''}
                  onChange={e => setVal(idx, 'b', e.target.value)}
                />
                {idx === 2 && (
                  <span style={{ fontSize: 10, color: '#aaa' }}>(3er set)</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {winner && !walkover && (
        <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
          Gana: <strong style={{ color: '#111' }}>{teamName(winner)}</strong>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          disabled={!canSave || saving}
          onClick={handleSave}
          style={{
            fontSize: 11, padding: '6px 14px', border: 'none',
            cursor: canSave && !saving ? 'pointer' : 'not-allowed',
            background: '#111', color: '#d6ff00', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            opacity: canSave && !saving ? 1 : 0.4,
            transition: 'opacity 0.15s',
          }}
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          disabled={saving}
          onClick={onCancel}
          style={{
            fontSize: 11, padding: '6px 14px', border: '1px solid #ddd',
            background: 'transparent', color: '#888', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ── Score display helpers ─────────────────────────────────────────────────────

/** How many sets did teamId win in this result? */
function setsWon(result: MatchResult, teamId: string, teamAId: string): number {
  if (result.walkover) return result.winnerId === teamId ? 1 : 0;
  let w = 0;
  for (const s of result.sets) {
    const aWon = s.a > s.b;
    if ((teamId === teamAId && aWon) || (teamId !== teamAId && !aWon)) w++;
  }
  return w;
}

/** Score label for one side: "2" (sets won), "W.O." if walkover loser, or "–" if not played */
function scoreLabel(
  result: MatchResult | undefined,
  teamId: string,
  teamAId: string,
  isLoser: boolean,
): string {
  if (!result) return '–';
  if (result.walkover) {
    return isLoser ? 'W.O.' : String(setsWon(result, teamId, teamAId));
  }
  return String(setsWon(result, teamId, teamAId));
}

// ── BracketCard ───────────────────────────────────────────────────────────────

interface BracketCardProps {
  match: BracketMatch;
  isFinal?: boolean;
  is3rd?: boolean;
  teamName: (id: string) => string;
  canManage: boolean;
  editingId: string | null;
  savingId: string | null;
  onEdit: (id: string) => void;
  onSave: (matchId: string, result: MatchResult) => void;
  onCancelEdit: () => void;
}

function BracketCard({
  match, isFinal, is3rd, teamName, canManage,
  editingId, savingId, onEdit, onSave, onCancelEdit,
}: BracketCardProps) {
  const res = match.result;
  const isEditing = editingId === match.id;
  const isSaving = savingId === match.id;

  const hasTeamA = Boolean(match.teamAId);
  const hasTeamB = Boolean(match.teamBId);
  const bothTeams = hasTeamA && hasTeamB;

  // Status label (top-left)
  let statusLabel = 'Por jugar';
  let statusColor = '#aaa';
  if (res) {
    statusLabel = res.walkover ? 'W.O.' : 'FT';
    statusColor = '#15803d';
  } else if (match.status === 'playing') {
    statusLabel = 'En juego';
    statusColor = '#d97706';
  } else if (match.status === 'scheduled' && match.time) {
    statusLabel = `${match.time}${match.day ? ' · ' + match.day.slice(5) : ''}`;
    statusColor = '#1d4ed8';
  }

  const aIsWinner = res && res.winnerId === match.teamAId;
  const bIsWinner = res && res.winnerId === match.teamBId;
  const aIsLoser = res && res.winnerId !== match.teamAId;
  const bIsLoser = res && res.winnerId !== match.teamBId;

  const scoreA = res ? scoreLabel(res, match.teamAId!, match.teamAId!, Boolean(aIsLoser)) : '';
  const scoreB = res ? scoreLabel(res, match.teamBId!, match.teamAId!, Boolean(bIsLoser)) : '';

  const canEnterResult = canManage && bothTeams && !res && !isEditing && match.status !== 'pending';
  const canEditResult = canManage && Boolean(res) && !isEditing;

  const cardWidth = isFinal ? 200 : 172;

  return (
    <div style={{
      width: cardWidth,
      background: '#fff',
      border: `1px solid ${isFinal ? '#bbb' : '#e5e5e5'}`,
      boxShadow: isFinal
        ? '0 4px 18px rgba(0,0,0,0.14)'
        : '0 1px 6px rgba(0,0,0,0.07)',
      padding: '10px 12px',
      boxSizing: 'border-box',
      minHeight: CARD_H,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
    }}>
      {/* Top row: status + round label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: statusColor,
        }}>
          {statusLabel}
        </span>
        {(is3rd || isFinal) && (
          <span style={{ fontSize: 8, color: '#bbb', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
            {is3rd ? '3er lugar' : 'Final'}
          </span>
        )}
        {!is3rd && !isFinal && (
          <span style={{ fontSize: 8, color: '#ccc', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {match.roundLabel}
          </span>
        )}
      </div>

      {/* Team A row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '3px 0',
      }}>
        <span style={{
          fontSize: 12,
          fontWeight: aIsWinner ? 700 : 500,
          color: hasTeamA ? (aIsLoser ? '#aaa' : '#111') : '#ccc',
          fontStyle: hasTeamA ? 'normal' : 'italic',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginRight: 4,
        }}>
          {hasTeamA ? teamName(match.teamAId!) : 'Por definir'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {res && (
            <span style={{
              fontSize: 13, fontWeight: 700,
              color: aIsWinner ? '#111' : '#bbb',
              minWidth: 18, textAlign: 'right',
            }}>
              {scoreA}
            </span>
          )}
          {aIsWinner && (
            <span style={{ fontSize: 10, color: '#d6ff00', background: '#111', padding: '1px 3px', lineHeight: 1 }}>
              ◄
            </span>
          )}
        </div>
      </div>

      {/* Separator */}
      <div style={{ borderTop: '1px solid #f3f3f3', margin: '2px 0' }} />

      {/* Team B row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '3px 0',
      }}>
        <span style={{
          fontSize: 12,
          fontWeight: bIsWinner ? 700 : 500,
          color: hasTeamB ? (bIsLoser ? '#aaa' : '#111') : '#ccc',
          fontStyle: hasTeamB ? 'normal' : 'italic',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginRight: 4,
        }}>
          {hasTeamB ? teamName(match.teamBId!) : 'Por definir'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {res && (
            <span style={{
              fontSize: 13, fontWeight: 700,
              color: bIsWinner ? '#111' : '#bbb',
              minWidth: 18, textAlign: 'right',
            }}>
              {scoreB}
            </span>
          )}
          {bIsWinner && (
            <span style={{ fontSize: 10, color: '#d6ff00', background: '#111', padding: '1px 3px', lineHeight: 1 }}>
              ◄
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {!isEditing && (canEnterResult || canEditResult) && (
        <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #f5f5f5' }}>
          <button
            onClick={() => onEdit(match.id)}
            style={{
              fontSize: 10, padding: '3px 8px', cursor: 'pointer', fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              border: '1px solid #ddd', background: '#fafafa', color: '#555',
              width: '100%',
            }}
          >
            {canEditResult ? '✎ Editar' : '＋ Ingresar resultado'}
          </button>
        </div>
      )}

      {/* Inline result form */}
      {isEditing && hasTeamA && hasTeamB && (
        <ResultForm
          matchId={match.id}
          teamAId={match.teamAId!}
          teamBId={match.teamBId!}
          result={res}
          teamName={teamName}
          saving={isSaving}
          onSave={onSave}
          onCancel={onCancelEdit}
        />
      )}
    </div>
  );
}

// ── Connector lines helpers ───────────────────────────────────────────────────

/**
 * Renders a right-side connector for left-column rounds:
 * a vertical line with two horizontal arms reaching out to the right,
 * connecting two cards at round r into one card at round r+1.
 */
function ConnectorRight({ bandHeight }: { bandHeight: number }) {
  // Parent occupies bandHeight * 2, connector is the bridge between the two cards
  return (
    <div style={{
      position: 'relative',
      width: CONN_W,
      height: bandHeight * 2,
      flexShrink: 0,
    }}>
      {/* Top arm */}
      <div style={{
        position: 'absolute',
        top: bandHeight / 2 + CARD_H / 2,
        left: 0,
        width: CONN_W,
        height: bandHeight - CARD_H / 2,
        borderRight: '2px solid #e0e0e0',
        borderTop: '2px solid #e0e0e0',
        boxSizing: 'border-box',
      }} />
      {/* Bottom arm */}
      <div style={{
        position: 'absolute',
        top: bandHeight + CARD_H / 2,
        left: 0,
        width: CONN_W,
        height: bandHeight / 2 - CARD_H / 2 + bandHeight / 2,
        borderRight: '2px solid #e0e0e0',
        borderBottom: '2px solid #e0e0e0',
        boxSizing: 'border-box',
      }} />
    </div>
  );
}

/**
 * Renders a left-side connector for right-column rounds:
 * same pattern but mirrored horizontally.
 */
function ConnectorLeft({ bandHeight }: { bandHeight: number }) {
  return (
    <div style={{
      position: 'relative',
      width: CONN_W,
      height: bandHeight * 2,
      flexShrink: 0,
    }}>
      {/* Top arm */}
      <div style={{
        position: 'absolute',
        top: bandHeight / 2 + CARD_H / 2,
        right: 0,
        left: 0,
        width: CONN_W,
        height: bandHeight - CARD_H / 2,
        borderLeft: '2px solid #e0e0e0',
        borderTop: '2px solid #e0e0e0',
        boxSizing: 'border-box',
      }} />
      {/* Bottom arm */}
      <div style={{
        position: 'absolute',
        top: bandHeight + CARD_H / 2,
        right: 0,
        left: 0,
        width: CONN_W,
        height: bandHeight / 2 - CARD_H / 2 + bandHeight / 2,
        borderLeft: '2px solid #e0e0e0',
        borderBottom: '2px solid #e0e0e0',
        boxSizing: 'border-box',
      }} />
    </div>
  );
}

// ── Band height calculation ───────────────────────────────────────────────────

function bandHeight(round: number): number {
  return Math.pow(2, round) * (CARD_H + BASE_GAP) - (round === 0 ? 0 : BASE_GAP);
}

// ── Column of match cards for one round (left or right side) ──────────────────

interface RoundColumnProps {
  matches: BracketMatch[];
  round: number;
  teamName: (id: string) => string;
  canManage: boolean;
  editingId: string | null;
  savingId: string | null;
  onEdit: (id: string) => void;
  onSave: (matchId: string, result: MatchResult) => void;
  onCancelEdit: () => void;
}

function RoundColumn({
  matches, round, teamName, canManage,
  editingId, savingId, onEdit, onSave, onCancelEdit,
}: RoundColumnProps) {
  const bh = bandHeight(round);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {matches.map(match => (
        <div
          key={match.id}
          style={{
            height: bh,
            display: 'flex',
            alignItems: 'center',
            paddingTop: (bh - CARD_H) / 2,
            paddingBottom: (bh - CARD_H) / 2,
            boxSizing: 'border-box',
          }}
        >
          <BracketCard
            match={match}
            teamName={teamName}
            canManage={canManage}
            editingId={editingId}
            savingId={savingId}
            onEdit={onEdit}
            onSave={onSave}
            onCancelEdit={onCancelEdit}
          />
        </div>
      ))}
    </div>
  );
}

// ── Main WorldCupBracket component ────────────────────────────────────────────

export function WorldCupBracket({
  tournament,
  categoryId,
  bracketMatches,
  teamName,
  canManage,
  onBracketUpdate,
}: {
  tournament: PersonalizadoTournament;
  categoryId: string;
  bracketMatches: BracketMatch[];
  teamName: (id: string) => string;
  canManage: boolean;
  onBracketUpdate: (newMatches: BracketMatch[]) => void;
}) {
  const { showToast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // ── Derived bracket data ────────────────────────────────────────────────────

  const category = useMemo(
    () => tournament.categories.find(c => c.id === categoryId),
    [tournament, categoryId],
  );

  // Separate 3rd-place from normal rounds
  const thirdPlaceMatch = useMemo(
    () => bracketMatches.find(m => m.roundLabel?.includes('3er')),
    [bracketMatches],
  );
  const mainMatches = useMemo(
    () => bracketMatches.filter(m => !m.roundLabel?.includes('3er')),
    [bracketMatches],
  );

  const finalRound = useMemo(
    () => mainMatches.length > 0 ? Math.max(...mainMatches.map(m => m.round)) : 0,
    [mainMatches],
  );
  const finalMatch = useMemo(
    () => mainMatches.find(m => m.round === finalRound),
    [mainMatches, finalRound],
  );

  // Group main matches by round
  const byRound = useMemo(() => {
    const map = new Map<number, BracketMatch[]>();
    for (const m of mainMatches) {
      const arr = map.get(m.round) ?? [];
      arr.push(m);
      map.set(m.round, arr);
    }
    // Sort each round by slotIndex
    for (const [r, arr] of map.entries()) {
      map.set(r, [...arr].sort((a, b) => a.slotIndex - b.slotIndex));
    }
    return map;
  }, [mainMatches]);

  // Split each round into left/right halves (excluding final)
  const leftByRound = useMemo(() => {
    const map = new Map<number, BracketMatch[]>();
    for (let r = 0; r < finalRound; r++) {
      const arr = byRound.get(r) ?? [];
      const half = Math.ceil(arr.length / 2);
      map.set(r, arr.slice(0, half));
    }
    return map;
  }, [byRound, finalRound]);

  const rightByRound = useMemo(() => {
    const map = new Map<number, BracketMatch[]>();
    for (let r = 0; r < finalRound; r++) {
      const arr = byRound.get(r) ?? [];
      const half = Math.ceil(arr.length / 2);
      map.set(r, arr.slice(half));
    }
    return map;
  }, [byRound, finalRound]);

  // Rounds to render on each side (left: 0..finalRound-1, right: same but reversed for display)
  const leftRounds = useMemo(
    () => Array.from({ length: finalRound }, (_, i) => i),
    [finalRound],
  );
  const rightRounds = useMemo(
    () => Array.from({ length: finalRound }, (_, i) => finalRound - 1 - i),
    [finalRound],
  );

  // Podium
  const champion = finalMatch?.result
    ? teamName(finalMatch.result.winnerId)
    : null;
  const runnerUp = finalMatch?.result
    ? teamName(
        finalMatch.result.winnerId === finalMatch.teamAId
          ? (finalMatch.teamBId ?? '')
          : (finalMatch.teamAId ?? ''),
      )
    : null;
  const thirdPlace = thirdPlaceMatch?.result
    ? teamName(thirdPlaceMatch.result.winnerId)
    : null;

  // ── Generate bracket flow ───────────────────────────────────────────────────

  async function handleGenerateBracket() {
    setGenerating(true);
    try {
      const newBracket = generateBracket(tournament, categoryId);
      if (newBracket.length === 0) {
        showToast('No hay suficientes equipos clasificados para generar el bracket', 'error');
        return;
      }
      const scheduled = scheduleBracket(tournament, newBracket);

      // Persist via saveControlPanel
      const config = { ...tournament.config! };
      const existingBracket = config.bracketMatches?.filter(m => m.categoryId !== categoryId) ?? [];
      config.bracketMatches = [...existingBracket, ...scheduled];

      await saveControlPanel({
        id: tournament.id,
        categories: tournament.categories,
        config,
      });

      onBracketUpdate(scheduled);
      showToast('Bracket generado exitosamente', 'success');
    } catch (e) {
      console.error('[WorldCupBracket] generateBracket error:', e);
      showToast('Error al generar el bracket', 'error');
    } finally {
      setGenerating(false);
    }
  }

  // ── Result save handler ─────────────────────────────────────────────────────

  async function handleSaveResult(matchId: string, result: MatchResult) {
    setSavingId(matchId);
    try {
      const res = await saveBracketResult({ tournamentId: tournament.id, matchId, result });
      if (!res.ok) {
        showToast(res.error ?? 'Error al guardar el resultado', 'error');
        return;
      }
      // Rebuild updated matches array locally (propagate winner as the store does)
      const updated = bracketMatches.map(m =>
        m.id === matchId ? { ...m, result, status: 'done' as const } : m,
      );

      // Propagate winner to next round (mirrors saveBracketResultLocal logic)
      const played = updated.find(m => m.id === matchId);
      if (played && played.teamAId && played.teamBId) {
        const winnerId = result.winnerId;
        const loserId = winnerId === played.teamAId ? played.teamBId : played.teamAId;
        const catMatches = updated.filter(m => m.categoryId === played.categoryId);
        const fr = Math.max(...catMatches.map(m => m.round));
        const isSemi = played.round === fr - 1 && fr >= 1;
        const nextRound = played.round + 1;
        const nextSlot = Math.floor(played.slotIndex / 2);
        const side: 'A' | 'B' = played.slotIndex % 2 === 0 ? 'A' : 'B';

        for (let i = 0; i < updated.length; i++) {
          const m = updated[i];
          if (m.categoryId === played.categoryId && m.round === nextRound && m.slotIndex === nextSlot && !m.roundLabel?.includes('3er')) {
            updated[i] = side === 'A'
              ? { ...m, teamAId: winnerId, wildcardA: false }
              : { ...m, teamBId: winnerId, wildcardB: false };
          }
          if (isSemi && m.categoryId === played.categoryId && m.roundLabel?.includes('3er')) {
            updated[i] = side === 'A'
              ? { ...m, teamAId: loserId }
              : { ...m, teamBId: loserId };
          }
        }
      }

      onBracketUpdate(updated);
      setEditingId(null);
      showToast('Resultado guardado', 'success');
    } catch (e) {
      console.error('[WorldCupBracket] saveBracketResult error:', e);
      showToast('Error al guardar el resultado', 'error');
    } finally {
      setSavingId(null);
    }
  }

  const sharedCardProps = {
    teamName, canManage,
    editingId, savingId,
    onEdit: (id: string) => setEditingId(prev => prev === id ? null : id),
    onSave: handleSaveResult,
    onCancelEdit: () => setEditingId(null),
  };

  // ── No bracket yet ──────────────────────────────────────────────────────────

  if (bracketMatches.length === 0) {
    return (
      <div style={{ padding: '24px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 20,
        }}>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
            color: '#999',
          }}>
            Bracket: {category?.name ?? categoryId}
          </span>
        </div>
        {canManage ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
              No hay bracket generado para esta categoría.
            </p>
            <button
              disabled={generating}
              onClick={handleGenerateBracket}
              style={{
                fontSize: 12, padding: '10px 24px', border: 'none', cursor: generating ? 'not-allowed' : 'pointer',
                background: '#111', color: '#d6ff00', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                opacity: generating ? 0.6 : 1, transition: 'opacity 0.15s',
              }}
            >
              {generating ? 'Generando…' : 'Generar Bracket'}
            </button>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: '#aaa', textAlign: 'center', padding: '32px 0' }}>
            El bracket aún no está disponible.
          </p>
        )}
      </div>
    );
  }

  // ── Just a final (2 teams) ──────────────────────────────────────────────────

  if (finalRound === 0) {
    return (
      <div style={{ padding: '24px 0' }}>
        <SectionLabel>{category?.name ?? categoryId}</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          {finalMatch && (
            <BracketCard
              match={finalMatch}
              isFinal
              {...sharedCardProps}
            />
          )}
          <TrophyBlock champion={champion} />
          {thirdPlaceMatch && (
            <BracketCard match={thirdPlaceMatch} is3rd {...sharedCardProps} />
          )}
          <PodiumBlock champion={champion} runnerUp={runnerUp} thirdPlace={thirdPlace} />
        </div>
      </div>
    );
  }

  // ── Full symmetric bracket ──────────────────────────────────────────────────

  // For connectors we need the band height at each round, and we render connectors between
  // two consecutive cards (pairing them toward the next round). Connectors are placed
  // between adjacent card pairs.
  //
  // Visual order: LEFT columns (r=0..finalRound-1) → FINAL center → RIGHT columns (r=finalRound-1..0)

  return (
    <div style={{ padding: '24px 0' }}>
      <SectionLabel>{category?.name ?? categoryId}</SectionLabel>

      {/* Scrollable bracket wrapper */}
      <div style={{ overflowX: 'auto', overflowY: 'visible', paddingBottom: 24 }}>
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', minWidth: 'max-content' }}>

          {/* Main bracket row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>

            {/* LEFT SIDE: rounds from outermost (0) inward to (finalRound-1) */}
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
              {leftRounds.map((r, colIdx) => {
                const matches = leftByRound.get(r) ?? [];
                const bh = bandHeight(r);
                // For all rounds except the last left round, show connectors
                const showConnectors = r < finalRound - 1;

                return (
                  <div key={r} style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
                    {/* Card column for this round */}
                    <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                      {matches.map(match => (
                        <div
                          key={match.id}
                          style={{
                            height: bh,
                            display: 'flex',
                            alignItems: 'center',
                            boxSizing: 'border-box',
                            paddingTop: (bh - CARD_H) / 2,
                            paddingBottom: (bh - CARD_H) / 2,
                          }}
                        >
                          <BracketCard match={match} {...sharedCardProps} />
                        </div>
                      ))}
                    </div>

                    {/* Connectors right-side */}
                    {showConnectors && (
                      <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                        {/* Group matches in pairs (each pair feeds one match in the next round) */}
                        {Array.from({ length: Math.ceil(matches.length / 2) }, (_, pairIdx) => (
                          <ConnectorRight key={pairIdx} bandHeight={bh} />
                        ))}
                      </div>
                    )}

                    {/* Horizontal bridge from connector tip to next column (or to final) */}
                    {colIdx < leftRounds.length - 1 && (
                      <div style={{
                        width: 0,
                        // We rely on the connector having CONN_W width; no additional gap needed
                      }} />
                    )}
                  </div>
                );
              })}

              {/* Final arm from innermost left round to center */}
              {finalRound > 0 && (
                <div style={{
                  width: 24,
                  height: bandHeight(finalRound - 1),
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                }}>
                  <div style={{ width: '100%', height: 2, background: '#e0e0e0' }} />
                </div>
              )}
            </div>

            {/* CENTER: Final + Trophy + 3rd place */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'flex-start', flexShrink: 0, paddingTop: 0,
            }}>
              {/* Vertical center align to make the final card sit at the center of the bracket height */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0,
              }}>
                {/* Push final card to vertical center */}
                <div style={{
                  height: finalRound > 0 ? (bandHeight(finalRound - 1) - CARD_H) / 2 : 0,
                }} />
                {finalMatch && (
                  <BracketCard
                    match={finalMatch}
                    isFinal
                    {...sharedCardProps}
                  />
                )}
                <div style={{ height: 20 }} />
                <TrophyBlock champion={champion} />
                <div style={{ height: 20 }} />
                {thirdPlaceMatch && (
                  <BracketCard match={thirdPlaceMatch} is3rd {...sharedCardProps} />
                )}
              </div>
            </div>

            {/* RIGHT SIDE: rounds from innermost (finalRound-1) outward to (0) */}
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
              {/* Final arm from center to innermost right round */}
              {finalRound > 0 && (
                <div style={{
                  width: 24,
                  height: bandHeight(finalRound - 1),
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                }}>
                  <div style={{ width: '100%', height: 2, background: '#e0e0e0' }} />
                </div>
              )}

              {rightRounds.map((r, colIdx) => {
                const matches = rightByRound.get(r) ?? [];
                const bh = bandHeight(r);
                const showConnectors = r < finalRound - 1;

                return (
                  <div key={r} style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
                    {/* Connectors left-side (only for non-innermost right columns) */}
                    {showConnectors && colIdx > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                        {Array.from({ length: Math.ceil(matches.length / 2) }, (_, pairIdx) => (
                          <ConnectorLeft key={pairIdx} bandHeight={bh} />
                        ))}
                      </div>
                    )}

                    {/* Card column for this round */}
                    <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                      {matches.map(match => (
                        <div
                          key={match.id}
                          style={{
                            height: bh,
                            display: 'flex',
                            alignItems: 'center',
                            boxSizing: 'border-box',
                            paddingTop: (bh - CARD_H) / 2,
                            paddingBottom: (bh - CARD_H) / 2,
                          }}
                        >
                          <BracketCard match={match} {...sharedCardProps} />
                        </div>
                      ))}
                    </div>

                    {/* Connectors right-side for non-last right columns */}
                    {showConnectors && colIdx < rightRounds.length - 1 && (
                      <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                        {Array.from({ length: Math.ceil(matches.length / 2) }, (_, pairIdx) => (
                          <ConnectorRight key={pairIdx} bandHeight={bh} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Podium at very bottom */}
          <div style={{ marginTop: 32, width: '100%' }}>
            <PodiumBlock champion={champion} runnerUp={runnerUp} thirdPlace={thirdPlace} />
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Small sub-components ──────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
      color: '#999', marginBottom: 20, paddingBottom: 10,
      borderBottom: '1px solid #f0f0f0',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span>Bracket</span>
      <span style={{ color: '#ccc' }}>·</span>
      <span>{children}</span>
    </div>
  );
}

function TrophyBlock({ champion }: { champion: string | null }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    }}>
      <span style={{ fontSize: 32, lineHeight: 1, filter: champion ? 'none' : 'grayscale(1) opacity(0.3)' }}>
        🏆
      </span>
      {champion ? (
        <span style={{
          fontSize: 11, fontWeight: 700, color: '#111',
          letterSpacing: '0.06em', textTransform: 'uppercase',
          background: '#d6ff00', padding: '2px 10px',
        }}>
          {champion}
        </span>
      ) : (
        <span style={{ fontSize: 10, color: '#ccc', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Campeón
        </span>
      )}
    </div>
  );
}

function PodiumBlock({
  champion, runnerUp, thirdPlace,
}: {
  champion: string | null;
  runnerUp: string | null;
  thirdPlace: string | null;
}) {
  if (!champion && !runnerUp && !thirdPlace) return null;

  const PodiumEntry = ({
    medal, label, name,
  }: { medal: string; label: string; name: string | null }) => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      minWidth: 120,
    }}>
      <span style={{ fontSize: 22 }}>{medal}</span>
      <span style={{
        fontSize: 11, fontWeight: 700,
        color: name ? '#111' : '#ccc',
        textAlign: 'center',
        maxWidth: 140,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {name ?? label}
      </span>
    </div>
  );

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 32,
      padding: '20px 24px',
      background: 'rgba(0,0,0,0.02)',
      border: '1px solid #f0f0f0',
      marginTop: 8,
    }}>
      <PodiumEntry medal="🥉" label="3er Lugar" name={thirdPlace} />
      <PodiumEntry medal="🥇" label="Campeón" name={champion} />
      <PodiumEntry medal="🥈" label="Subcampeón" name={runnerUp} />
    </div>
  );
}
