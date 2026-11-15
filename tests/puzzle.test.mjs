import test from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, WORDS, filterWords } from '../data/words.js';
import {
  PUZZLE_LEVELS,
  sanitizePuzzleLetters,
  pickPuzzleTargets,
  scrambleDistinct,
  buildJigsawPieces,
  buildLetterTray,
  buildPuzzleRound,
} from '../data/puzzle.js';

const realCategories = CATEGORIES.map((c) => c.id).filter((id) => id !== 'all');

test('sanitizePuzzleLetters strips spaces and punctuation and uppercases letters', () => {
  assert.deepEqual(sanitizePuzzleLetters('Cat'), ['C', 'A', 'T']);
  assert.deepEqual(sanitizePuzzleLetters('T-shirt'), ['T', 'S', 'H', 'I', 'R', 'T']);
  assert.deepEqual(sanitizePuzzleLetters('Dragon fruit'), [
    'D', 'R', 'A', 'G', 'O', 'N', 'F', 'R', 'U', 'I', 'T',
  ]);
});

test('scrambleDistinct avoids identical order when distinct elements exist', () => {
  const sameRng = () => 0.9999; // Fisher-Yates leaves array unchanged
  assert.deepEqual(scrambleDistinct(['A', 'B', 'C'], (x) => x, sameRng), ['B', 'A', 'C']);
  assert.deepEqual(scrambleDistinct(['A', 'A'], (x) => x, sameRng), ['A', 'A']);
});

test('buildJigsawPieces returns exact piece grid for every level', () => {
  for (const [lvl, expectedCount] of [
    [1, 2],
    [2, 4],
    [3, 6],
  ]) {
    const cfg = PUZZLE_LEVELS[lvl];
    const pieces = buildJigsawPieces(cfg.jigsawCols, cfg.jigsawRows);
    assert.equal(pieces.length, expectedCount);
    assert.deepEqual(
      pieces.map((p) => p.index).sort((a, b) => a - b),
      Array.from({ length: expectedCount }, (_, i) => i)
    );
  }
});

test('buildLetterTray includes all target letters and adds distractors cleanly', () => {
  const catLetters = ['C', 'A', 'T'];
  const trayL1 = buildLetterTray(catLetters, 1);
  assert.equal(trayL1.length, 3);
  assert.deepEqual(trayL1.map((t) => t.letter).sort(), ['A', 'C', 'T']);

  const trayL3 = buildLetterTray(catLetters, 3);
  assert.equal(trayL3.length, 5);
  for (const ch of catLetters) {
    assert.ok(trayL3.some((t) => t.letter === ch));
  }

  // Single-letter card (Alphabets) gets age-scaled distractors
  assert.equal(buildLetterTray(['A'], 1).length, 2);
  assert.equal(buildLetterTray(['A'], 2).length, 3);
  assert.equal(buildLetterTray(['A'], 3).length, 4);
});

test('buildPuzzleRound works for every category, puzzle type, and level', () => {
  for (const cat of ['all', ...realCategories]) {
    const pool = filterWords(cat, WORDS);
    for (const level of [1, 2, 3]) {
      const cfg = PUZZLE_LEVELS[level];

      const jigsaw = buildPuzzleRound(pool, 'jigsaw', level, WORDS);
      assert.equal(jigsaw.length, cfg.roundSize);
      for (const q of jigsaw) {
        assert.equal(q.pieces.length, cfg.jigsawCols * cfg.jigsawRows);
      }

      const shadow = buildPuzzleRound(pool, 'shadow', level, WORDS);
      assert.equal(shadow.length, cfg.roundSize);
      for (const q of shadow) {
        assert.equal(q.choices.length, cfg.shadowChoices);
        assert.ok(q.choices.some((c) => c.id === q.target.id));
        assert.equal(new Set(q.choices.map((c) => c.id)).size, cfg.shadowChoices);
      }

      const letters = buildPuzzleRound(pool, 'letters', level, WORDS);
      assert.equal(letters.length, cfg.roundSize);
      for (const q of letters) {
        assert.ok(q.letters.length >= 1);
        assert.ok(q.tray.length >= q.letters.length);
      }
    }
  }
  assert.deepEqual(pickPuzzleTargets([], 1), []);
});
