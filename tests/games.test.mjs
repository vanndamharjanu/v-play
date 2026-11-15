import test from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, WORDS, filterWords } from '../data/words.js';
import {
  GAME_LEVELS,
  buildMemoryDeck,
  buildCountingRound,
  buildOddOneRound,
} from '../data/games.js';

const realCategories = CATEGORIES.map((c) => c.id).filter((id) => id !== 'all');

test('buildMemoryDeck creates exact pairs and shuffled cards across levels and categories', () => {
  assert.deepEqual(buildMemoryDeck([], 1), { pairs: [], cards: [] });

  for (const cat of ['all', ...realCategories]) {
    const pool = filterWords(cat, WORDS);
    for (const level of [1, 2, 3]) {
      const cfg = GAME_LEVELS[level];
      const deck = buildMemoryDeck(pool, level);
      assert.equal(deck.pairs.length, cfg.memoryPairs);
      assert.equal(deck.cards.length, cfg.memoryPairs * 2);
      assert.equal(new Set(deck.cards.map((c) => c.uid)).size, deck.cards.length);

      for (const pairWord of deck.pairs) {
        const matches = deck.cards.filter((c) => c.word.id === pairWord.id);
        assert.equal(matches.length, 2);
      }
    }
  }
});

test('buildCountingRound builds valid counting prompts and choices across levels and categories', () => {
  assert.deepEqual(buildCountingRound([], 'animals', 1, WORDS), []);

  for (const cat of ['all', ...realCategories]) {
    const pool = filterWords(cat, WORDS);
    for (const level of [1, 2, 3]) {
      const cfg = GAME_LEVELS[level];
      const round = buildCountingRound(pool, cat, level, WORDS);
      assert.equal(round.length, cfg.roundSize);

      for (const q of round) {
        assert.ok(q.count >= cfg.countMin && q.count <= cfg.countMax);
        assert.equal(q.targetNumber.id, `number-${q.count}`);
        assert.equal(q.choices.length, cfg.countChoices);
        assert.equal(new Set(q.choices.map((c) => c.id)).size, cfg.countChoices);
        assert.ok(q.choices.some((c) => c.id === q.targetNumber.id));
      }
    }
  }
});

test('buildOddOneRound picks main category group and one distinct outlier across levels and categories', () => {
  for (const cat of ['all', ...realCategories]) {
    for (const level of [1, 2, 3]) {
      const cfg = GAME_LEVELS[level];
      const round = buildOddOneRound(cat, level, WORDS);
      assert.equal(round.length, cfg.roundSize);

      for (const q of round) {
        assert.equal(q.showHint, cfg.oddShowHint);
        assert.equal(q.choices.length, cfg.oddMainCount + 1);
        assert.equal(new Set(q.choices.map((c) => c.id)).size, cfg.oddMainCount + 1);
        assert.notEqual(q.oddItem.category, q.mainCategory);

        const sameCat = q.choices.filter((c) => c.category === q.mainCategory);
        const outliers = q.choices.filter((c) => c.id === q.oddItem.id);
        assert.equal(sameCat.length, cfg.oddMainCount);
        assert.equal(outliers.length, 1);
      }
    }
  }
});
