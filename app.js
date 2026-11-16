import {
  CATEGORIES,
  WORDS,
  FREE_MODES,
  FREE_CATEGORIES,
  filterWords,
  buildQuizRound,
  getPromptText,
  getPraiseText,
  PRAISE_INTRO_AUDIO,
  getRetryAudio,
  unlockCatalogWords,
  resetToFreeWords,
} from './data/words.js';
import { AudioController } from './audio.js';
import { createPuzzleController } from './puzzle.js';
import { createGamesController } from './games.js';

const LICENSE_STORAGE_KEY = 'funplay_license_v1';
const DEVICE_STORAGE_KEY = 'funplay_device_v1';

const state = {
  mode: 'explore', // 'explore' | 'quiz' | 'puzzle' | 'memory' | 'counting' | 'odd'
  category: 'animals',
  unlocked: false,
  licenseToken: '',
  usedDevices: 0,
  maxDevices: 3,
  pendingAction: null,
  spotlightMode: false,
  spotlightIndex: 0,
  playingWordId: null,
  muted: false,
  quizChoiceCount: 2,
  showWordClue: false,
  quizRound: [],
  quizIndex: 0,
  quizSolved: false,
  quizTriedIds: new Set(),
};

const els = {
  introBar: document.getElementById('intro-bar'),
  menuCollapseBtn: document.getElementById('menu-collapse-btn'),
  menuActiveLabel: document.getElementById('menu-active-label'),
  menuCollapseAction: document.getElementById('menu-collapse-action'),
  licenseTriggerBtn: document.getElementById('license-trigger-btn'),
  licenseTriggerLabel: document.getElementById('license-trigger-label'),
  licenseDialog: document.getElementById('license-dialog'),
  licenseCloseBtn: document.getElementById('license-close-btn'),
  licenseSummary: document.getElementById('license-summary'),
  licenseForm: document.getElementById('license-form'),
  licenseCodeInput: document.getElementById('license-code-input'),
  licenseActivateBtn: document.getElementById('license-activate-btn'),
  licenseStatus: document.getElementById('license-status'),
  licenseBuyLink: document.getElementById('license-buy-link'),
  licenseBuyHint: document.getElementById('license-buy-hint'),
  licenseRecoverForm: document.getElementById('license-recover-form'),
  licenseEmailInput: document.getElementById('license-email-input'),
  licenseRecoverBtn: document.getElementById('license-recover-btn'),
  licenseRecoverStatus: document.getElementById('license-recover-status'),
  soundToggle: document.getElementById('sound-toggle'),
  soundToggleLabel: document.getElementById('sound-toggle-label'),
  tabExplore: document.getElementById('tab-explore'),
  tabQuiz: document.getElementById('tab-quiz'),
  tabPuzzle: document.getElementById('tab-puzzle'),
  tabMemory: document.getElementById('tab-memory'),
  tabCounting: document.getElementById('tab-counting'),
  tabOdd: document.getElementById('tab-odd'),
  panelExplore: document.getElementById('panel-explore'),
  panelQuiz: document.getElementById('panel-quiz'),
  panelPuzzle: document.getElementById('panel-puzzle'),
  panelGames: document.getElementById('panel-games'),
  modeHint: document.getElementById('mode-hint'),
  audioBanner: document.getElementById('audio-banner'),
  audioBannerText: document.getElementById('audio-banner-text'),
  audioRetryBtn: document.getElementById('audio-retry-btn'),
  srAnnouncer: document.getElementById('sr-announcer'),
  categoryList: document.getElementById('category-list'),
  viewModeBtn: document.getElementById('view-mode-btn'),
  viewModeLabel: document.getElementById('view-mode-label'),
  exploreGrid: document.getElementById('explore-grid'),
  exploreSpotlight: document.getElementById('explore-spotlight'),
  spotlightCounter: document.getElementById('spotlight-counter'),
  spotlightCard: document.getElementById('spotlight-card'),
  spotlightImg: document.getElementById('spotlight-img'),
  spotlightWord: document.getElementById('spotlight-word'),
  spotlightPronun: document.getElementById('spotlight-pronun'),
  spotlightIndo: document.getElementById('spotlight-indo'),
  spotlightPrev: document.getElementById('spotlight-prev'),
  spotlightPlay: document.getElementById('spotlight-play'),
  spotlightNext: document.getElementById('spotlight-next'),
  exploreEmpty: document.getElementById('explore-empty'),
  resetCategoryBtn: document.getElementById('reset-category-btn'),
  choice2Btn: document.getElementById('choice-2-btn'),
  choice3Btn: document.getElementById('choice-3-btn'),
  showWordToggle: document.getElementById('show-word-toggle'),
  quizStage: document.getElementById('quiz-stage'),
  quizProgress: document.getElementById('quiz-progress'),
  quizQuestionText: document.getElementById('quiz-question-text'),
  quizWordClue: document.getElementById('quiz-word-clue'),
  quizPlayBtn: document.getElementById('quiz-play-btn'),
  quizPlayLabel: document.getElementById('quiz-play-label'),
  quizChoices: document.getElementById('quiz-choices'),
  quizFeedback: document.getElementById('quiz-feedback'),
  quizFeedbackText: document.getElementById('quiz-feedback-text'),
  quizNextBtn: document.getElementById('quiz-next-btn'),
  quizComplete: document.getElementById('quiz-complete'),
  completeWords: document.getElementById('complete-words'),
  quizRestartBtn: document.getElementById('quiz-restart-btn'),
  quizBackExploreBtn: document.getElementById('quiz-back-explore-btn'),
};

