import { CATEGORIES, WORDS, filterWords, buildQuizRound, getPromptText, getPraiseText } from './data/words.js';
import { AudioController } from './audio.js';

const state = {
  mode: 'explore', // 'explore' | 'quiz'
  category: 'all',
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
  soundToggle: document.getElementById('sound-toggle'),
  soundToggleLabel: document.getElementById('sound-toggle-label'),
  tabExplore: document.getElementById('tab-explore'),
  tabQuiz: document.getElementById('tab-quiz'),
  panelExplore: document.getElementById('panel-explore'),
  panelQuiz: document.getElementById('panel-quiz'),
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

function announce(message) {
  els.srAnnouncer.textContent = '';
  requestAnimationFrame(() => {
    els.srAnnouncer.textContent = message;
  });
}

const audio = new AudioController({
  onStateChange: ({ status, message }) => {
    const spotlightLabel = els.spotlightPlay.querySelector('span');
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
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'category-chip';
    btn.textContent = cat.label;
    btn.setAttribute('aria-pressed', String(state.category === cat.id));
    btn.addEventListener('click', () => {
      state.category = cat.id;
      state.spotlightIndex = 0;
      renderCategories();
      if (state.mode === 'explore') {
        renderExplore();
      } else {
        startQuizRound({ autoPlay: true });
      }
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

    const indoSpan = document.createElement('span');
    indoSpan.className = 'card-indo';
    indoSpan.textContent = item.indo;

    card.append(tag, art, wordSpan, indoSpan);
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
    lastAudioAction = () => audio.playVoice(target.audioPraise, praise, { chime: 'success' });
    audio.playVoice(target.audioPraise, praise, { chime: 'success' });

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
    return;
  }

  // Gentle retry without harsh punishment
  state.quizTriedIds.add(picked.id);
  const pickedCard = els.quizChoices.querySelector(`[data-word-id="${picked.id}"]`);
  if (pickedCard) {
    pickedCard.classList.add('is-tried');
    pickedCard.disabled = true;
  }

  const retryFile =
    state.quizTriedIds.size % 2 === 1
      ? './assets/audio/feedback/try-again.mp3'
      : './assets/audio/feedback/almost.mp3';
  lastAudioAction = () => audio.playVoice(retryFile, 'Oops, try again!', { chime: 'retry' });
  audio.playVoice(retryFile, 'Oops, try again!', { chime: 'retry' });

  els.quizFeedback.hidden = false;
  els.quizFeedback.className = 'quiz-feedback is-retry';
  els.quizFeedbackText.textContent = `Itu gambar ${picked.word} (${picked.indo}). Coba cari gambar yang disebut suara.`;
  els.quizNextBtn.hidden = true;
  announce(`Belum tepat, itu ${picked.word}. Coba lagi.`);
}

function renderQuizComplete() {
  els.quizStage.hidden = true;
  els.quizComplete.hidden = false;
  els.completeWords.innerHTML = '';

  for (const roundItem of state.quizRound) {
    const w = roundItem.target;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'complete-chip';
    chip.lang = 'en';
    chip.textContent = `${w.word} (${w.indo})`;
    chip.addEventListener('click', () => playWordClip(w));
    els.completeWords.appendChild(chip);
  }
  announce('Hebat, selesai 5 gambar');
}

function setMode(nextMode) {
  if (state.mode === nextMode) return;
  state.mode = nextMode;
  audio.stop();

  const isExplore = nextMode === 'explore';
  els.tabExplore.setAttribute('aria-selected', String(isExplore));
  els.tabExplore.tabIndex = isExplore ? 0 : -1;
  els.tabQuiz.setAttribute('aria-selected', String(!isExplore));
  els.tabQuiz.tabIndex = isExplore ? -1 : 0;

  els.panelExplore.hidden = !isExplore;
  els.panelQuiz.hidden = isExplore;
  els.viewModeBtn.hidden = !isExplore;

  els.modeHint.textContent = isExplore
    ? 'Sentuh gambar untuk mendengar pelafalan katanya.'
    : 'Dengarkan suara, lalu pilih gambar yang sesuai.';

  if (isExplore) {
    renderExplore();
  } else {
    startQuizRound({ autoPlay: true });
  }
}

// Event bindings
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

els.tabExplore.addEventListener('click', () => setMode('explore'));
els.tabQuiz.addEventListener('click', () => setMode('quiz'));

for (const tab of [els.tabExplore, els.tabQuiz]) {
  tab.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const targetTab = tab === els.tabExplore ? els.tabQuiz : els.tabExplore;
      targetTab.focus();
      setMode(targetTab === els.tabExplore ? 'explore' : 'quiz');
    }
  });
}

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

els.resetCategoryBtn.addEventListener('click', () => {
  state.category = 'all';
  renderCategories();
  renderExplore();
});

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
});

els.quizRestartBtn.addEventListener('click', () => {
  startQuizRound({ autoPlay: true });
});

els.quizBackExploreBtn.addEventListener('click', () => {
  setMode('explore');
});

// Initial render
renderCategories();
renderExplore();
