'use client';

import React, { useState } from 'react';
import type { KnockoutBracket, KnockoutMatch, FixedPair, GamePlayer, ScoreConfig } from '@/lib/game-engine';
import BracketScoreModal from './BracketScoreModal';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPairName(
  pairIds: string[] | null,
  fixedPairs?: FixedPair[],
  players?: GamePlayer[],
): string {
  if (!pairIds || pairIds.length === 0) return '???';
  if (fixedPairs) {
    const fp = fixedPairs.find(fp => fp.player1Id === pairIds[0]);
    if (fp) return fp.name?.trim() || `${fp.player1Name} / ${fp.player2Name}`;
  }
  if (players) {
    return pairIds.map(id => players.find(p => p.id === id)?.name ?? '?').join(' / ');
  }
  return pairIds[0]?.slice(0, 8) ?? '???';
}

function isByeSlot(pairIds: string[] | null): boolean {
  return pairIds !== null && pairIds.length > 0 && pairIds[0].startsWith('bye-');
}

// ── World Cup mirrored bracket ──────────────────────────────────────────────
// FIFA / ESPN style: the draw is split in two halves that converge on a central
// Final. Each round's matches[0 .. count/2) form the LEFT half (progressing
// rightward) and matches[count/2 .. count) form the RIGHT half (mirrored,
// progressing leftward). The Final + champion sit in the middle.

interface Props {
  bracket: KnockoutBracket;
  fixedPairs?: FixedPair[];
  players?: GamePlayer[];
  scoreConfig?: ScoreConfig;
  onScoreEntry?: (roundIdx: number, matchIdx: number, s1: number, s2: number, sets?: Array<{ p1: number; p2: number }>, walkover?: boolean) => void;
  isEditable?: boolean;
}

const HEADER_H = 32;
const COL_W    = 188;
const CONN_W   = 26;
const CENTER_W = 196;