let lastAudioAction = null;
let puzzle = null;
let games = null;

function announce(message) {
  els.srAnnouncer.textContent = '';
  requestAnimationFrame(() => {
    els.srAnnouncer.textContent = message;
  });
}

const audio = new AudioController({
  onStateChange: ({ status, message }) => {
    const spotlightLabel = els.spotlightPlay.querySelector('span');
    if (puzzle) puzzle.updateAudioStatus(status);
    if (games) games.updateAudioStatus(status);
    if (status === 'idle') {
      state.playingWordId = null;
      els.audioBanner.hidden = true;
      els.quizPlayLabel.textContent = 'Putar suara';
      if (spotlightLabel) spotlightLabel.textContent = 'Dengar';
      els.quizPlayBtn.removeAttribute('aria-busy');
      updatePlayingHighlights();
    } else if (status === 'loading') {
      els.audioBanner.hidden = true;
      els.quizPlayLabel.textContent = 'Memuat suara...';
      if (spotlightLabel) spotlightLabel.textContent = 'Memuat...';
      els.quizPlayBtn.setAttribute('aria-busy', 'true');
      updatePlayingHighlights();
    } else if (status === 'playing') {
      els.audioBanner.hidden = true;
      els.quizPlayLabel.textContent = 'Sedang bersuara...';
      if (spotlightLabel) spotlightLabel.textContent = 'Bersuara...';
      els.quizPlayBtn.removeAttribute('aria-busy');
      updatePlayingHighlights();
    } else if (status === 'blocked' || status === 'error') {
      state.playingWordId = null;
      els.quizPlayLabel.textContent = 'Putar suara';
      if (spotlightLabel) spotlightLabel.textContent = 'Dengar';
      els.quizPlayBtn.removeAttribute('aria-busy');
      updatePlayingHighlights();
      els.audioBannerText.textContent = message;
      els.audioBanner.hidden = false;
    }
  },
});

function getFilteredWords() {
  return filterWords(state.category, WORDS);
}

function playWordClip(item) {
  state.playingWordId = item.id;
  lastAudioAction = () => playWordClip(item);
  updatePlayingHighlights();
  announce(`${item.word}, ${item.indo}`);
  audio.playVoice(item.audioWord, item.word, { chime: 'tap' });
}

function playPromptClip(item) {
  state.playingWordId = item.id;
  lastAudioAction = () => playPromptClip(item);
  const prompt = getPromptText(item);
  announce(prompt);
  audio.playVoice(item.audioPrompt, prompt);
}

function updatePlayingHighlights() {
  const cards = els.exploreGrid.querySelectorAll('.word-card');
  for (const card of cards) {
    const active = card.dataset.wordId === state.playingWordId;
    card.classList.toggle('is-playing', active);
    const tag = card.querySelector('.card-audio-tag');
    if (tag) tag.hidden = !active;
  }
  const activeSpotlight =
    state.spotlightMode &&
    getFilteredWords()[state.spotlightIndex]?.id === state.playingWordId;
  els.spotlightCard.classList.toggle('is-playing', Boolean(activeSpotlight));
}

