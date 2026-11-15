import { WORDS, shuffle, pickQuestionChoices } from './words.js';

export const PUZZLE_TYPES = [
  { id: 'jigsaw', label: 'Potongan Gambar' },
  { id: 'shadow', label: 'Cocokkan Bayangan' },
  { id: 'letters', label: 'Susun Huruf' },
];

export const PUZZLE_LEVELS = {
  1: {
    id: 1,
    label: 'Level 1',
    age: '1-2 thn',
    roundSize: 3,
    jigsawCols: 2,
    jigsawRows: 1,
    guideOpacity: 0.24,
    shadowChoices: 2,
    maxWordLen: 4,
    showWordGuide: true,
    showLetterClues: true,
    extraLetters: 0,
  },
  2: {
    id: 2,
    label: 'Level 2',
    age: '3-4 thn',
    roundSize: 3,
    jigsawCols: 2,
    jigsawRows: 2,
    guideOpacity: 0.14,
    shadowChoices: 3,
    maxWordLen: 6,
    showWordGuide: true,
    showLetterClues: false,
    extraLetters: 0,
  },
  3: {
    id: 3,
    label: 'Level 3',
    age: '4-5 thn',
    roundSize: 3,
    jigsawCols: 3,
    jigsawRows: 2,
    guideOpacity: 0,
    shadowChoices: 4,
    maxWordLen: 8,
    showWordGuide: false,
    showLetterClues: false,
    extraLetters: 2,
  },
};

const EXTRA_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function getPuzzleLevelConfig(level) {
  return PUZZLE_LEVELS[level] || PUZZLE_LEVELS[1];
}

export function sanitizePuzzleLetters(word) {
  return String(word || '').replace(/[^a-zA-Z]/g, '').toUpperCase().split('');
}

/**
 * Pick targets fitting the level's word length first, topping up with
 * the shortest remaining words in the category so every category works.
 */
export function pickPuzzleTargets(pool, level = 1, rng = Math.random) {
  const cfg = getPuzzleLevelConfig(level);
  const valid = pool.filter((item) => sanitizePuzzleLetters(item.word).length > 0);
  if (!valid.length) return [];

  const fitting = shuffle(
    valid.filter((item) => sanitizePuzzleLetters(item.word).length <= cfg.maxWordLen),
    rng
  );
  if (fitting.length >= cfg.roundSize) {
    return fitting.slice(0, cfg.roundSize);
  }

  const pickedIds = new Set(fitting.map((item) => item.id));
  const rest = valid
    .filter((item) => !pickedIds.has(item.id))
    .sort((a, b) => sanitizePuzzleLetters(a.word).length - sanitizePuzzleLetters(b.word).length);

  return [...fitting, ...rest].slice(0, Math.min(cfg.roundSize, valid.length));
}

/**
 * Shuffle items while guaranteeing the order differs from the original
 * whenever at least two distinct values exist.
 */
export function scrambleDistinct(items, getKey = (x) => x, rng = Math.random) {
  if (items.length <= 1) return [...items];
  const uniqueKeys = new Set(items.map(getKey));
  if (uniqueKeys.size <= 1) return [...items];

  const shuffled = shuffle(items, rng);
  const sameOrder = shuffled.every((item, idx) => getKey(item) === getKey(items[idx]));
  if (sameOrder) {
    const swapIdx = shuffled.findIndex((item) => getKey(item) !== getKey(shuffled[0]));
    if (swapIdx > 0) {
      [shuffled[0], shuffled[swapIdx]] = [shuffled[swapIdx], shuffled[0]];
    }
  }
  return shuffled;
}

export function buildJigsawPieces(cols, rows, rng = Math.random) {
  const pieces = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      pieces.push({ index: row * cols + col, col, row });
    }
  }
  return scrambleDistinct(pieces, (p) => p.index, rng);
}

export function buildLetterTray(letters, level = 1, rng = Math.random) {
  const cfg = getPuzzleLevelConfig(level);
  // Single-letter cards (e.g. Alphabets) need distractors so the child has a real choice.
  const distractorCount = letters.length === 1 ? Math.max(1, Number(level) || 1) : cfg.extraLetters;
  const tiles = letters.map((ch, idx) => ({ id: `t-${idx}`, letter: ch, isExtra: false }));

  if (distractorCount > 0) {
    const letterSet = new Set(letters);
    const candidates = shuffle(
      [...EXTRA_ALPHABET].filter((ch) => !letterSet.has(ch)),
      rng
    );
    for (let i = 0; i < distractorCount && i < candidates.length; i++) {
      tiles.push({ id: `x-${i}`, letter: candidates[i], isExtra: true });
    }
  }

  return scrambleDistinct(tiles, (t) => t.letter, rng);
}

export function buildPuzzleRound(pool, type = 'jigsaw', level = 1, allWords = WORDS, rng = Math.random) {
  const cfg = getPuzzleLevelConfig(level);
  const targets =
    type === 'letters'
      ? pickPuzzleTargets(pool, level, rng)
      : shuffle(pool, rng).slice(0, Math.min(cfg.roundSize, pool.length));

  return targets.map((target) => {
    if (type === 'shadow') {
      return {
        type,
        target,
        choices: pickQuestionChoices(target, pool, cfg.shadowChoices, allWords, rng),
      };
    }
    if (type === 'letters') {
      const letters = sanitizePuzzleLetters(target.word);
      return {
        type,
        target,
        letters,
        tray: buildLetterTray(letters, level, rng),
      };
    }
    return {
      type: 'jigsaw',
      target,
      cols: cfg.jigsawCols,
      rows: cfg.jigsawRows,
      pieces: buildJigsawPieces(cfg.jigsawCols, cfg.jigsawRows, rng),
    };
  });
}
