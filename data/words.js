export const CATEGORIES = [
  { id: 'all', label: 'Semua', thumb: null },
  { id: 'animals', label: 'Hewan', thumb: './assets/images/animals/cat.webp' },
  { id: 'colors', label: 'Warna', thumb: './assets/images/colors/red.webp' },
  { id: 'fruits', label: 'Buah', thumb: './assets/images/fruits/apple.webp' },
  { id: 'vegetables', label: 'Sayur', thumb: './assets/images/vegetables/carrot.webp' },
  { id: 'food', label: 'Makanan', thumb: './assets/images/food/pizza.webp' },
  { id: 'body', label: 'Tubuh', thumb: './assets/images/body/hand.webp' },
  { id: 'vehicles', label: 'Kendaraan', thumb: './assets/images/vehicles/car.webp' },
  { id: 'objects', label: 'Benda', thumb: './assets/images/objects/ball.webp' },
  { id: 'alphabets', label: 'Huruf', thumb: './assets/images/alphabets/A.webp' },
  { id: 'numbers', label: 'Angka', thumb: './assets/images/numbers/3.webp' },
  { id: 'shapes', label: 'Bentuk', thumb: './assets/images/shapes/star.webp' },
];

export const FREE_MODES = new Set(['explore', 'quiz', 'puzzle', 'memory']);
export const FREE_CATEGORIES = new Set(['animals', 'colors']);
export const FREE_QUIZ_CHOICES = new Set([2]);
export const FREE_PUZZLE_TYPES = new Set(['jigsaw']);
export const FREE_PUZZLE_LEVELS = new Set([1]);
export const FREE_MEMORY_LEVELS = new Set([1]);

export const wordEntry = (category, id, word, indo, pronun, imageFile = `${id}.webp`) => ({
  id,
  word,
  indo,
  pronun,
  category,
  image: `./assets/images/${category}/${imageFile}`,
  audioWord: `./assets/audio/words/${id}.mp3`,
  audioPrompt: `./assets/audio/prompts/${id}.mp3`,
  audioPraise: `./assets/audio/praise/${id}.mp3`,
});

// Only the free preview subset ships statically in client JS; paid words arrive from /api/catalog after license activation.
export const FREE_WORDS = [
  wordEntry('animals', 'bear', 'Bear', 'beruang', 'ber'),
  wordEntry('animals', 'butterfly', 'Butterfly', 'kupu-kupu', 'BUT-uhr-flai'),
  wordEntry('animals', 'cat', 'Cat', 'kucing', 'kat'),
  wordEntry('animals', 'chicken', 'Chicken', 'ayam', 'CHIK-uhn'),
  wordEntry('animals', 'cow', 'Cow', 'sapi', 'kau'),
  wordEntry('animals', 'dog', 'Dog', 'anjing', 'dog'),
  wordEntry('animals', 'duck', 'Duck', 'bebek', 'dak'),
  wordEntry('animals', 'elephant', 'Elephant', 'gajah', 'EL-uh-funt'),
  wordEntry('animals', 'fish', 'Fish', 'ikan', 'fish'),
  wordEntry('animals', 'frog', 'Frog', 'katak', 'frog'),
  wordEntry('animals', 'giraffe', 'Giraffe', 'jerapah', 'juh-RAF'),
  wordEntry('animals', 'goat', 'Goat', 'kambing', 'gout'),
  wordEntry('animals', 'horse', 'Horse', 'kuda', 'hors'),
  wordEntry('animals', 'lion', 'Lion', 'singa', 'LAI-uhn'),
  wordEntry('animals', 'monkey', 'Monkey', 'monyet', 'MUNG-ki'),
  wordEntry('animals', 'rabbit', 'Rabbit', 'kelinci', 'RAB-it'),
  wordEntry('animals', 'sheep', 'Sheep', 'domba', 'ship'),
  wordEntry('animals', 'tiger', 'Tiger', 'harimau', 'TAI-guhr'),
  wordEntry('animals', 'turtle', 'Turtle', 'kura-kura', 'TUR-tuhl'),
  wordEntry('animals', 'zebra', 'Zebra', 'zebra', 'ZI-bruh'),
  wordEntry('colors', 'black', 'Black', 'hitam', 'blak'),
  wordEntry('colors', 'blue', 'Blue', 'biru', 'blu'),
  wordEntry('colors', 'brown', 'Brown', 'cokelat', 'braun'),
  wordEntry('colors', 'gold', 'Gold', 'emas', 'gould'),
  wordEntry('colors', 'green', 'Green', 'hijau', 'grin'),
  wordEntry('colors', 'grey', 'Grey', 'abu-abu', 'grei'),
  wordEntry('colors', 'color-orange', 'Orange', 'oranye', 'OR-inj', 'orange.webp'),
  wordEntry('colors', 'pink', 'Pink', 'merah muda', 'pingk'),
  wordEntry('colors', 'purple', 'Purple', 'ungu', 'PUR-puhl'),
  wordEntry('colors', 'red', 'Red', 'merah', 'red'),
  wordEntry('colors', 'white', 'White', 'putih', 'wait'),
  wordEntry('colors', 'yellow', 'Yellow', 'kuning', 'YEL-ou'),
];