function renderCategories() {
  els.categoryList.innerHTML = '';
  for (const cat of CATEGORIES) {
    const locked = !state.unlocked && !FREE_CATEGORIES.has(cat.id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'category-chip';
    btn.classList.toggle('is-locked', locked);
    btn.setAttribute('aria-pressed', String(state.category === cat.id));
    if (locked) {
      btn.setAttribute('aria-label', `${cat.label}, perlu kode lisensi`);
    }

    const thumb = document.createElement('span');
    thumb.className = 'cat-thumb';
    thumb.setAttribute('aria-hidden', 'true');
    if (cat.thumb) {
      const img = document.createElement('img');
      img.src = cat.thumb;
      img.alt = '';
      img.width = 512;
      img.height = 512;
      img.decoding = 'async';
      thumb.appendChild(img);
    } else {
      thumb.innerHTML =
        '<svg width="18" height="18" viewBox="0 0 20 20" fill="none">' +
        '<rect x="2" y="2" width="7" height="7" rx="2.5" fill="#34C5D9"/>' +
        '<rect x="11" y="2" width="7" height="7" rx="2.5" fill="#F472B0"/>' +
        '<rect x="2" y="11" width="7" height="7" rx="2.5" fill="#86DC62"/>' +
        '<rect x="11" y="11" width="7" height="7" rx="2.5" fill="#FFD166"/>' +
        '</svg>';
    }

    const label = document.createElement('span');
    label.className = 'cat-label';
    label.textContent = cat.label;

    btn.append(thumb, label);
    if (locked) {
      const lockTag = document.createElement('span');
      lockTag.className = 'cat-lock';
      lockTag.setAttribute('aria-hidden', 'true');
      lockTag.innerHTML =
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
        '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
      btn.appendChild(lockTag);
    }

    btn.addEventListener('click', () => {
      if (locked) {
        openLicenseModal({ type: 'category', value: cat.id });
        return;
      }
      state.category = cat.id;
      state.spotlightIndex = 0;
      renderCategories();
      renderActiveMode({ autoPlay: true });
    });
    els.categoryList.appendChild(btn);
  }
}

function renderExplore() {
  const items = getFilteredWords();

  if (items.length === 0) {
    els.exploreGrid.hidden = true;
    els.exploreSpotlight.hidden = true;
    els.exploreEmpty.hidden = false;
    return;
  }

  els.exploreEmpty.hidden = true;

  if (state.spotlightMode) {
    els.exploreGrid.hidden = true;
    els.exploreSpotlight.hidden = false;
    if (state.spotlightIndex >= items.length) state.spotlightIndex = 0;
    const current = items[state.spotlightIndex];
    els.spotlightCounter.textContent = `${state.spotlightIndex + 1} dari ${items.length}`;
    els.spotlightImg.src = current.image;
    els.spotlightImg.alt = `${current.word} (${current.indo})`;
    els.spotlightWord.textContent = current.word;
    els.spotlightPronun.textContent = `(${current.pronun})`;
    els.spotlightIndo.textContent = current.indo;
    els.spotlightCard.setAttribute('aria-label', `Dengarkan kata ${current.word}`);
    updatePlayingHighlights();
    return;
  }

  els.exploreSpotlight.hidden = true;
  els.exploreGrid.hidden = false;
  els.exploreGrid.innerHTML = '';

  items.forEach((item, index) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'word-card';
    card.dataset.wordId = item.id;
    card.setAttribute('aria-label', `${item.word}, ${item.indo}. Ketuk untuk mendengar suara`);

    const art = document.createElement('span');
    art.className = 'card-art';
    const img = document.createElement('img');
    img.src = item.image;
    img.alt = item.word;
    img.width = 512;
    img.height = 512;
    if (index === 0) {
      img.setAttribute('fetchpriority', 'high');
    } else {
      img.decoding = 'async';
      if (index >= 8) img.loading = 'lazy';
    }
    art.appendChild(img);

    const tag = document.createElement('span');
    tag.className = 'card-audio-tag';
    tag.hidden = state.playingWordId !== item.id;
    tag.textContent = 'Bersuara';

    const wordSpan = document.createElement('span');
    wordSpan.className = 'card-word';
    wordSpan.lang = 'en';
    wordSpan.textContent = item.word;

    const pronunSpan = document.createElement('span');
    pronunSpan.className = 'card-pronun';
    pronunSpan.textContent = `(${item.pronun})`;

    const indoSpan = document.createElement('span');
    indoSpan.className = 'card-indo';
    indoSpan.textContent = item.indo;

    card.append(tag, art, wordSpan, pronunSpan, indoSpan);
    card.addEventListener('click', () => playWordClip(item));
    els.exploreGrid.appendChild(card);
  });
}

function startQuizRound({ autoPlay = false } = {}) {
  const pool = getFilteredWords();
  state.quizRound = buildQuizRound(pool, state.quizChoiceCount, 5, WORDS);
  state.quizIndex = 0;
  state.quizSolved = false;
  state.quizTriedIds = new Set();

  els.quizComplete.hidden = true;
  els.quizStage.hidden = false;
  renderQuizQuestion({ autoPlay });
}