export default function WorldCupBracketView({ bracket, fixedPairs, players, scoreConfig, onScoreEntry, isEditable = false }: Props) {
  const [editTarget, setEditTarget] = useState<{ roundIdx: number; matchIdx: number } | null>(null);

  const numRounds = bracket.rounds.length;

  // A single Final-only bracket: just defer to a simple centered card set.
  const finalRound = bracket.rounds[numRounds - 1];
  const finalMatch = finalRound?.matches[0];

  const editMatch = editTarget
    ? bracket.rounds[editTarget.roundIdx]?.matches[editTarget.matchIdx]
    : null;
  const editPair1Name = editMatch ? getPairName(editMatch.pair1, fixedPairs, players) : '';
  const editPair2Name = editMatch ? getPairName(editMatch.pair2, fixedPairs, players) : '';

  // Vertical geometry is driven by the number of round-0 matches per side.
  const firstCount = bracket.rounds[0]?.matches.length ?? 1;
  const halfFirst  = Math.max(1, Math.ceil(firstCount / 2));
  const SLOT_H_0   = Math.max(70, Math.min(116, 560 / halfFirst));
  const CARD_H     = Math.min(64, SLOT_H_0 - 8);
  const TOTAL_H    = SLOT_H_0 * halfFirst;

  const champion = finalMatch?.status === 'completed' && finalMatch.winner
    ? getPairName(finalMatch.winner, fixedPairs, players)
    : null;

  // Rounds that appear on the wings (everything except the Final).
  const wingRounds = bracket.rounds.slice(0, numRounds - 1);

  function sideCount(roundIdx: number): number {
    return Math.max(1, Math.floor(bracket.rounds[roundIdx].matches.length / 2));
  }

  function realMatchIdx(roundIdx: number, side: 'left' | 'right', sideIdx: number): number {
    const half = sideCount(roundIdx);
    return side === 'left' ? sideIdx : half + sideIdx;
  }

  // ── Match card (plain render helper, not a nested component) ─────────────────
  const renderMatchCard = (roundIdx: number, matchIdx: number, top: number, key: React.Key) => {
    const match = bracket.rounds[roundIdx].matches[matchIdx] as KnockoutMatch | undefined;
    if (!match) return null;
    const p1Name = getPairName(match.pair1, fixedPairs, players);
    const p2Name = getPairName(match.pair2, fixedPairs, players);
    const p1Bye  = isByeSlot(match.pair1);
    const p2Bye  = isByeSlot(match.pair2);
    const isComp = match.status === 'completed';
    const canEdit = isEditable && !isComp && match.pair1 && match.pair2 && !p1Bye && !p2Bye;
    const p1Win = isComp && match.winner && match.pair1 && match.winner[0] === match.pair1[0];
    const p2Win = isComp && match.winner && match.pair2 && match.winner[0] === match.pair2[0];

    const row = (name: string, bye: boolean, present: boolean, win: boolean | null | undefined, score: React.ReactNode, origin: string | undefined, border: boolean) => (
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: CARD_H / 2, padding: '0 9px 0 11px', background: win ? 'rgba(22,163,74,0.07)' : 'transparent', borderBottom: border ? '1px solid var(--grey-100)' : undefined }}>
        {win && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'var(--turf-green)' }} />}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', flex: 1 }}>
          <span style={{ fontSize: 11, fontWeight: win ? 700 : 400, lineHeight: 1.2, color: bye ? 'var(--grey-300)' : present ? (win ? '#15803d' : 'var(--black)') : 'var(--grey-300)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {bye ? 'BYE' : present ? name : '–'}
          </span>
          {origin && (
            <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--grey-400)', background: 'var(--grey-50)', border: '1px solid var(--grey-200)', padding: '1px 4px', borderRadius: 3, whiteSpace: 'nowrap', flexShrink: 0 }}>{origin}</span>
          )}
        </div>
        {isComp && !bye && present && (
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: win ? 'var(--turf-green)' : 'var(--grey-400)', flexShrink: 0 }}>{score}</span>
        )}
      </div>
    );

    const fp1 = fixedPairs?.find(f => match.pair1 && f.player1Id === match.pair1[0]);
    const fp2 = fixedPairs?.find(f => match.pair2 && f.player1Id === match.pair2[0]);

    return (
      <div
        key={key}
        onClick={() => canEdit && setEditTarget({ roundIdx, matchIdx })}
        style={{ position: 'absolute', top, left: 8, right: 8, height: CARD_H, border: `1.5px solid ${isComp ? 'var(--grey-200)' : canEdit ? 'var(--grey-300)' : 'var(--grey-100)'}`, background: isComp || canEdit ? '#fff' : '#fafafa', cursor: canEdit ? 'pointer' : 'default', overflow: 'hidden' }}
      >
        {row(p1Name, p1Bye, !!match.pair1, p1Win, match.walkover && !p1Win ? 'W/O' : match.pair1Score, fp1?.groupOrigin, true)}
        {row(p2Name, p2Bye, !!match.pair2, p2Win, match.walkover && !p2Win ? 'W/O' : match.pair2Score, fp2?.groupOrigin, false)}
        {canEdit && (
          <div style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--black)', color: 'var(--neon)', fontSize: 7, fontWeight: 800, padding: '2px 5px', letterSpacing: '0.07em', textTransform: 'uppercase' }}>+ resultado</div>
        )}
      </div>
    );
  };

  // ── One round column on a given side ─────────────────────────────────────────
  const renderRoundColumn = (roundIdx: number, side: 'left' | 'right', key: React.Key) => {
    const count = sideCount(roundIdx);
    const slotH = TOTAL_H / count;
    return (
      <div key={key} style={{ flex: `0 0 ${COL_W}px`, height: TOTAL_H + HEADER_H, position: 'relative' }}>
        <div style={{ height: HEADER_H, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--black)', color: 'var(--neon)', fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
          {bracket.rounds[roundIdx].name}
        </div>
        {Array.from({ length: count }, (_, sideIdx) => {
          const mIdx = realMatchIdx(roundIdx, side, sideIdx);
          const top = HEADER_H + sideIdx * slotH + (slotH - CARD_H) / 2;
          return renderMatchCard(roundIdx, mIdx, top, sideIdx);
        })}
      </div>
    );
  };

  // ── Connector between two adjacent rounds on a side ──────────────────────────
  const renderConnector = (fromRoundIdx: number, side: 'left' | 'right', key: React.Key) => {
    const prevCount = sideCount(fromRoundIdx);
    const nextCount = sideCount(fromRoundIdx + 1);
    const prevSlotH = TOTAL_H / prevCount;
    const color = '#d1d5db';
    return (
      <div key={key} style={{ flex: `0 0 ${CONN_W}px`, height: TOTAL_H + HEADER_H, position: 'relative' }}>
        <svg width={CONN_W} height={TOTAL_H} style={{ position: 'absolute', top: HEADER_H, left: 0, overflow: 'visible' }}>
          {Array.from({ length: nextCount }, (_, mi) => {
            const topY = (mi * 2) * prevSlotH + prevSlotH / 2;
            const botY = (mi * 2 + 1) * prevSlotH + prevSlotH / 2;
            const midY = (topY + botY) / 2;
            const cx = CONN_W / 2;
            // For left side, arms come from the left (x small) and exit right.
            // For right side, mirror: arms come from the right, exit left.
            if (side === 'left') {
              return (
                <g key={mi}>
                  <line x1={-6} y1={topY} x2={cx} y2={topY} stroke={color} strokeWidth={1.5} />
                  <line x1={-6} y1={botY} x2={cx} y2={botY} stroke={color} strokeWidth={1.5} />
                  <line x1={cx} y1={topY} x2={cx} y2={botY} stroke={color} strokeWidth={1.5} />
                  <line x1={cx} y1={midY} x2={CONN_W + 6} y2={midY} stroke={color} strokeWidth={1.5} />
                </g>
              );
            }
            return (
              <g key={mi}>
                <line x1={CONN_W + 6} y1={topY} x2={cx} y2={topY} stroke={color} strokeWidth={1.5} />
                <line x1={CONN_W + 6} y1={botY} x2={cx} y2={botY} stroke={color} strokeWidth={1.5} />
                <line x1={cx} y1={topY} x2={cx} y2={botY} stroke={color} strokeWidth={1.5} />
                <line x1={cx} y1={midY} x2={-6} y2={midY} stroke={color} strokeWidth={1.5} />
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  // Left wing: rounds in order (0 → R-2). Right wing: rounds reversed (R-2 → 0).
  const leftSequence: React.ReactNode[] = [];
  wingRounds.forEach((_, r) => {
    leftSequence.push(renderRoundColumn(r, 'left', `lr${r}`));
    if (r < wingRounds.length - 1) leftSequence.push(renderConnector(r, 'left', `lc${r}`));
  });

  const rightSequence: React.ReactNode[] = [];
  for (let r = wingRounds.length - 1; r >= 0; r--) {
    if (r < wingRounds.length - 1) rightSequence.push(renderConnector(r, 'right', `rc${r}`));
    rightSequence.push(renderRoundColumn(r, 'right', `rr${r}`));
  }

  // ── Center: Final + champion ─────────────────────────────────────────────────
  const finalEditable = isEditable && finalMatch && finalMatch.status !== 'completed' &&
    finalMatch.pair1 && finalMatch.pair2 && !isByeSlot(finalMatch.pair1) && !isByeSlot(finalMatch.pair2);
  const fp1Name = finalMatch ? getPairName(finalMatch.pair1, fixedPairs, players) : '';
  const fp2Name = finalMatch ? getPairName(finalMatch.pair2, fixedPairs, players) : '';
  const f1Win = finalMatch?.status === 'completed' && finalMatch.winner && finalMatch.pair1 && finalMatch.winner[0] === finalMatch.pair1[0];
  const f2Win = finalMatch?.status === 'completed' && finalMatch.winner && finalMatch.pair2 && finalMatch.winner[0] === finalMatch.pair2[0];

  const centerCol = (
    <div style={{ flex: `0 0 ${CENTER_W}px`, height: TOTAL_H + HEADER_H, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '0 6px' }}>
      {/* Champion */}
      <div style={{ width: '100%', padding: '14px 12px', background: 'var(--neon)', textAlign: 'center' }}>
        <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.45)', marginBottom: 6 }}>Campeón</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--black)', lineHeight: 1.3 }}>
          {champion ? <>🏆 {champion}</> : <span style={{ color: 'rgba(0,0,0,0.35)' }}>Por definir</span>}
        </div>
      </div>
      {/* Final match */}
      <div style={{ width: '100%' }}>
        <div style={{ height: HEADER_H, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--neon)', color: 'var(--black)', fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
          {finalRound?.name ?? 'Final'}
        </div>
        <div
          onClick={() => finalEditable && setEditTarget({ roundIdx: numRounds - 1, matchIdx: 0 })}
          style={{ border: '1.5px solid var(--black)', background: '#fff', cursor: finalEditable ? 'pointer' : 'default', overflow: 'hidden', position: 'relative' }}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 11px', background: f1Win ? 'rgba(22,163,74,0.07)' : 'transparent', borderBottom: '1px solid var(--grey-100)' }}>
            {f1Win && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'var(--turf-green)' }} />}
            <span style={{ fontSize: 12, fontWeight: f1Win ? 700 : 400, color: finalMatch?.pair1 ? (f1Win ? '#15803d' : 'var(--black)') : 'var(--grey-300)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{finalMatch?.pair1 ? fp1Name : '–'}</span>
            {finalMatch?.status === 'completed' && finalMatch.pair1 && <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: f1Win ? 'var(--turf-green)' : 'var(--grey-400)' }}>{finalMatch.walkover && !f1Win ? 'W/O' : finalMatch.pair1Score}</span>}
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 11px', background: f2Win ? 'rgba(22,163,74,0.07)' : 'transparent' }}>
            {f2Win && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'var(--turf-green)' }} />}
            <span style={{ fontSize: 12, fontWeight: f2Win ? 700 : 400, color: finalMatch?.pair2 ? (f2Win ? '#15803d' : 'var(--black)') : 'var(--grey-300)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{finalMatch?.pair2 ? fp2Name : '–'}</span>
            {finalMatch?.status === 'completed' && finalMatch.pair2 && <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: f2Win ? 'var(--turf-green)' : 'var(--grey-400)' }}>{finalMatch.walkover && !f2Win ? 'W/O' : finalMatch.pair2Score}</span>}
          </div>
          {finalEditable && (
            <div style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--black)', color: 'var(--neon)', fontSize: 7, fontWeight: 800, padding: '2px 5px', letterSpacing: '0.07em', textTransform: 'uppercase' }}>+ resultado</div>
          )}
        </div>
      </div>
    </div>
  );

  const totalWidth =
    wingRounds.length * COL_W * 2 +
    Math.max(0, wingRounds.length - 1) * CONN_W * 2 +
    CENTER_W;

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: totalWidth }}>
        {leftSequence}
        {centerCol}
        {rightSequence}
      </div>

      {editTarget && onScoreEntry && (
        <BracketScoreModal
          pair1Name={editPair1Name}
          pair2Name={editPair2Name}
          scoreConfig={scoreConfig}
          onConfirm={(s1, s2, sets, walkover) => {
            onScoreEntry(editTarget.roundIdx, editTarget.matchIdx, s1, s2, sets, walkover);
            setEditTarget(null);
          }}
          onCancel={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}
