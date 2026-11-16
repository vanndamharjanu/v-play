import { wordEntry, FREE_WORDS } from '../../data/words.js';

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

export const FULL_WORDS = [
  ...FREE_WORDS,

  // Colors (12)
  wordEntry('colors', 'black', 'Black', 'hitam', 'blak'),
  wordEntry('colors', 'blue', 'Blue', 'biru', 'blu'),
  wordEntry('colors', 'brown', 'Brown', 'cokelat', 'braun'),
  wordEntry('colors', 'gold', 'Gold', 'emas', 'gould'),
  wordEntry('colors', 'green', 'Green', 'hijau', 'grin'),
  wordEntry('colors', 'grey', 'Grey', 'abu-abu', 'grei'),
  wordEntry('colors', 'color-orange', 'Orange', 'oranye', 'OR-inj', 'orange.jpg'),
  wordEntry('colors', 'pink', 'Pink', 'merah muda', 'pingk'),
  wordEntry('colors', 'purple', 'Purple', 'ungu', 'PUR-puhl'),
  wordEntry('colors', 'red', 'Red', 'merah', 'red'),
  wordEntry('colors', 'white', 'White', 'putih', 'wait'),
  wordEntry('colors', 'yellow', 'Yellow', 'kuning', 'YEL-ou'),

  // Fruits (20)
  wordEntry('fruits', 'apple', 'Apple', 'apel', 'AP-uhl'),
  wordEntry('fruits', 'avocado', 'Avocado', 'alpukat', 'av-uh-KA-dou'),
  wordEntry('fruits', 'banana', 'Banana', 'pisang', 'buh-NA-nuh'),
  wordEntry('fruits', 'blueberry', 'Blueberry', 'bluberi', 'BLU-ber-i', 'Blueberry.jpg'),
  wordEntry('fruits', 'cherry', 'Cherry', 'ceri', 'CHER-i'),
  wordEntry('fruits', 'coconut', 'Coconut', 'kelapa', 'KOU-kuh-nat'),
  wordEntry('fruits', 'dragon-fruit', 'Dragon fruit', 'buah naga', 'DRAG-uhn frut', 'Dragon_fruit.jpg'),
  wordEntry('fruits', 'grape', 'Grape', 'anggur', 'greip'),
  wordEntry('fruits', 'kiwi', 'Kiwi', 'kiwi', 'KI-wi'),
  wordEntry('fruits', 'lemon', 'Lemon', 'lemon', 'LEM-uhn'),
  wordEntry('fruits', 'mango', 'Mango', 'mangga', 'MANG-gou'),
  wordEntry('fruits', 'mangosteen', 'Mangosteen', 'manggis', 'MANG-guh-stin'),
  wordEntry('fruits', 'melon', 'Melon', 'melon', 'MEL-uhn'),
  wordEntry('fruits', 'orange', 'Orange', 'jeruk', 'OR-inj', 'orange_fruit.jpg'),
  wordEntry('fruits', 'papaya', 'Papaya', 'pepaya', 'puh-PAI-uh'),
  wordEntry('fruits', 'pear', 'Pear', 'pir', 'per'),
  wordEntry('fruits', 'pineapple', 'Pineapple', 'nanas', 'PAI-nap-uhl'),
  wordEntry('fruits', 'snakefruit', 'Snake fruit', 'salak', 'SNEIK frut'),
  wordEntry('fruits', 'strawberry', 'Strawberry', 'stroberi', 'STRO-ber-i'),
  wordEntry('fruits', 'watermelon', 'Watermelon', 'semangka', 'WO-tuhr-mel-uhn'),

  // Objects (20)
  wordEntry('objects', 'airplane', 'Airplane', 'pesawat', 'ER-plein'),
  wordEntry('objects', 'backpack', 'Backpack', 'tas ransel', 'BAK-pak'),
  wordEntry('objects', 'ball', 'Ball', 'bola', 'bol'),
  wordEntry('objects', 'bicycle', 'Bicycle', 'sepeda', 'BAI-si-kuhl'),
  wordEntry('objects', 'book', 'Book', 'buku', 'buk'),
  wordEntry('objects', 'bus', 'Bus', 'bus', 'bas'),
  wordEntry('objects', 'car', 'Car', 'mobil', 'kar'),
  wordEntry('objects', 'chair', 'Chair', 'kursi', 'cher'),
  wordEntry('objects', 'clock', 'Clock', 'jam', 'klok'),
  wordEntry('objects', 'cup', 'Cup', 'cangkir', 'kap'),
  wordEntry('objects', 'hat', 'Hat', 'topi', 'hat'),
  wordEntry('objects', 'pencil', 'Pencil', 'pensil', 'PEN-suhl'),
  wordEntry('objects', 'plate', 'Plate', 'piring', 'pleit'),
  wordEntry('objects', 'shoe', 'Shoe', 'sepatu', 'shu'),
  wordEntry('objects', 'spoon', 'Spoon', 'sendok', 'spun'),
  wordEntry('objects', 't-shirt', 'T-shirt', 'kaus', 'TI-shurt'),
  wordEntry('objects', 'table', 'Table', 'meja', 'TEI-buhl'),
  wordEntry('objects', 'teddy-bear', 'Teddy bear', 'boneka beruang', 'TED-i ber', 'Teddy_bear.jpg'),
  wordEntry('objects', 'toothbrush', 'Toothbrush', 'sikat gigi', 'TUTH-brash'),
  wordEntry('objects', 'umbrella', 'Umbrella', 'payung', 'am-BREL-uh'),

  // Alphabets (26)
  ...[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((ch) =>
    wordEntry('alphabets', `letter-${ch.toLowerCase()}`, ch, `huruf ${ch}`, ALPHABET_PRONUN[ch], `${ch}.jpg`)
  ),

  // Numbers (29)
  ...NUMBER_ITEMS.map(([n, word, indo, pronun]) =>
    wordEntry('numbers', `number-${n}`, word, indo, pronun, `${n}.jpg`)
  ),

  // Shapes (12)
  wordEntry('shapes', 'circle', 'Circle', 'lingkaran', 'SUR-kuhl'),
  wordEntry('shapes', 'cross', 'Cross', 'tanda tambah', 'kros'),
  wordEntry('shapes', 'diamond', 'Diamond', 'belah ketupat', 'DAI-uh-muhnd'),
  wordEntry('shapes', 'heart', 'Heart', 'hati', 'hart'),
  wordEntry('shapes', 'hexagon', 'Hexagon', 'segi enam', 'HEK-suh-gon'),
  wordEntry('shapes', 'moon', 'Moon', 'bulan sabit', 'mun'),
  wordEntry('shapes', 'oval', 'Oval', 'lonjong', 'OU-vuhl'),
  wordEntry('shapes', 'pentagon', 'Pentagon', 'segi lima', 'PEN-tuh-gon'),
  wordEntry('shapes', 'rectangle', 'Rectangle', 'persegi panjang', 'REK-tang-guhl'),
  wordEntry('shapes', 'square', 'Square', 'persegi', 'skwer'),
  wordEntry('shapes', 'star', 'Star', 'bintang', 'star'),
  wordEntry('shapes', 'triangle', 'Triangle', 'segitiga', 'TRAI-ang-guhl'),
];