function renderQuizQuestion({ autoPlay = false } = {}) {
  if (state.quizIndex >= state.quizRound.length) {
    renderQuizComplete();
    return;
  }

  const question = state.quizRound[state.quizIndex];
  state.quizSolved = false;
  state.quizTriedIds = new Set();

  els.quizProgress.textContent = `Pertanyaan ${state.quizIndex + 1} dari ${state.quizRound.length}`;
  els.quizWordClue.textContent = question.target.word;
  els.quizWordClue.hidden = !state.showWordClue;

  els.quizFeedback.hidden = true;
  els.quizFeedback.className = 'quiz-feedback';
  els.quizNextBtn.hidden = true;

  els.quizChoices.className = `quiz-choices count-${question.choices.length}`;
  els.quizChoices.innerHTML = '';

  for (const option of question.choices) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'quiz-choice-card';
    btn.dataset.wordId = option.id;
    btn.setAttribute('aria-label', `Pilih gambar ${option.word}`);

    const art = document.createElement('span');
    art.className = 'card-art';
    const img = document.createElement('img');
    img.src = option.image;
    img.alt = option.word;
    img.width = 512;
    img.height = 512;
    art.appendChild(img);

    const badge = document.createElement('span');
    badge.className = 'quiz-choice-badge';
    badge.hidden = true;

    btn.append(art, badge);
    btn.addEventListener('click', () => handleQuizChoice(option, question.target));
    els.quizChoices.appendChild(btn);
  }

  if (autoPlay && !state.muted) {
    playPromptClip(question.target);
  }
}

function handleQuizChoice(picked, target) {
  if (state.quizSolved) return;

  if (picked.id === target.id) {
    state.quizSolved = true;
    const praise = getPraiseText(target);
    const praiseAudio = [PRAISE_INTRO_AUDIO, target.audioWord];
    lastAudioAction = () => audio.playVoice(praiseAudio, praise, { chime: 'success' });
    audio.playVoice(praiseAudio, praise, { chime: 'success' });

    for (const card of els.quizChoices.querySelectorAll('.quiz-choice-card')) {
      const id = card.dataset.wordId;
      if (id === target.id) {
        card.classList.add('is-correct');
        const badge = card.querySelector('.quiz-choice-badge');
        badge.textContent = `${target.word} (${target.indo})`;
        badge.classList.add('correct');
        badge.hidden = false;
      } else {
        card.disabled = true;
        card.classList.add('is-tried');
      }
    }

    els.quizFeedback.hidden = false;
    els.quizFeedback.className = 'quiz-feedback is-correct';
    els.quizFeedbackText.textContent = `Benar, itu gambar ${target.word} (${target.indo}).`;
    els.quizNextBtn.hidden = false;
    els.quizNextBtn.textContent =
      state.quizIndex + 1 >= state.quizRound.length ? 'Lihat hasil' : 'Lanjut';
    announce(`Benar, itu gambar ${target.word}`);
    revealFeedback(els.quizFeedback);
    return;
  }

  // Gentle retry without harsh punishment
  state.quizTriedIds.add(picked.id);
  const pickedCard = els.quizChoices.querySelector(`[data-word-id="${picked.id}"]`);
  if (pickedCard) {
    pickedCard.classList.add('is-tried');
    pickedCard.disabled = true;
  }

  const retryFile = getRetryAudio(state.quizTriedIds.size);
  lastAudioAction = () => audio.playVoice(retryFile, 'Oops, try again!', { chime: 'retry' });
  audio.playVoice(retryFile, 'Oops, try again!', { chime: 'retry' });

  els.quizFeedback.hidden = false;
  els.quizFeedback.className = 'quiz-feedback is-retry';
  els.quizFeedbackText.textContent = `Itu gambar ${picked.word} (${picked.indo}). Coba cari gambar yang disebut suara.`;
  els.quizNextBtn.hidden = true;
  announce(`Belum tepat, itu ${picked.word}. Coba lagi.`);
  revealFeedback(els.quizFeedback);
}

