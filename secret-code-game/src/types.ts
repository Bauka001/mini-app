export interface GameConfig {
  level: 'easy' | 'medium' | 'hard' | 'hard+';
  slots: number;
  colors: string[];
  shapes?: string[];
  attempts: number;
  timeLimit?: number;
  allowDuplicates: boolean;
  restrictions?: string[];
}

export interface GameState {
  secretCode: string[];
  currentGuess: string[];
  attempts: GuessAttempt[];
  currentAttempt: number;
  gameStatus: 'playing' | 'won' | 'lost';
  score: number;
  timeRemaining?: number;
  restrictions?: string[];
}

export interface GuessAttempt {
  guess: string[];
  blackDots: number;
  whiteDots: number;
}

export interface DifficultyLevel {
  name: string;
  config: GameConfig;
}

export const COLORS = [
  'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'
];

export const SHAPES = ['circle', 'square', 'star'];

export const DIFFICULTY_LEVELS: Record<string, DifficultyLevel> = {
  easy: {
    name: 'Оңай',
    config: {
      level: 'easy',
      slots: 4,
      colors: COLORS.slice(0, 6),
      attempts: 10,
      allowDuplicates: false
    }
  },
  medium: {
    name: 'Орташа',
    config: {
      level: 'medium',
      slots: 5,
      colors: COLORS.slice(0, 7),
      attempts: 8,
      allowDuplicates: true
    }
  },
  hard: {
    name: 'Қиын',
    config: {
      level: 'hard',
      slots: 6,
      colors: COLORS,
      attempts: 6,
      allowDuplicates: true,
      timeLimit: 120
    }
  },
  hardPlus: {
    name: 'Hard+',
    config: {
      level: 'hard+',
      slots: 6,
      colors: COLORS,
      shapes: SHAPES,
      attempts: 6,
      allowDuplicates: true,
      timeLimit: 120
    }
  }
};