export const CATEGORIES = [
  { id: 'all', label: 'Semua', thumb: null },
  { id: 'animals', label: 'Hewan', thumb: './assets/images/animals/cat.jpg' },
  { id: 'colors', label: 'Warna', thumb: './assets/images/colors/red.jpg' },
  { id: 'fruits', label: 'Buah', thumb: './assets/images/fruits/apple.jpg' },
  { id: 'objects', label: 'Benda', thumb: './assets/images/objects/ball.jpg' },
  { id: 'alphabets', label: 'Huruf', thumb: './assets/images/alphabets/A.jpg' },
  { id: 'numbers', label: 'Angka', thumb: './assets/images/numbers/3.jpg' },
  { id: 'shapes', label: 'Bentuk', thumb: './assets/images/shapes/star.jpg' },
];

const entry = (category, id, word, indo, pronun, imageFile = `${id}.jpg`) => ({
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

const ALPHABET_PRONUN = {
  A: 'ei', B: 'bi', C: 'si', D: 'di', E: 'i', F: 'ef', G: 'ji',
  H: 'eich', I: 'ai', J: 'jei', K: 'kei', L: 'el', M: 'em', N: 'en',
  O: 'ou', P: 'pi', Q: 'kyu', R: 'ar', S: 'es', T: 'ti', U: 'yu',
  V: 'vi', W: 'DAB-ul-yu', X: 'eks', Y: 'wai', Z: 'zi',
};

const NUMBER_ITEMS = [
  [0, 'Zero', 'nol', 'ZI-rou'],
  [1, 'One', 'satu', 'wan'],
  [2, 'Two', 'dua', 'tu'],
  [3, 'Three', 'tiga', 'thri'],
  [4, 'Four', 'empat', 'for'],
  [5, 'Five', 'lima', 'faiv'],
  [6, 'Six', 'enam', 'siks'],
  [7, 'Seven', 'tujuh', 'SEV-uhn'],
  [8, 'Eight', 'delapan', 'eit'],
  [9, 'Nine', 'sembilan', 'nain'],
  [10, 'Ten', 'sepuluh', 'ten'],
  [11, 'Eleven', 'sebelas', 'ih-LEV-uhn'],
  [12, 'Twelve', 'dua belas', 'twelv'],
  [13, 'Thirteen', 'tiga belas', 'thur-TEEN'],
  [14, 'Fourteen', 'empat belas', 'for-TEEN'],
  [15, 'Fifteen', 'lima belas', 'fif-TEEN'],
  [16, 'Sixteen', 'enam belas', 'siks-TEEN'],
  [17, 'Seventeen', 'tujuh belas', 'sev-uhn-TEEN'],
  [18, 'Eighteen', 'delapan belas', 'ei-TEEN'],
  [19, 'Nineteen', 'sembilan belas', 'nain-TEEN'],
  [20, 'Twenty', 'dua puluh', 'TWEN-ti'],
  [30, 'Thirty', 'tiga puluh', 'THUR-ti'],
  [40, 'Forty', 'empat puluh', 'FOR-ti'],
  [50, 'Fifty', 'lima puluh', 'FIF-ti'],
  [60, 'Sixty', 'enam puluh', 'SIKS-ti'],
  [70, 'Seventy', 'tujuh puluh', 'SEV-uhn-ti'],
  [80, 'Eighty', 'delapan puluh', 'EI-ti'],
  [90, 'Ninety', 'sembilan puluh', 'NAIN-ti'],
  [100, 'One hundred', 'seratus', 'wan HUN-druhd'],
];

export const WORDS = [
  // Animals (20)
  entry('animals', 'bear', 'Bear', 'beruang', 'ber'),
  entry('animals', 'butterfly', 'Butterfly', 'kupu-kupu', 'BUT-uhr-flai'),
  entry('animals', 'cat', 'Cat', 'kucing', 'kat'),
  entry('animals', 'chicken', 'Chicken', 'ayam', 'CHIK-uhn'),
  entry('animals', 'cow', 'Cow', 'sapi', 'kau'),
  entry('animals', 'dog', 'Dog', 'anjing', 'dog'),
  entry('animals', 'duck', 'Duck', 'bebek', 'dak'),
  entry('animals', 'elephant', 'Elephant', 'gajah', 'EL-uh-funt'),
  entry('animals', 'fish', 'Fish', 'ikan', 'fish'),
  entry('animals', 'frog', 'Frog', 'katak', 'frog'),
  entry('animals', 'giraffe', 'Giraffe', 'jerapah', 'juh-RAF'),
  entry('animals', 'goat', 'Goat', 'kambing', 'gout'),
  entry('animals', 'horse', 'Horse', 'kuda', 'hors'),
  entry('animals', 'lion', 'Lion', 'singa', 'LAI-uhn'),
  entry('animals', 'monkey', 'Monkey', 'monyet', 'MUNG-ki'),
  entry('animals', 'rabbit', 'Rabbit', 'kelinci', 'RAB-it'),
  entry('animals', 'sheep', 'Sheep', 'domba', 'ship'),
  entry('animals', 'tiger', 'Tiger', 'harimau', 'TAI-guhr'),
  entry('animals', 'turtle', 'Turtle', 'kura-kura', 'TUR-tuhl'),
  entry('animals', 'zebra', 'Zebra', 'zebra', 'ZI-bruh'),

  // Colors (12)
  entry('colors', 'black', 'Black', 'hitam', 'blak'),
  entry('colors', 'blue', 'Blue', 'biru', 'blu'),
  entry('colors', 'brown', 'Brown', 'cokelat', 'braun'),
  entry('colors', 'gold', 'Gold', 'emas', 'gould'),
  entry('colors', 'green', 'Green', 'hijau', 'grin'),
  entry('colors', 'grey', 'Grey', 'abu-abu', 'grei'),
  entry('colors', 'color-orange', 'Orange', 'oranye', 'OR-inj', 'orange.jpg'),
  entry('colors', 'pink', 'Pink', 'merah muda', 'pingk'),
  entry('colors', 'purple', 'Purple', 'ungu', 'PUR-puhl'),
  entry('colors', 'red', 'Red', 'merah', 'red'),
  entry('colors', 'white', 'White', 'putih', 'wait'),
  entry('colors', 'yellow', 'Yellow', 'kuning', 'YEL-ou'),

  // Fruits (20)
  entry('fruits', 'apple', 'Apple', 'apel', 'AP-uhl'),
  entry('fruits', 'avocado', 'Avocado', 'alpukat', 'av-uh-KA-dou'),
  entry('fruits', 'banana', 'Banana', 'pisang', 'buh-NA-nuh'),
  entry('fruits', 'blueberry', 'Blueberry', 'bluberi', 'BLU-ber-i', 'Blueberry.jpg'),
  entry('fruits', 'cherry', 'Cherry', 'ceri', 'CHER-i'),
  entry('fruits', 'coconut', 'Coconut', 'kelapa', 'KOU-kuh-nat'),
  entry('fruits', 'dragon-fruit', 'Dragon fruit', 'buah naga', 'DRAG-uhn frut', 'Dragon_fruit.jpg'),
  entry('fruits', 'grape', 'Grape', 'anggur', 'greip'),
  entry('fruits', 'kiwi', 'Kiwi', 'kiwi', 'KI-wi'),
  entry('fruits', 'lemon', 'Lemon', 'lemon', 'LEM-uhn'),
  entry('fruits', 'mango', 'Mango', 'mangga', 'MANG-gou'),
  entry('fruits', 'mangosteen', 'Mangosteen', 'manggis', 'MANG-guh-stin'),
  entry('fruits', 'melon', 'Melon', 'melon', 'MEL-uhn'),
  entry('fruits', 'orange', 'Orange', 'jeruk', 'OR-inj', 'orange_fruit.jpg'),
  entry('fruits', 'papaya', 'Papaya', 'pepaya', 'puh-PAI-uh'),
  entry('fruits', 'pear', 'Pear', 'pir', 'per'),
  entry('fruits', 'pineapple', 'Pineapple', 'nanas', 'PAI-nap-uhl'),
  entry('fruits', 'snakefruit', 'Snake fruit', 'salak', 'SNEIK frut'),
  entry('fruits', 'strawberry', 'Strawberry', 'stroberi', 'STRO-ber-i'),
  entry('fruits', 'watermelon', 'Watermelon', 'semangka', 'WO-tuhr-mel-uhn'),

  // Objects (20)
  entry('objects', 'airplane', 'Airplane', 'pesawat', 'ER-plein'),
  entry('objects', 'backpack', 'Backpack', 'tas ransel', 'BAK-pak'),
  entry('objects', 'ball', 'Ball', 'bola', 'bol'),
  entry('objects', 'bicycle', 'Bicycle', 'sepeda', 'BAI-si-kuhl'),
  entry('objects', 'book', 'Book', 'buku', 'buk'),
  entry('objects', 'bus', 'Bus', 'bus', 'bas'),
  entry('objects', 'car', 'Car', 'mobil', 'kar'),
  entry('objects', 'chair', 'Chair', 'kursi', 'cher'),
  entry('objects', 'clock', 'Clock', 'jam', 'klok'),
  entry('objects', 'cup', 'Cup', 'cangkir', 'kap'),
  entry('objects', 'hat', 'Hat', 'topi', 'hat'),
  entry('objects', 'pencil', 'Pencil', 'pensil', 'PEN-suhl'),
  entry('objects', 'plate', 'Plate', 'piring', 'pleit'),
  entry('objects', 'shoe', 'Shoe', 'sepatu', 'shu'),
  entry('objects', 'spoon', 'Spoon', 'sendok', 'spun'),
  entry('objects', 't-shirt', 'T-shirt', 'kaus', 'TI-shurt'),
  entry('objects', 'table', 'Table', 'meja', 'TEI-buhl'),
  entry('objects', 'teddy-bear', 'Teddy bear', 'boneka beruang', 'TED-i ber', 'Teddy_bear.jpg'),
  entry('objects', 'toothbrush', 'Toothbrush', 'sikat gigi', 'TUTH-brash'),
  entry('objects', 'umbrella', 'Umbrella', 'payung', 'am-BREL-uh'),

  // Alphabets (26)
  ...[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((ch) =>
    entry('alphabets', `letter-${ch.toLowerCase()}`, ch, `huruf ${ch}`, ALPHABET_PRONUN[ch], `${ch}.jpg`)
  ),

  // Numbers (29)
  ...NUMBER_ITEMS.map(([n, word, indo, pronun]) =>
    entry('numbers', `number-${n}`, word, indo, pronun, `${n}.jpg`)
  ),

  // Shapes (12)
  entry('shapes', 'circle', 'Circle', 'lingkaran', 'SUR-kuhl'),
  entry('shapes', 'cross', 'Cross', 'tanda tambah', 'kros'),
  entry('shapes', 'diamond', 'Diamond', 'belah ketupat', 'DAI-uh-muhnd'),
  entry('shapes', 'heart', 'Heart', 'hati', 'hart'),
  entry('shapes', 'hexagon', 'Hexagon', 'segi enam', 'HEK-suh-gon'),
  entry('shapes', 'moon', 'Moon', 'bulan sabit', 'mun'),
  entry('shapes', 'oval', 'Oval', 'lonjong', 'OU-vuhl'),
  entry('shapes', 'pentagon', 'Pentagon', 'segi lima', 'PEN-tuh-gon'),
  entry('shapes', 'rectangle', 'Rectangle', 'persegi panjang', 'REK-tang-guhl'),
  entry('shapes', 'square', 'Square', 'persegi', 'skwer'),
  entry('shapes', 'star', 'Star', 'bintang', 'star'),
  entry('shapes', 'triangle', 'Triangle', 'segitiga', 'TRAI-ang-guhl'),
];

export function getPromptText(item) {
  const lower = item.word.toLowerCase();
  if (item.category === 'colors') return `Where is the color ${lower}?`;
  if (item.category === 'alphabets') return `Where is the letter ${item.word}?`;
  if (item.category === 'numbers') return `Where is the number ${lower}?`;
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