function renderCompleteWords(container, words, onSpeak) {
  container.innerHTML = '';
  for (const w of words) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'complete-chip';
    chip.setAttribute('aria-label', `${w.word}, ${w.indo}. Ketuk untuk mendengar lagi`);

    const art = document.createElement('span');
    art.className = 'complete-chip-art';
    art.setAttribute('aria-hidden', 'true');
    const img = document.createElement('img');
    img.src = w.image;
    img.alt = '';
    img.width = 512;
    img.height = 512;
    img.decoding = 'async';
    art.appendChild(img);

    const copy = document.createElement('span');
    copy.className = 'complete-chip-copy';

    const wordEl = document.createElement('span');
    wordEl.className = 'complete-chip-word';
    wordEl.lang = 'en';
    wordEl.textContent = w.word;

    const pronunEl = document.createElement('span');
    pronunEl.className = 'complete-chip-pronun';
    pronunEl.textContent = `(${w.pronun})`;

    const indoEl = document.createElement('span');
    indoEl.className = 'complete-chip-indo';
    indoEl.textContent = w.indo;

    copy.append(wordEl, pronunEl, indoEl);
    chip.append(art, copy);
    chip.addEventListener('click', () => onSpeak(w));
    container.appendChild(chip);
  }
}

function renderQuizComplete() {
  els.quizStage.hidden = true;
  els.quizComplete.hidden = false;
  renderCompleteWords(
    els.completeWords,
    state.quizRound.map((roundItem) => roundItem.target),
    playWordClip
  );
  announce('Hebat, selesai 5 gambar');
}

function renderActiveMode({ autoPlay = false } = {}) {
  if (state.mode === 'explore') {
    renderExplore();
  } else if (state.mode === 'quiz') {
    startQuizRound({ autoPlay });
  } else if (state.mode === 'puzzle') {
    if (puzzle) puzzle.startRound({ autoPlay });
  } else if (games) {
    games.startRound(state.mode, { autoPlay });
  }
}

const MODE_LABELS = {
  explore: 'Sentuh & Dengar',
  quiz: 'Tebak Gambar',
  puzzle: 'Puzzle',
  memory: 'Kartu Memori',
  counting: 'Hitung Gambar',
  odd: 'Cari yang Berbeda',
};

function setMenuCollapsed(collapsed) {
  els.introBar.classList.toggle('is-menu-collapsed', collapsed);
  els.menuCollapseBtn.setAttribute('aria-expanded', String(!collapsed));
  els.menuCollapseAction.textContent = collapsed ? 'Ganti menu' : 'Tutup menu';
}

function focusStage(stageEl) {
  if (!stageEl || stageEl.hidden || typeof stageEl.getBoundingClientRect !== 'function') return;
  const rect = stageEl.getBoundingClientRect();
  const vh = window.innerHeight || 800;
  if (rect.top < 8 || rect.top > vh * 0.55) {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (typeof stageEl.scrollIntoView === 'function') {
      stageEl.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    }
  }
}

function revealFeedback(feedbackEl) {
  if (!feedbackEl || feedbackEl.hidden || typeof feedbackEl.getBoundingClientRect !== 'function') return;
  requestAnimationFrame(() => {
    const rect = feedbackEl.getBoundingClientRect();
    const vh = window.innerHeight || 800;
    if (rect.bottom > vh - 8 || rect.top < 8) {
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (typeof feedbackEl.scrollIntoView === 'function') {
        feedbackEl.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
      }
    }
  });
}

function safeGetStorage(key) {
  try {
    return window.localStorage?.getItem(key) || null;
  } catch {
    return null;
  }
}

function safeSetStorage(key, val) {
  try {
    window.localStorage?.setItem(key, val);
  } catch {
    // Ignore storage quota / private mode failures.
  }
}

function safeRemoveStorage(key) {
  try {
    window.localStorage?.removeItem(key);
  } catch {
    // Ignore private mode failures.
  }
}

