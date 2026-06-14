import type { ScoreConfig, GameFormat, KnockoutConfig } from './game-engine';

function secondsPerPoint(levelLabel?: string): { min: number; max: number } {
  if (!levelLabel) return { min: 11, max: 13 };
  const l = levelLabel.toLowerCase();
  if (l.includes('principiante') || l.includes('todos')) return { min: 9, max: 11 };
  if (l.includes('avanzado') || l.includes('pro')) return { min: 13, max: 16 };
  return { min: 11, max: 13 }; // intermedio
}

export function matchDurationMinutes(
  scoreConfig: ScoreConfig,
  levelLabel?: string,
): { min: number; max: number } {
  if (scoreConfig.type === 'traditional') {
    const sets = scoreConfig.setsPerMatch ?? 1;
    if (sets >= 3) return { min: 60, max: 90 };
    if (sets === 2) return { min: 40, max: 65 };
    return { min: 20, max: 40 };
  }
  const target = scoreConfig.target ?? 24;
  const spp = secondsPerPoint(levelLabel);
  // Winner reaches target; loser averages ~65% of target
  const totalPointsMin = target * 1.3;
  const totalPointsMax = target * 1.9;
  const overheadMin = 4;
  const overheadMax = 8;
  return {
    min: Math.round((totalPointsMin * spp.min) / 60 + overheadMin),
    max: Math.round((totalPointsMax * spp.max) / 60 + overheadMax),
  };
}

export function estimateEventDuration(params: {
  format: GameFormat;
  scoreConfig: ScoreConfig;
  maxPlayers: number;
  courts: number;
  pjTarget?: number;
  knockoutConfig?: KnockoutConfig;
  levelLabel?: string;
}): { min: number; max: number; clockRounds: number } | null {
  const { format, scoreConfig, maxPlayers, courts, pjTarget, knockoutConfig, levelLabel } = params;
  if (courts <= 0 || maxPlayers < 4) return null;

  const matchDur = matchDurationMinutes(scoreConfig, levelLabel);
  const breakPerRound = 10;

  let clockRounds: number;

  if (format === 'americano' || format === 'mexicano' || format === 'round_robin') {
    const pj = pjTarget ?? 3;
    clockRounds = Math.ceil((maxPlayers * pj) / (courts * 4));
  } else if (format === 'knockout') {
    if (knockoutConfig?.hasGroups) {
      const numGroups = knockoutConfig.numGroups;
      const pairsPerGroup = Math.round(maxPlayers / 2 / Math.max(numGroups, 1));
      const groupRounds = Math.max(pairsPerGroup - 1, 0);
      const matchesPerGroupRound = numGroups * Math.floor(pairsPerGroup / 2);
      const clockGroupRounds = groupRounds * Math.ceil(Math.max(matchesPerGroupRound, 1) / courts);
      const qualPairs = numGroups * (knockoutConfig.teamsAdvancing ?? 2);
      const bracketRounds = Math.ceil(Math.log2(Math.max(qualPairs, 2)));
      clockRounds = clockGroupRounds + bracketRounds;
    } else {
      clockRounds = Math.ceil(Math.log2(Math.max(maxPlayers / 2, 2)));
    }
  } else if (format === 'world_cup') {
    const numGroups = knockoutConfig?.numGroups ?? 4;
    const matchesPerGroupRound = numGroups * 2;
    const clockGroupRounds = 3 * Math.ceil(matchesPerGroupRound / courts);
    const qualPairs = numGroups * 2;
    const bracketRounds = Math.ceil(Math.log2(Math.max(qualPairs, 2)));
    clockRounds = clockGroupRounds + bracketRounds;
  } else {
    return null;
  }

  if (clockRounds <= 0) return null;

  return {
    min: Math.round(clockRounds * (matchDur.min + breakPerRound)),
    max: Math.round(clockRounds * (matchDur.max + breakPerRound)),
    clockRounds,
  };
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

export function formatDurationRange(min: number, max: number): string {
  return `${formatDuration(min)} – ${formatDuration(max)}`;
}
