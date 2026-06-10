// level-config.ts — Padel skill level definitions (1.0–7.0 scale)

export type PlayerLevel =
  | '1.0' | '1.5'
  | '2.0' | '2.5'
  | '3.0' | '3.5'
  | '4.0' | '4.5'
  | '5.0' | '5.5'
  | '6.0' | '7.0';

export const PLAYER_LEVELS: PlayerLevel[] = [
  '1.0', '1.5', '2.0', '2.5', '3.0', '3.5',
  '4.0', '4.5', '5.0', '5.5', '6.0', '7.0',
];

export interface LevelInfo {
  level: PlayerLevel;
  label: string;
  group: 'Iniciante' | 'Básico' | 'Intermedio' | 'Avanzado' | 'Élite' | 'Profesional';
  color: string;
  description: string;
}

export const LEVEL_CONFIG: Record<PlayerLevel, LevelInfo> = {
  '1.0': {
    level: '1.0',
    label: 'Nivel 1.0',
    group: 'Iniciante',
    color: '#9CA3AF',
    description: 'Nunca jugaste o recién estás comenzando. Estás aprendiendo cómo agarrar la raqueta y los golpes básicos.',
  },
  '1.5': {
    level: '1.5',
    label: 'Nivel 1.5',
    group: 'Iniciante',
    color: '#9CA3AF',
    description: 'Podés sostener rallies cortos. Conocés las reglas básicas y empezás a controlar la dirección.',
  },
  '2.0': {
    level: '2.0',
    label: 'Nivel 2.0',
    group: 'Básico',
    color: '#6EE7B7',
    description: 'Jugás de forma regular. Tenés golpes de fondo consistentes y comprendés el posicionamiento básico.',
  },
  '2.5': {
    level: '2.5',
    label: 'Nivel 2.5',
    group: 'Básico',
    color: '#6EE7B7',
    description: 'Controlás el tiro de pared y el globo. Empezás a usar la red con intención.',
  },
  '3.0': {
    level: '3.0',
    label: 'Nivel 3.0',
    group: 'Intermedio',
    color: '#FCD34D',
    description: 'Buen manejo de todas las paredes. Usás el bandeja y volea con regularidad. Entendés la táctica básica.',
  },
  '3.5': {
    level: '3.5',
    label: 'Nivel 3.5',
    group: 'Intermedio',
    color: '#FCD34D',
    description: 'Golpeas con consistencia y potencia. Podés leer el juego del rival y adaptarte durante el partido.',
  },
  '4.0': {
    level: '4.0',
    label: 'Nivel 4.0',
    group: 'Avanzado',
    color: '#FB923C',
    description: 'Dominio técnico sólido. Usás el vibora, chiquita y x3 de forma natural. Juegas torneos amateur.',
  },
  '4.5': {
    level: '4.5',
    label: 'Nivel 4.5',
    group: 'Avanzado',
    color: '#FB923C',
    description: 'Excelente juego táctico y físico. Ganás torneos locales y sos referente en tu club.',
  },
  '5.0': {
    level: '5.0',
    label: 'Nivel 5.0',
    group: 'Élite',
    color: '#F87171',
    description: 'Jugador de alto nivel competitivo. Participás en torneos regionales o nacionales amateur.',
  },
  '5.5': {
    level: '5.5',
    label: 'Nivel 5.5',
    group: 'Élite',
    color: '#F87171',
    description: 'Nivel semi-profesional. Gran capacidad física y técnica. Competís en ligas nacionales.',
  },
  '6.0': {
    level: '6.0',
    label: 'Nivel 6.0',
    group: 'Profesional',
    color: '#A78BFA',
    description: 'Jugador profesional o ex-profesional. Dominio completo del juego.',
  },
  '7.0': {
    level: '7.0',
    label: 'Nivel 7.0',
    group: 'Profesional',
    color: '#A78BFA',
    description: 'Élite mundial. Top ranking WPT/APT u equivalente.',
  },
};

export function getLevelInfo(level: PlayerLevel | string | undefined): LevelInfo {
  if (level && level in LEVEL_CONFIG) return LEVEL_CONFIG[level as PlayerLevel];
  return LEVEL_CONFIG['1.0'];
}

/** Converts legacy string values to PlayerLevel (backwards compat). */
export function normalizeLegacyLevel(level: string | undefined): PlayerLevel {
  if (!level) return '1.0';
  if (level in LEVEL_CONFIG) return level as PlayerLevel;
  if (level === 'beginner')     return '1.0';
  if (level === 'intermediate') return '3.0';
  if (level === 'advanced')     return '5.0';
  return '1.0';
}