function getOrCreateDeviceId() {
  let id = safeGetStorage(DEVICE_STORAGE_KEY);
  if (!id || id.length < 8) {
    id =
      window.crypto?.randomUUID?.() ||
      `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    safeSetStorage(DEVICE_STORAGE_KEY, id);
  }
  return id;
}

function setLicenseStatus(el, msg, kind = '') {
  if (!el) return;
  if (!msg) {
    el.hidden = true;
    el.textContent = '';
    el.className = 'license-status';
    return;
  }
  el.hidden = false;
  el.textContent = msg;
  el.className = `license-status ${kind}`.trim();
}

function syncAccessUI() {
  els.licenseTriggerBtn.classList.toggle('is-unlocked', state.unlocked);
  els.licenseTriggerLabel.textContent = state.unlocked ? 'Akses Penuh' : 'Buka Semua';
  if (state.unlocked && state.usedDevices > 0) {
    els.licenseSummary.textContent = `Akses penuh aktif (${state.usedDevices} dari ${state.maxDevices} perangkat). Seluruh 6 permainan dan 139 kosakata sudah terbuka.`;
  } else if (state.unlocked) {
    els.licenseSummary.textContent =
      'Akses penuh aktif. Seluruh 6 permainan dan 139 kosakata sudah terbuka.';
  } else {
    els.licenseSummary.textContent =
      'Gratis mencoba Sentuh & Dengar (Hewan). Masukkan kode lisensi dari pembelian Lynk.id untuk membuka semua 6 permainan & 139 kosakata (berlaku hingga 3 HP keluarga).';
  }

  for (const entry of modeTabs) {
    const locked = !state.unlocked && !FREE_MODES.has(entry.mode);
    entry.el.dataset.locked = String(locked);
  }
  renderCategories();
}

function openLicenseModal(pending = null) {
  state.pendingAction = pending;
  setLicenseStatus(els.licenseStatus, '');
  setLicenseStatus(els.licenseRecoverStatus, '');
  if (typeof els.licenseDialog?.showModal === 'function') {
    if (!els.licenseDialog.open) els.licenseDialog.showModal();
  } else {
    els.licenseDialog?.setAttribute('open', '');
  }
  els.licenseCodeInput?.focus();
}

function closeLicenseModal() {
  state.pendingAction = null;
  if (typeof els.licenseDialog?.close === 'function') {
    if (els.licenseDialog.open) els.licenseDialog.close();
  } else {
    els.licenseDialog?.removeAttribute('open');
  }
}

function applyUnlockedCatalog({ token, catalog, usedDevices = 1, maxDevices = 3 }) {
  if (!unlockCatalogWords(catalog)) return false;
  state.unlocked = true;
  state.licenseToken = token;
  state.usedDevices = usedDevices;
  state.maxDevices = maxDevices;
  safeSetStorage(
    LICENSE_STORAGE_KEY,
    JSON.stringify({ token, catalog, usedDevices, maxDevices })
  );
  syncAccessUI();
  return true;
}

function lockToFreePreview() {
  resetToFreeWords();
  state.unlocked = false;
  state.licenseToken = '';
  state.usedDevices = 0;
  safeRemoveStorage(LICENSE_STORAGE_KEY);
  if (!FREE_CATEGORIES.has(state.category)) {
    state.category = 'animals';
  }
  syncAccessUI();
  if (!FREE_MODES.has(state.mode)) {
    setMode('explore');
  } else {
    renderExplore();
  }
}

function setMode(nextMode) {
  if (!state.unlocked && !FREE_MODES.has(nextMode)) {
    openLicenseModal({ type: 'mode', value: nextMode });
    return;
  }
  if (state.mode === nextMode) return;
  state.mode = nextMode;
  audio.stop();
  if (games) games.stop();

  const tabs = [
    ['explore', els.tabExplore],
    ['quiz', els.tabQuiz],
    ['puzzle', els.tabPuzzle],
    ['memory', els.tabMemory],
    ['counting', els.tabCounting],
    ['odd', els.tabOdd],
  ];
  const isGamesMode = nextMode === 'memory' || nextMode === 'counting' || nextMode === 'odd';
  els.panelExplore.hidden = nextMode !== 'explore';
  els.panelQuiz.hidden = nextMode !== 'quiz';
  els.panelPuzzle.hidden = nextMode !== 'puzzle';
  els.panelGames.hidden = !isGamesMode;

  for (const [key, tabEl] of tabs) {
    const active = key === nextMode;
    tabEl.setAttribute('aria-selected', String(active));
    tabEl.tabIndex = active ? 0 : -1;
    if (active && isGamesMode) {
      els.panelGames.setAttribute('aria-labelledby', tabEl.id);
    }
  }
  els.viewModeBtn.hidden = nextMode !== 'explore';

  const hints = {
    explore: 'Sentuh gambar untuk mendengar pelafalan katanya.',
    quiz: 'Dengarkan suara, lalu pilih gambar yang sesuai.',
    puzzle: 'Susun potongan gambar, cocokkan bayangan, atau rangkai huruf.',
    memory: 'Buka dua kartu yang sama untuk mencocokkan gambar dan kosakatanya.',
    counting: 'Hitung jumlah gambarnya, lalu pilih kartu angka yang tepat.',
    odd: 'Temukan satu gambar yang berbeda kelompok dari gambar lainnya.',
  };
  els.modeHint.textContent = hints[nextMode];
  els.menuActiveLabel.textContent = MODE_LABELS[nextMode] || MODE_LABELS.explore;
  // Auto-compact the 6-tab grid on mobile phones while playing a game stage.
  setMenuCollapsed(nextMode !== 'explore');

  renderActiveMode({ autoPlay: nextMode !== 'explore' });

  if (nextMode !== 'explore') {
    const stageId = nextMode === 'quiz' ? 'quiz-stage' : nextMode === 'puzzle' ? 'puzzle-stage' : 'games-stage';
    requestAnimationFrame(() => focusStage(document.getElementById(stageId)));
  }
}

function resetCategory() {
  state.category = state.unlocked ? 'all' : 'animals';
  renderCategories();
  renderActiveMode({ autoPlay: false });
}

const controllerDeps = {
  audio,
  getFilteredWords,
  announce,
  setLastAudioAction: (fn) => {
    lastAudioAction = fn;
  },
  focusStage,
  revealFeedback,
  renderCompleteWords,
  onSwitchExplore: () => setMode('explore'),
  onResetCategory: resetCategory,
};

puzzle = createPuzzleController(controllerDeps);
games = createGamesController({
  ...controllerDeps,
  getCategory: () => state.category,
});

// Event bindings
els.menuCollapseBtn.addEventListener('click', () => {
  setMenuCollapsed(!els.introBar.classList.contains('is-menu-collapsed'));
});
els.soundToggle.addEventListener('click', () => {
  state.muted = !state.muted;
  audio.setMuted(state.muted);
  els.soundToggle.setAttribute('aria-pressed', String(state.muted));
  els.soundToggle.setAttribute('aria-label', state.muted ? 'Aktifkan suara' : 'Matikan suara');
  els.soundToggleLabel.textContent = state.muted ? 'Suara senyap' : 'Suara aktif';
});

els.audioRetryBtn.addEventListener('click', () => {
  if (lastAudioAction) lastAudioAction();
});

els.licenseTriggerBtn.addEventListener('click', () => openLicenseModal(null));
els.licenseCloseBtn.addEventListener('click', closeLicenseModal);
els.licenseDialog.addEventListener('click', (e) => {
  if (e.target === els.licenseDialog) closeLicenseModal();
});

els.licenseForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = els.licenseCodeInput.value.trim();
  if (!code) return;

  els.licenseActivateBtn.disabled = true;
  setLicenseStatus(els.licenseStatus, 'Memeriksa kode lisensi...');
  try {
    const res = await fetch('/api/license/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, deviceId: getOrCreateDeviceId() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      setLicenseStatus(
        els.licenseStatus,
        data.error || 'Aktivasi gagal. Pastikan server Cloudflare aktif.',
        'is-error'
      );
      return;
    }

    const pending = state.pendingAction;
    applyUnlockedCatalog(data);
    closeLicenseModal();

    if (pending?.type === 'mode') {
      setMode(pending.value);
    } else if (pending?.type === 'category') {
      state.category = pending.value;
      state.spotlightIndex = 0;
      renderCategories();
      renderActiveMode({ autoPlay: true });
    } else {
      state.category = 'all';
      renderCategories();
      renderActiveMode({ autoPlay: false });
    }
    announce('Akses penuh FunPlay sudah aktif.');
  } catch {
    setLicenseStatus(
      els.licenseStatus,
      'Tidak dapat terhubung ke server aktivasi. Periksa koneksi internet Anda.',
      'is-error'
    );
  } finally {
    els.licenseActivateBtn.disabled = false;
  }
});

els.licenseRecoverForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = els.licenseEmailInput.value.trim();
  if (!email) return;

  els.licenseRecoverBtn.disabled = true;
  setLicenseStatus(els.licenseRecoverStatus, 'Mengirim permintaan...');
  try {
    const res = await fetch('/api/license/recover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLicenseStatus(els.licenseRecoverStatus, data.error || 'Gagal mengirim permintaan.', 'is-error');
      return;
    }
    setLicenseStatus(els.licenseRecoverStatus, data.message, 'is-success');
  } catch {
    setLicenseStatus(els.licenseRecoverStatus, 'Koneksi gagal, coba lagi sebentar.', 'is-error');
  } finally {
    els.licenseRecoverBtn.disabled = false;
  }
});

async function initLicensing() {
  const cachedRaw = safeGetStorage(LICENSE_STORAGE_KEY);
  if (cachedRaw) {
    try {
      const cached = JSON.parse(cachedRaw);
      if (cached?.token && Array.isArray(cached.catalog)) {
        applyUnlockedCatalog(cached);
        state.category = 'all';
        renderCategories();
        renderExplore();
      }
    } catch {
      safeRemoveStorage(LICENSE_STORAGE_KEY);
    }
  }

  try {
    const cfgRes = await fetch('/api/config');
    if (cfgRes.ok) {
      const cfg = await cfgRes.json();
      if (cfg.lynkUrl) {
        els.licenseBuyLink.href = cfg.lynkUrl;
        els.licenseBuyLink.hidden = false;
        els.licenseBuyHint.hidden = true;
      }
    }
  } catch {
    // Offline or static dev without /api.
  }

  if (state.licenseToken) {
    try {
      const catRes = await fetch('/api/catalog', {
        headers: { Authorization: `Bearer ${state.licenseToken}` },
      });
      if (catRes.status === 401 || catRes.status === 403) {
        lockToFreePreview();
      } else if (catRes.ok) {
        const data = await catRes.json();
        if (data?.ok) {
          applyUnlockedCatalog({
            token: state.licenseToken,
            catalog: data.catalog,
            usedDevices: data.usedDevices,
            maxDevices: data.maxDevices,
          });
        }
      }
    } catch {
      // Keep cached unlocked catalog while offline.
    }
  }
}

const modeTabs = [
  { el: els.tabExplore, mode: 'explore' },
  { el: els.tabQuiz, mode: 'quiz' },
  { el: els.tabPuzzle, mode: 'puzzle' },
  { el: els.tabMemory, mode: 'memory' },
  { el: els.tabCounting, mode: 'counting' },
  { el: els.tabOdd, mode: 'odd' },
];
modeTabs.forEach((entry, idx) => {
  entry.el.addEventListener('click', () => setMode(entry.mode));
  entry.el.addEventListener('keydown', (e) => {
    let nextIdx = -1;
    if (e.key === 'ArrowRight') nextIdx = (idx + 1) % modeTabs.length;
    else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + modeTabs.length) % modeTabs.length;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = modeTabs.length - 1;
    if (nextIdx >= 0) {
      e.preventDefault();
      modeTabs[nextIdx].el.focus();
      if (state.unlocked || FREE_MODES.has(modeTabs[nextIdx].mode)) {
        setMode(modeTabs[nextIdx].mode);
      }
    }
  });
});

els.viewModeBtn.addEventListener('click', () => {
  state.spotlightMode = !state.spotlightMode;
  els.viewModeBtn.setAttribute('aria-pressed', String(state.spotlightMode));
  els.viewModeLabel.textContent = state.spotlightMode ? 'Lihat semua' : 'Mode 1 kartu';
  renderExplore();
});

els.spotlightCard.addEventListener('click', () => {
  const item = getFilteredWords()[state.spotlightIndex];
  if (item) playWordClip(item);
});

els.spotlightPlay.addEventListener('click', () => {
  const item = getFilteredWords()[state.spotlightIndex];
  if (item) playWordClip(item);
});

els.spotlightPrev.addEventListener('click', () => {
  const items = getFilteredWords();
  if (!items.length) return;
  state.spotlightIndex = (state.spotlightIndex - 1 + items.length) % items.length;
  renderExplore();
  playWordClip(items[state.spotlightIndex]);
});

els.spotlightNext.addEventListener('click', () => {
  const items = getFilteredWords();
  if (!items.length) return;
  state.spotlightIndex = (state.spotlightIndex + 1) % items.length;
  renderExplore();
  playWordClip(items[state.spotlightIndex]);
});

els.resetCategoryBtn.addEventListener('click', resetCategory);

function setChoiceCount(count) {
  state.quizChoiceCount = count;
  els.choice2Btn.setAttribute('aria-pressed', String(count === 2));
  els.choice3Btn.setAttribute('aria-pressed', String(count === 3));
  startQuizRound({ autoPlay: true });
}

els.choice2Btn.addEventListener('click', () => setChoiceCount(2));
els.choice3Btn.addEventListener('click', () => setChoiceCount(3));

els.showWordToggle.addEventListener('change', (e) => {
  state.showWordClue = Boolean(e.target.checked);
  els.quizWordClue.hidden = !state.showWordClue;
});

els.quizPlayBtn.addEventListener('click', () => {
  const current = state.quizRound[state.quizIndex];
  if (current) playPromptClip(current.target);
});

els.quizNextBtn.addEventListener('click', () => {
  state.quizIndex++;
  renderQuizQuestion({ autoPlay: true });
  focusStage(els.quizStage.hidden ? els.quizComplete : els.quizStage);
});

els.quizRestartBtn.addEventListener('click', () => {
  startQuizRound({ autoPlay: true });
  focusStage(els.quizStage);
});

els.quizBackExploreBtn.addEventListener('click', () => {
  setMode('explore');
});

// Initial render
syncAccessUI();
renderExplore();
initLicensing();
