export const CATEGORIES = [
  { id: 'all', label: 'Semua' },
  { id: 'animals', label: 'Hewan' },
  { id: 'colors', label: 'Warna' },
  { id: 'fruits', label: 'Buah' },
  { id: 'objects', label: 'Benda' },
  { id: 'alphabets', label: 'Huruf' },
  { id: 'numbers', label: 'Angka' },
  { id: 'shapes', label: 'Bentuk' },
];

const entry = (category, id, word, indo, imageFile = `${id}.jpg`) => ({
  id,
  word,
  indo,
  category,
  image: `./assets/images/${category}/${imageFile}`,
  audioWord: `./assets/audio/words/${id}.mp3`,
  audioPrompt: `./assets/audio/prompts/${id}.mp3`,
  audioPraise: `./assets/audio/praise/${id}.mp3`,
});

const NUMBER_ITEMS = [
  [0, 'Zero', 'nol'],
  [1, 'One', 'satu'],
  [2, 'Two', 'dua'],
  [3, 'Three', 'tiga'],
  [4, 'Four', 'empat'],
  [5, 'Five', 'lima'],
  [6, 'Six', 'enam'],
  [7, 'Seven', 'tujuh'],
  [8, 'Eight', 'delapan'],
  [9, 'Nine', 'sembilan'],
  [10, 'Ten', 'sepuluh'],
  [11, 'Eleven', 'sebelas'],
  [12, 'Twelve', 'dua belas'],
  [13, 'Thirteen', 'tiga belas'],
  [14, 'Fourteen', 'empat belas'],
  [15, 'Fifteen', 'lima belas'],
  [16, 'Sixteen', 'enam belas'],
  [17, 'Seventeen', 'tujuh belas'],
  [18, 'Eighteen', 'delapan belas'],
  [19, 'Nineteen', 'sembilan belas'],
  [20, 'Twenty', 'dua puluh'],
  [30, 'Thirty', 'tiga puluh'],
  [40, 'Forty', 'empat puluh'],
  [50, 'Fifty', 'lima puluh'],
  [60, 'Sixty', 'enam puluh'],
  [70, 'Seventy', 'tujuh puluh'],
  [80, 'Eighty', 'delapan puluh'],
  [90, 'Ninety', 'sembilan puluh'],
  [100, 'One hundred', 'seratus'],
];