export const WORDS = [...FREE_WORDS];

export function unlockCatalogWords(fullList) {
  if (!Array.isArray(fullList) || fullList.length <= FREE_WORDS.length) return false;
  const normalized = fullList.map((item) =>
    typeof item?.image === 'string' && item.image.endsWith('.jpg')
      ? { ...item, image: item.image.replace(/\.jpg$/i, '.webp') }
      : item
  );
  WORDS.splice(0, WORDS.length, ...normalized);
  return true;
}

export function resetToFreeWords() {
  WORDS.splice(0, WORDS.length, ...FREE_WORDS);
}

const PLURAL_PROMPT_IDS = new Set(['beans', 'peas', 'noodles', 'teeth']);

export function getPromptText(item) {
  const lower = item.word.toLowerCase();
  if (item.category === 'colors') return `Where is the color ${lower}?`;
  if (item.category === 'alphabets') return `Where is the letter ${item.word}?`;
  if (item.category === 'numbers') return `Where is the number ${lower}?`;
  if (PLURAL_PROMPT_IDS.has(item.id)) return `Where are the ${lower}?`;
  return `Where is the ${lower}?`;
}

export const PRAISE_INTRO_AUDIO = './assets/audio/feedback/Great.wav';

export function getPraiseText(item) {
  return item.category === 'alphabets' ? `Great! Letter ${item.word}!` : `Great! ${item.word}!`;
}

export function getRetryAudio(attemptCount) {
  return attemptCount % 2 === 1
    ? './assets/audio/feedback/try-again.wav'
    : './assets/audio/feedback/almost.wav';
}

export function filterWords(categoryId, list = WORDS) {
  if (!categoryId || categoryId === 'all') return [...list];
  return list.filter((item) => item.category === categoryId);
}

export function shuffle(items, rng = Math.random) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Pick `choiceCount` options for a quiz question, always including `target`.
 * Uses category pool first and fills from `allWords` only if pool is too small.
 */
export function pickQuestionChoices(target, pool, choiceCount = 2, allWords = WORDS, rng = Math.random) {
  const count = Math.max(2, Math.min(4, choiceCount));
  const samePoolDistractors = shuffle(
    pool.filter((w) => w.id !== target.id && w.word !== target.word),
    rng
  );
  const fallbackDistractors = shuffle(
    allWords.filter(
      (w) =>
        w.id !== target.id &&
        w.word !== target.word &&
        !samePoolDistractors.some((p) => p.id === w.id)
    ),
    rng
  );
  const distractors = [...samePoolDistractors, ...fallbackDistractors].slice(0, count - 1);
  return shuffle([target, ...distractors], rng);
}

/**
 * Build a gentle round of questions (up to 5 questions or pool size if smaller).
 */
export function buildQuizRound(pool, choiceCount = 2, roundSize = 5, allWords = WORDS, rng = Math.random) {
  if (!pool.length) return [];
  const targets = shuffle(pool, rng).slice(0, Math.min(roundSize, pool.length));
  return targets.map((target) => ({
    target,
    choices: pickQuestionChoices(target, pool, choiceCount, allWords, rng),
  }));
}

