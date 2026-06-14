'use client';

import React, { useState } from 'react';
import type { ScoreConfig } from '@/lib/game-engine';

// Shared score-entry modal for elimination brackets (Knockout + World Cup).
// Traditional mode shows per-set inputs in column format; points mode shows two
// totals. A draw is never allowed in single elimination.

export interface BracketScoreModalProps {
  pair1Name: string;
  pair2Name: string;
  scoreConfig?: ScoreConfig;
  onConfirm: (s1: number, s2: number, sets?: Array<{ p1: number; p2: number }>, walkover?: boolean) => void;
  onCancel: () => void;
}

export default function BracketScoreModal({ pair1Name, pair2Name, scoreConfig, onConfirm, onCancel }: BracketScoreModalProps) {
  const isTraditional = scoreConfig?.type === 'traditional';
  const baseSets = scoreConfig?.setsPerMatch ?? 3;
  // Walkover: a team retires (injury) and the rival advances without a played score.
  const [woMode, setWoMode] = useState(false);

  const [setInputs, setSetInputs] = useState<Array<{ p1: string; p2: string }>>(
    Array.from({ length: baseSets }, () => ({ p1: '', p2: '' })),
  );
  const [pts1, setPts1] = useState('');
  const [pts2, setPts2] = useState('');

  function setsWon(inputs: Array<{ p1: string; p2: string }>): { p1: number; p2: number } {
    let p1 = 0, p2 = 0;
    for (const s of inputs) {
      const a = parseInt(s.p1 || '0', 10);
      const b = parseInt(s.p2 || '0', 10);
      if (a > b) p1++;
      else if (b > a) p2++;
    }
    return { p1, p2 };
  }

  function setIsFilled(s: { p1: string; p2: string }): boolean {
    return s.p1 !== '' && s.p2 !== '';
  }

  const needsTiebreak = isTraditional && baseSets === 2 &&
    setIsFilled(setInputs[0]) && setIsFilled(setInputs[1]) &&
    (() => { const w = setsWon(setInputs.slice(0, 2)); return w.p1 === 1 && w.p2 === 1; })();

  const effectiveSets = needsTiebreak ? baseSets + 1 : baseSets;

  const paddedInputs = [...setInputs];
  while (paddedInputs.length < effectiveSets) paddedInputs.push({ p1: '', p2: '' });

  function updateSet(idx: number, side: 'p1' | 'p2', val: string) {
    setSetInputs(prev => {
      const next = [...prev];
      while (next.length <= idx) next.push({ p1: '', p2: '' });
      next[idx] = { ...next[idx], [side]: val };
      return next;
    });
  }

  const allFilled = isTraditional
    ? paddedInputs.slice(0, effectiveSets).every(setIsFilled)
    : pts1 !== '' && pts2 !== '';

  const finalScore = isTraditional ? setsWon(paddedInputs.slice(0, effectiveSets)) : null;
  const validTraditional = isTraditional && allFilled && finalScore !== null && finalScore.p1 !== finalScore.p2;
  const validPoints = !isTraditional && allFilled && Number(pts1) !== Number(pts2);
  const valid = isTraditional ? validTraditional : validPoints;

  function handleConfirm() {
    if (!valid) return;
    if (isTraditional && finalScore) {
      const sets = paddedInputs.slice(0, effectiveSets).map(s => ({
        p1: parseInt(s.p1 || '0', 10),
        p2: parseInt(s.p2 || '0', 10),
      }));
      onConfirm(finalScore.p1, finalScore.p2, sets);
    } else {
      onConfirm(Number(pts1), Number(pts2));
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', padding: 0, maxWidth: 420, width: '100%', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', background: 'var(--black)', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          Resultado del partido
        </div>

        {/* Walkover toggle */}
        <button onClick={() => setWoMode(v => !v)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', border: 'none', borderBottom: '1px solid var(--grey-100)', background: woMode ? '#fff7ed' : '#fafafa', cursor: 'pointer', textAlign: 'left' }}>
          <span style={{ width: 34, height: 20, borderRadius: 10, background: woMode ? '#ea580c' : 'var(--grey-300)', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
            <span style={{ position: 'absolute', top: 2, left: woMode ? 16 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: woMode ? '#9a3412' : 'var(--grey-500)' }}>
            🚑 Retiro por lesión (walkover)
          </span>
        </button>

        {woMode ? (
          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 12, color: 'var(--grey-500)', marginBottom: 14, lineHeight: 1.5 }}>
              Elegí la pareja que <strong>se retira</strong>. Su rival avanza automáticamente.
            </div>
            {[{ name: pair1Name, retires: 'A', s1: 0, s2: 1 }, { name: pair2Name, retires: 'B', s1: 1, s2: 0 }].map(opt => (
              <button key={opt.retires} onClick={() => onConfirm(opt.s1, opt.s2, undefined, true)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 14px', marginBottom: 8, border: '1px solid var(--grey-200)', background: '#fff', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ fontSize: 13, color: 'var(--black)' }}>
                  Se retira <strong>{opt.name}</strong>
                </span>
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9a3412', background: '#ffedd5', padding: '3px 8px', flexShrink: 0 }}>W/O</span>
              </button>
            ))}
          </div>
        ) : isTraditional ? (
          <div style={{ padding: '0 0 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px 8px', gap: 12 }}>
              <div style={{ flex: 1 }} />
              {Array.from({ length: effectiveSets }, (_, i) => (
                <div key={i} style={{ width: 52, textAlign: 'center', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: i >= baseSets ? '#b45309' : 'var(--grey-400)' }}>
                  {i >= baseSets ? 'DESEMPATE' : `SET ${i + 1}`}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: '1px solid var(--grey-100)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: 'var(--grey-400)', marginBottom: 2, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Pareja A</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--black)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pair1Name}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {Array.from({ length: effectiveSets }, (_, i) => (
                  <input key={i} type="number" min="0" max="99"
                    value={paddedInputs[i]?.p1 ?? ''}
                    onChange={e => updateSet(i, 'p1', e.target.value)}
                    placeholder="0"
                    style={{ width: 52, height: 52, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, border: `2px solid ${i >= baseSets ? '#fde047' : 'var(--grey-300)'}`, outline: 'none', background: '#fff', color: 'var(--black)' }}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: 'var(--grey-400)', marginBottom: 2, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Pareja B</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--black)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pair2Name}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {Array.from({ length: effectiveSets }, (_, i) => (
                  <input key={i} type="number" min="0" max="99"
                    value={paddedInputs[i]?.p2 ?? ''}
                    onChange={e => updateSet(i, 'p2', e.target.value)}
                    placeholder="0"
                    style={{ width: 52, height: 52, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, border: `2px solid ${i >= baseSets ? '#fde047' : 'var(--grey-300)'}`, outline: 'none', background: '#fff', color: 'var(--black)' }}
                  />
                ))}
              </div>
            </div>

            {needsTiebreak && (
              <div style={{ margin: '0 20px 8px', padding: '6px 10px', background: '#fefce8', border: '1px solid #fde047', fontSize: 11, color: '#854d0e', fontWeight: 600 }}>
                ⚡ Sets empatados — ingresá el desempate
              </div>
            )}

            {allFilled && finalScore && finalScore.p1 === finalScore.p2 && (
              <div style={{ margin: '0 20px', fontSize: 11, color: '#dc2626', fontWeight: 600 }}>
                No puede haber empate en eliminación directa.
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '16px 20px' }}>
            {[{ name: pair1Name, val: pts1, setVal: setPts1 }, { name: pair2Name, val: pts2, setVal: setPts2 }].map((side, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey-500)', display: 'block', marginBottom: 5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {side.name}
                </label>
                <input type="number" min="0" value={side.val} onChange={e => side.setVal(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', fontSize: 20, fontFamily: 'var(--font-display)', fontWeight: 700, border: '2px solid var(--grey-200)', background: '#fff', color: 'var(--black)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            {pts1 !== '' && pts2 !== '' && Number(pts1) === Number(pts2) && (
              <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>No puede haber empate en eliminación directa.</div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, padding: '12px 20px', borderTop: '1px solid var(--grey-100)' }}>
          {!woMode && (
            <button onClick={handleConfirm} disabled={!valid}
              style={{ flex: 1, padding: '11px', background: valid ? 'var(--black)' : 'var(--grey-200)', color: valid ? 'var(--neon)' : 'var(--grey-400)', border: 'none', cursor: valid ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Confirmar
            </button>
          )}
          <button onClick={onCancel}
            style={{ padding: '11px 18px', background: 'transparent', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey-500)' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
