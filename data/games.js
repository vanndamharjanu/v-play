import { CATEGORIES, WORDS, shuffle } from './words.js';

export const GAME_LEVELS = {
  1: {
    id: 1,
    memoryPairs: 2,
    countMin: 1,
    countMax: 3,
    countChoices: 2,
    oddMainCount: 2,
    oddShowHint: true,
    roundSize: 4,
  },
  2: {
    id: 2,
    memoryPairs: 3,
    countMin: 1,
    countMax: 5,
    countChoices: 3,
    oddMainCount: 3,
    oddShowHint: true,
    roundSize: 4,
  },
  3: {
    id: 3,
    memoryPairs: 4,
    countMin: 3,
    countMax: 8,
    countChoices: 4,
    oddMainCount: 3,
    oddShowHint: false,
    roundSize: 4,
  },
};

const COUNTABLE_CATEGORIES = new Set(['animals', 'fruits', 'objects', 'shapes']);
const CATEGORY_LABEL_MAP = new Map(CATEGORIES.map((c) => [c.id, c.label]));

export function getGameLevelConfig(level) {
  return GAME_LEVELS[level] || GAME_LEVELS[1];
}

export function getCategoryLabel(categoryId) {
  return CATEGORY_LABEL_MAP.get(categoryId) || categoryId;
}

export function buildMemoryDeck(pool, level = 1, rng = Math.random) {
  const cfg = getGameLevelConfig(level);
  if (!pool.length) return { pairs: [], cards: [] };

  const pairs = shuffle(pool, rng).slice(0, Math.min(cfg.memoryPairs, pool.length));
  const cards = [];
  for (const item of pairs) {
    cards.push({ uid: `${item.id}-a`, word: item });
    cards.push({ uid: `${item.id}-b`, word: item });
  }
  return {
    pairs,
    cards: shuffle(cards, rng),
  };
}

export function buildCountingRound(pool, categoryId = 'all', level = 1, allWords = WORDS, rng = Math.random) {
  const cfg = getGameLevelConfig(level);
  const countablePool =
    !categoryId || categoryId === 'all' || categoryId === 'numbers'
      ? allWords.filter((w) => COUNTABLE_CATEGORIES.has(w.category))
      : pool;

  if (!countablePool.length) return [];

  const numberByValue = new Map();
  for (let n = 1; n <= 10; n++) {
    const entry = allWords.find((w) => w.id === `number-${n}`);
    if (entry) numberByValue.set(n, entry);
  }

  const allCounts = [];
  for (let n = cfg.countMin; n <= cfg.countMax; n++) {
    if (numberByValue.has(n)) allCounts.push(n);
  }
  if (!allCounts.length) return [];

  const chosenCounts = [];
  while (chosenCounts.length < cfg.roundSize) {
    chosenCounts.push(...shuffle(allCounts, rng));
  }

  const items = shuffle(countablePool, rng);
  const questions = [];

  for (let i = 0; i < cfg.roundSize; i++) {
    const count = chosenCounts[i];
    const item = items[i % items.length];
    const targetNumber = numberByValue.get(count);

    const distractorRangeMax = Math.max(cfg.countMax + 1, cfg.countChoices + 1);
    const distractorNums = shuffle(
      [...numberByValue.keys()].filter((n) => n !== count && n <= distractorRangeMax),
      rng
    ).slice(0, cfg.countChoices - 1);

    const choices = shuffle(
      [targetNumber, ...distractorNums.map((n) => numberByValue.get(n))],
      rng
    );

    questions.push({
      count,
      item,
      targetNumber,
      choices,
    });
  }

  return questions;
}

export function buildOddOneRound(categoryId = 'all', level = 1, allWords = WORDS, rng = Math.random) {
  const cfg = getGameLevelConfig(level);
  const realCategories = CATEGORIES.map((c) => c.id).filter((id) => id !== 'all');
  const byCategory = new Map(
    realCategories.map((cat) => [cat, allWords.filter((w) => w.category === cat)])
  );

  const hasSpecific = categoryId && categoryId !== 'all' && (byCategory.get(categoryId)?.length || 0) >= cfg.oddMainCount;
  const categoryQueue = [];
  if (hasSpecific) {
    for (let i = 0; i < cfg.roundSize; i++) categoryQueue.push(categoryId);
  } else {
    while (categoryQueue.length < cfg.roundSize) {
      categoryQueue.push(...shuffle(realCategories, rng));
    }
  }

  const questions = [];
  for (let i = 0; i < cfg.roundSize; i++) {
    const mainCategory = categoryQueue[i];
    const mainPool = byCategory.get(mainCategory) || [];
    if (mainPool.length < cfg.oddMainCount) continue;

    const mainItems = shuffle(mainPool, rng).slice(0, cfg.oddMainCount);
    const mainWordsLower = new Set(mainItems.map((w) => w.word.toLowerCase()));
    const oddPool = allWords.filter(
      (w) => w.category !== mainCategory && !mainWordsLower.has(w.word.toLowerCase())
    );
    if (!oddPool.length) continue;

    const oddItem = shuffle(oddPool, rng)[0];
    questions.push({
      mainCategory,
      mainLabel: getCategoryLabel(mainCategory),
      oddItem,
      choices: shuffle([...mainItems, oddItem], rng),
      showHint: cfg.oddShowHint,
    });
  }

  return questions;
}