export const WORDS = [
  // Animals (20)
  entry('animals', 'bear', 'Bear', 'beruang'),
  entry('animals', 'butterfly', 'Butterfly', 'kupu-kupu'),
  entry('animals', 'cat', 'Cat', 'kucing'),
  entry('animals', 'chicken', 'Chicken', 'ayam'),
  entry('animals', 'cow', 'Cow', 'sapi'),
  entry('animals', 'dog', 'Dog', 'anjing'),
  entry('animals', 'duck', 'Duck', 'bebek'),
  entry('animals', 'elephant', 'Elephant', 'gajah'),
  entry('animals', 'fish', 'Fish', 'ikan'),
  entry('animals', 'frog', 'Frog', 'katak'),
  entry('animals', 'giraffe', 'Giraffe', 'jerapah'),
  entry('animals', 'goat', 'Goat', 'kambing'),
  entry('animals', 'horse', 'Horse', 'kuda'),
  entry('animals', 'lion', 'Lion', 'singa'),
  entry('animals', 'monkey', 'Monkey', 'monyet'),
  entry('animals', 'rabbit', 'Rabbit', 'kelinci'),
  entry('animals', 'sheep', 'Sheep', 'domba'),
  entry('animals', 'tiger', 'Tiger', 'harimau'),
  entry('animals', 'turtle', 'Turtle', 'kura-kura'),
  entry('animals', 'zebra', 'Zebra', 'zebra'),

  // Colors (12)
  entry('colors', 'black', 'Black', 'hitam'),
  entry('colors', 'blue', 'Blue', 'biru'),
  entry('colors', 'brown', 'Brown', 'cokelat'),
  entry('colors', 'gold', 'Gold', 'emas'),
  entry('colors', 'green', 'Green', 'hijau'),
  entry('colors', 'grey', 'Grey', 'abu-abu'),
  entry('colors', 'color-orange', 'Orange', 'oranye', 'orange.jpg'),
  entry('colors', 'pink', 'Pink', 'merah muda'),
  entry('colors', 'purple', 'Purple', 'ungu'),
  entry('colors', 'red', 'Red', 'merah'),
  entry('colors', 'white', 'White', 'putih'),
  entry('colors', 'yellow', 'Yellow', 'kuning'),

  // Fruits (20)
  entry('fruits', 'apple', 'Apple', 'apel'),
  entry('fruits', 'avocado', 'Avocado', 'alpukat'),
  entry('fruits', 'banana', 'Banana', 'pisang'),
  entry('fruits', 'blueberry', 'Blueberry', 'bluberi', 'Blueberry.jpg'),
  entry('fruits', 'cherry', 'Cherry', 'ceri'),
  entry('fruits', 'coconut', 'Coconut', 'kelapa'),
  entry('fruits', 'dragon-fruit', 'Dragon fruit', 'buah naga', 'Dragon_fruit.jpg'),
  entry('fruits', 'grape', 'Grape', 'anggur'),
  entry('fruits', 'kiwi', 'Kiwi', 'kiwi'),
  entry('fruits', 'lemon', 'Lemon', 'lemon'),
  entry('fruits', 'mango', 'Mango', 'mangga'),
  entry('fruits', 'mangosteen', 'Mangosteen', 'manggis'),
  entry('fruits', 'melon', 'Melon', 'melon'),
  entry('fruits', 'orange', 'Orange', 'jeruk', 'orange_fruit.jpg'),
  entry('fruits', 'papaya', 'Papaya', 'pepaya'),
  entry('fruits', 'pear', 'Pear', 'pir'),
  entry('fruits', 'pineapple', 'Pineapple', 'nanas'),
  entry('fruits', 'snakefruit', 'Snake fruit', 'salak'),
  entry('fruits', 'strawberry', 'Strawberry', 'stroberi'),
  entry('fruits', 'watermelon', 'Watermelon', 'semangka'),

  // Objects (20)
  entry('objects', 'airplane', 'Airplane', 'pesawat'),
  entry('objects', 'backpack', 'Backpack', 'tas ransel'),
  entry('objects', 'ball', 'Ball', 'bola'),
  entry('objects', 'bicycle', 'Bicycle', 'sepeda'),
  entry('objects', 'book', 'Book', 'buku'),
  entry('objects', 'bus', 'Bus', 'bus'),
  entry('objects', 'car', 'Car', 'mobil'),
  entry('objects', 'chair', 'Chair', 'kursi'),
  entry('objects', 'clock', 'Clock', 'jam'),
  entry('objects', 'cup', 'Cup', 'cangkir'),
  entry('objects', 'hat', 'Hat', 'topi'),
  entry('objects', 'pencil', 'Pencil', 'pensil'),
  entry('objects', 'plate', 'Plate', 'piring'),
  entry('objects', 'shoe', 'Shoe', 'sepatu'),
  entry('objects', 'spoon', 'Spoon', 'sendok'),
  entry('objects', 't-shirt', 'T-shirt', 'kaus'),
  entry('objects', 'table', 'Table', 'meja'),
  entry('objects', 'teddy-bear', 'Teddy bear', 'boneka beruang', 'Teddy_bear.jpg'),
  entry('objects', 'toothbrush', 'Toothbrush', 'sikat gigi'),
  entry('objects', 'umbrella', 'Umbrella', 'payung'),

  // Alphabets (26)
  ...[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((ch) =>
    entry('alphabets', `letter-${ch.toLowerCase()}`, ch, `huruf ${ch}`, `${ch}.jpg`)
  ),

  // Numbers (29)
  ...NUMBER_ITEMS.map(([n, word, indo]) =>
    entry('numbers', `number-${n}`, word, indo, `${n}.jpg`)
  ),

  // Shapes (12)
  entry('shapes', 'circle', 'Circle', 'lingkaran'),
  entry('shapes', 'cross', 'Cross', 'tanda tambah'),
  entry('shapes', 'diamond', 'Diamond', 'belah ketupat'),
  entry('shapes', 'heart', 'Heart', 'hati'),
  entry('shapes', 'hexagon', 'Hexagon', 'segi enam'),
  entry('shapes', 'moon', 'Moon', 'bulan sabit'),
  entry('shapes', 'oval', 'Oval', 'lonjong'),
  entry('shapes', 'pentagon', 'Pentagon', 'segi lima'),
  entry('shapes', 'rectangle', 'Rectangle', 'persegi panjang'),
  entry('shapes', 'square', 'Square', 'persegi'),
  entry('shapes', 'star', 'Star', 'bintang'),
  entry('shapes', 'triangle', 'Triangle', 'segitiga'),
];

export function getPromptText(item) {
  const lower = item.word.toLowerCase();
  if (item.category === 'colors') return `Where is the color ${lower}?`;
  if (item.category === 'alphabets') return `Where is the letter ${item.word}?`;
  if (item.category === 'numbers') return `Where is the number ${lower}?`;
  return `Where is the ${lower}?`;
}

export function getPraiseText(item) {
  return item.category === 'alphabets' ? `Yay! Letter ${item.word}!` : `Yay! ${item.word}!`;
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
  const count = Math.max(2, Math.min(3, choiceCount));
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

