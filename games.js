import { WORDS, getPraiseText } from './data/words.js';
import {
  GAME_LEVELS,
  buildMemoryDeck,
  buildCountingRound,
  buildOddOneRound,
} from './data/games.js';

export function createGamesController({
  audio,
  getCategory,
  getFilteredWords,
  announce,
  setLastAudioAction,
  onSwitchExplore,
  onResetCategory,
}) {
  const els = {
    panel: document.getElementById('panel-games'),
    levelButtons: [...document.querySelectorAll('[data-game-level]')],
    stage: document.getElementById('games-stage'),
    empty: document.getElementById('games-empty'),
    resetCatBtn: document.getElementById('games-reset-cat-btn'),
    complete: document.getElementById('games-complete'),
    completeTitle: document.getElementById('games-complete-title'),
    completeWords: document.getElementById('games-complete-words'),
    restartBtn: document.getElementById('games-restart-btn'),
    backExploreBtn: document.getElementById('games-back-explore-btn'),
    progress: document.getElementById('games-progress'),
    questionText: document.getElementById('games-question-text'),
    clueText: document.getElementById('games-clue-text'),
    playBtn: document.getElementById('games-play-btn'),
    playLabel: document.getElementById('games-play-label'),
    feedback: document.getElementById('games-feedback'),
    feedbackText: document.getElementById('games-feedback-text'),
    nextBtn: document.getElementById('games-next-btn'),
    memoryPanel: document.getElementById('games-memory'),
    memoryGrid: document.getElementById('memory-grid'),
    countingPanel: document.getElementById('games-counting'),
    countingItems: document.getElementById('counting-items'),
    countingChoices: document.getElementById('counting-choices'),
    oddPanel: document.getElementById('games-odd'),
    oddChoices: document.getElementById('odd-choices'),
  };

  const gState = {
    mode: 'memory', // 'memory' | 'counting' | 'odd'
    level: 1,
    memoryDeck: { pairs: [], cards: [] },
    flippedUids: [],
    matchedIds: new Set(),
    moves: 0,
    mismatchTimer: null,
    round: [],
    index: 0,
    solved: false,
    triedIds: new Set(),
    countedOrder: new Map(),
  };

  function clearMismatchTimer() {
    if (gState.mismatchTimer) {
      clearTimeout(gState.mismatchTimer);
      gState.mismatchTimer = null;
    }
  }

  function syncLevelUI() {
    for (const btn of els.levelButtons) {
      btn.setAttribute('aria-pressed', String(Number(btn.dataset.gameLevel) === gState.level));
    }
  }

  function setSubPanel(mode) {
    els.memoryPanel.hidden = mode !== 'memory';
    els.countingPanel.hidden = mode !== 'counting';
    els.oddPanel.hidden = mode !== 'odd';
    els.playBtn.hidden = mode !== 'counting';
  }

  function clearFeedback() {
    els.feedback.hidden = true;
    els.feedback.className = 'quiz-feedback';
    els.feedbackText.textContent = '';
    els.nextBtn.hidden = true;
  }

  function showFeedback(kind, message, { showNext = false, nextLabel = null } = {}) {
    els.feedback.hidden = false;
    els.feedback.className = `quiz-feedback ${kind}`;
    els.feedbackText.textContent = message;
    els.nextBtn.hidden = !showNext;
    if (showNext) {
      els.nextBtn.textContent =
        nextLabel || (gState.index + 1 >= gState.round.length ? 'Lihat hasil' : 'Lanjut');
    }
  }

  function playWord(item, chime = 'tap') {
    if (!item) return;
    setLastAudioAction(() => playWord(item, chime));
    audio.playVoice(item.audioWord, item.word, { chime });
  }

  function playPraise(item) {
    if (!item) return;
    const praise = getPraiseText(item);
    // shortcut: play warm word clip until praise MP3s are regenerated without "Yay"
    setLastAudioAction(() => audio.playVoice(item.audioWord, praise, { chime: 'success' }));
    audio.playVoice(item.audioWord, praise, { chime: 'success' });
  }

  // --- Memory Match ---
  function renderMemoryBoard() {
    const { pairs, cards } = gState.memoryDeck;
    els.progress.textContent = `${gState.matchedIds.size} dari ${pairs.length} pasangan`;
    els.questionText.textContent = 'Buka dua kartu untuk mencari gambar yang sama';
    els.clueText.hidden = true;

    els.memoryGrid.className = `memory-grid pairs-${pairs.length}`;
    els.memoryGrid.innerHTML = '';

    cards.forEach((card, idx) => {
      const isMatched = gState.matchedIds.has(card.word.id);
      const isOpen = isMatched || gState.flippedUids.includes(card.uid);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'memory-card';
      btn.dataset.uid = card.uid;
      btn.classList.toggle('is-open', isOpen);
      btn.classList.toggle('is-matched', isMatched);
      btn.disabled = isMatched;
      btn.setAttribute('aria-pressed', String(isOpen));
      btn.setAttribute(
        'aria-label',
        isOpen ? `${card.word.word}, ${card.word.indo}` : `Kartu tertutup ${idx + 1}`
      );

      if (isOpen) {
        const art = document.createElement('span');
        art.className = 'card-art';
        const img = document.createElement('img');
        img.src = card.word.image;
        img.alt = card.word.word;
        img.width = 512;
        img.height = 512;
        art.appendChild(img);

        const label = document.createElement('span');
        label.className = 'memory-card-word';
        label.lang = 'en';
        label.textContent = card.word.word;

        btn.append(art, label);
      } else {
        const back = document.createElement('span');
        back.className = 'memory-card-back';
        back.setAttribute('aria-hidden', 'true');
        back.textContent = String(idx + 1);
        btn.appendChild(back);
      }

      btn.addEventListener('click', (e) => handleMemoryFlip(card, e.detail === 0));
      els.memoryGrid.appendChild(btn);
    });
  }

  function handleMemoryFlip(card, isKeyboard = false) {
    if (gState.mismatchTimer || gState.matchedIds.has(card.word.id)) return;
    if (gState.flippedUids.includes(card.uid)) return;

    gState.flippedUids.push(card.uid);
    playWord(card.word, 'tap');
    renderMemoryBoard();

    if (gState.flippedUids.length < 2) {
      if (isKeyboard) {
        const nextBtn = els.memoryGrid.querySelector('.memory-card:not(.is-open)');
        if (nextBtn) nextBtn.focus();
      }
      return;
    }

    gState.moves++;
    const [firstUid, secondUid] = gState.flippedUids;
    const first = gState.memoryDeck.cards.find((c) => c.uid === firstUid);
    const second = gState.memoryDeck.cards.find((c) => c.uid === secondUid);

    if (first && second && first.word.id === second.word.id) {
      gState.matchedIds.add(first.word.id);
      gState.flippedUids = [];
      playPraise(first.word);
      renderMemoryBoard();

      const totalPairs = gState.memoryDeck.pairs.length;
      if (gState.matchedIds.size >= totalPairs) {
        const msg = `Hebat, semua ${totalPairs} pasangan ketemu.`;
        showFeedback('is-correct', msg, { showNext: true, nextLabel: 'Lihat hasil' });
        announce(msg);
        if (isKeyboard) els.nextBtn.focus();
      } else {
        const msg = `Cocok, ${first.word.word} (${first.word.indo}).`;
        showFeedback('is-correct', msg);
        announce(msg);
        if (isKeyboard) {
          const nextBtn = els.memoryGrid.querySelector('.memory-card:not(:disabled)');
          if (nextBtn) nextBtn.focus();
        }
      }
      return;
    }

    showFeedback('is-retry', 'Belum sama, ingat letak gambarnya ya.');
    announce('Belum sama, kartu akan tertutup lagi.');
    gState.mismatchTimer = setTimeout(() => {
      gState.mismatchTimer = null;
      gState.flippedUids = [];
      audio.playChime('retry');
      renderMemoryBoard();
    }, 800);
  }

  // --- Counting ---
  function renderCounting(question) {
    els.progress.textContent = `Soal ${gState.index + 1} dari ${gState.round.length}`;
    els.questionText.textContent = `Ada berapa gambar ${question.item.indo}?`;
    els.clueText.hidden = false;
    els.clueText.textContent =
      gState.countedOrder.size > 0
        ? `Dihitung: ${gState.countedOrder.size} (${question.item.word})`
        : `Ketuk gambar untuk menghitung bersama (${question.item.word})`;

    els.countingItems.className = `counting-items count-${question.count}`;
    els.countingItems.innerHTML = '';

    for (let i = 0; i < question.count; i++) {
      const assignedNum = gState.countedOrder.get(i);
      const itemBtn = document.createElement('button');
      itemBtn.type = 'button';
      itemBtn.className = 'count-item-btn';
      itemBtn.classList.toggle('is-counted', Boolean(assignedNum));
      itemBtn.setAttribute(
        'aria-label',
        assignedNum
          ? `${question.item.word} hitungan ${assignedNum}`
          : `Hitung gambar ${question.item.word}`
      );

      const art = document.createElement('span');
      art.className = 'card-art';
      const img = document.createElement('img');
      img.src = question.item.image;
      img.alt = question.item.word;
      img.width = 512;
      img.height = 512;
      art.appendChild(img);
      itemBtn.appendChild(art);

      if (assignedNum) {
        const badge = document.createElement('span');
        badge.className = 'count-badge';
        badge.textContent = String(assignedNum);
        itemBtn.appendChild(badge);
      }

      itemBtn.addEventListener('click', () => handleTapCountItem(i, question));
      els.countingItems.appendChild(itemBtn);
    }

    els.countingChoices.className = `counting-choices count-${question.choices.length}`;
    els.countingChoices.innerHTML = '';

    for (const numEntry of question.choices) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz-choice-card count-choice-card';
      btn.dataset.wordId = numEntry.id;
      const isTried = gState.triedIds.has(numEntry.id);
      const isTarget = gState.solved && numEntry.id === question.targetNumber.id;
      btn.disabled = isTried || (gState.solved && !isTarget);
      btn.classList.toggle('is-tried', isTried || (gState.solved && !isTarget));
      btn.classList.toggle('is-correct', isTarget);
      btn.setAttribute('aria-label', `Pilih angka ${numEntry.word}`);

      const art = document.createElement('span');
      art.className = 'card-art';
      const img = document.createElement('img');
      img.src = numEntry.image;
      img.alt = numEntry.word;
      img.width = 512;
      img.height = 512;
      art.appendChild(img);

      const label = document.createElement('span');
      label.className = 'count-choice-word';
      label.lang = 'en';
      label.textContent = numEntry.word;

      btn.append(art, label);
      btn.addEventListener('click', (e) => handleCountChoice(numEntry, question, e.detail === 0));
      els.countingChoices.appendChild(btn);
    }
  }

  function handleTapCountItem(idx, question) {
    let num = gState.countedOrder.get(idx);
    if (!num) {
      num = gState.countedOrder.size + 1;
      gState.countedOrder.set(idx, num);
    }
    const numberEntry = WORDS.find((w) => w.id === `number-${num}`);
    if (numberEntry) playWord(numberEntry, 'tap');
    renderCounting(question);
    announce(`${num}`);
  }

  function handleCountChoice(picked, question, isKeyboard = false) {
    if (gState.solved) return;

    if (picked.id === question.targetNumber.id) {
      gState.solved = true;
      playPraise(question.targetNumber);
      renderCounting(question);
      const msg = `Benar, ada ${question.count} ${question.item.word} (${question.targetNumber.word}).`;
      showFeedback('is-correct', msg, { showNext: true });
      announce(msg);
      if (isKeyboard) els.nextBtn.focus();
      return;
    }

    gState.triedIds.add(picked.id);
    const retryFile =
      gState.triedIds.size % 2 === 1
        ? './assets/audio/feedback/try-again.mp3'
        : './assets/audio/feedback/almost.mp3';
    setLastAudioAction(() => audio.playVoice(retryFile, 'Oops, try again!', { chime: 'retry' }));
    audio.playVoice(retryFile, 'Oops, try again!', { chime: 'retry' });
    renderCounting(question);
    const msg = `Itu angka ${picked.word} (${picked.indo}). Coba hitung gambarnya lagi.`;
    showFeedback('is-retry', msg);
    announce(msg);
  }

  // --- Odd One Out ---
  function renderOddOne(question) {
    els.progress.textContent = `Soal ${gState.index + 1} dari ${gState.round.length}`;
    els.questionText.textContent = 'Mana gambar yang berbeda kelompok?';
    if (question.showHint) {
      els.clueText.hidden = false;
      els.clueText.textContent = `Petunjuk: cari yang bukan ${question.mainLabel}`;
    } else {
      els.clueText.hidden = true;
    }

    els.oddChoices.className = `quiz-choices count-${question.choices.length}`;
    els.oddChoices.innerHTML = '';

    for (const option of question.choices) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz-choice-card';
      btn.dataset.wordId = option.id;
      const isTried = gState.triedIds.has(option.id);
      const isWinner = gState.solved && option.id === question.oddItem.id;
      btn.disabled = isTried || (gState.solved && !isWinner);
      btn.classList.toggle('is-tried', isTried || (gState.solved && !isWinner));
      btn.classList.toggle('is-correct', isWinner);
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
      if (gState.solved) {
        badge.hidden = false;
        badge.textContent = `${option.word} (${option.indo})`;
        if (isWinner) badge.classList.add('correct');
      } else {
        badge.hidden = true;
      }

      btn.append(art, badge);
      btn.addEventListener('click', (e) => handleOddChoice(option, question, e.detail === 0));
      els.oddChoices.appendChild(btn);
    }
  }

  function handleOddChoice(picked, question, isKeyboard = false) {
    if (gState.solved) return;

    if (picked.id === question.oddItem.id) {
      gState.solved = true;
      playPraise(question.oddItem);
      renderOddOne(question);
      const msg = `Benar, ${picked.word} (${picked.indo}) bukan kelompok ${question.mainLabel}.`;
      showFeedback('is-correct', msg, { showNext: true });
      announce(msg);
      if (isKeyboard) els.nextBtn.focus();
      return;
    }

    gState.triedIds.add(picked.id);
    const retryFile =
      gState.triedIds.size % 2 === 1
        ? './assets/audio/feedback/try-again.mp3'
        : './assets/audio/feedback/almost.mp3';
    setLastAudioAction(() => audio.playVoice(retryFile, 'Oops, try again!', { chime: 'retry' }));
    audio.playVoice(retryFile, 'Oops, try again!', { chime: 'retry' });
    renderOddOne(question);
    const msg = `Itu ${picked.word} (${picked.indo}), masih kelompok ${question.mainLabel}.`;
    showFeedback('is-retry', msg);
    announce(msg);
  }

  // --- Shared Lifecycle ---
  function renderComplete() {
    els.stage.hidden = true;
    els.empty.hidden = true;
    els.complete.hidden = false;

    const summaryWords =
      gState.mode === 'memory'
        ? gState.memoryDeck.pairs
        : gState.mode === 'counting'
          ? gState.round.map((q) => q.targetNumber)
          : gState.round.map((q) => q.oddItem);

    const titles = {
      memory: `Hebat, ketemu semua ${summaryWords.length} pasangan`,
      counting: `Hebat, selesai ${summaryWords.length} soal berhitung`,
      odd: `Hebat, selesai ${summaryWords.length} soal`,
    };
    els.completeTitle.textContent = titles[gState.mode];
    els.completeWords.innerHTML = '';

    for (const w of summaryWords) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'complete-chip';
      chip.lang = 'en';
      chip.textContent = `${w.word} (${w.indo})`;
      chip.addEventListener('click', () => playWord(w, 'tap'));
      els.completeWords.appendChild(chip);
    }
    announce(titles[gState.mode]);
  }

  function renderQuestion({ autoPlay = false } = {}) {
    clearMismatchTimer();
    clearFeedback();
    setSubPanel(gState.mode);

    if (gState.mode === 'memory') {
      renderMemoryBoard();
      return;
    }

    const question = gState.round[gState.index];
    if (!question) {
      renderComplete();
      return;
    }

    gState.solved = false;
    gState.triedIds = new Set();
    gState.countedOrder = new Map();

    if (gState.mode === 'counting') {
      renderCounting(question);
      if (autoPlay && !audio.muted) playWord(question.item, 'tap');
    } else {
      renderOddOne(question);
    }
  }

  function startRound(mode = gState.mode, { autoPlay = false } = {}) {
    clearMismatchTimer();
    gState.mode = mode;
    syncLevelUI();

    const pool = getFilteredWords();
    if (!pool.length) {
      els.stage.hidden = true;
      els.complete.hidden = true;
      els.empty.hidden = false;
      return;
    }

    if (mode === 'memory') {
      gState.memoryDeck = buildMemoryDeck(pool, gState.level);
      gState.flippedUids = [];
      gState.matchedIds = new Set();
      gState.moves = 0;
    } else if (mode === 'counting') {
      gState.round = buildCountingRound(pool, getCategory(), gState.level, WORDS);
      gState.index = 0;
    } else {
      gState.round = buildOddOneRound(getCategory(), gState.level, WORDS);
      gState.index = 0;
    }

    els.empty.hidden = true;
    els.complete.hidden = true;
    els.stage.hidden = false;
    renderQuestion({ autoPlay });
  }

  function stop() {
    clearMismatchTimer();
  }

  function updateAudioStatus(status) {
    if (status === 'loading') {
      els.playLabel.textContent = 'Memuat suara...';
      els.playBtn.setAttribute('aria-busy', 'true');
    } else if (status === 'playing') {
      els.playLabel.textContent = 'Sedang bersuara...';
      els.playBtn.removeAttribute('aria-busy');
    } else {
      els.playLabel.textContent = 'Putar suara';
      els.playBtn.removeAttribute('aria-busy');
    }
  }

  // Event bindings
  for (const btn of els.levelButtons) {
    btn.addEventListener('click', () => {
      const nextLevel = Number(btn.dataset.gameLevel);
      if (!GAME_LEVELS[nextLevel] || nextLevel === gState.level) return;
      gState.level = nextLevel;
      audio.stop();
      startRound(gState.mode, { autoPlay: true });
    });
  }

  els.playBtn.addEventListener('click', () => {
    const q = gState.round[gState.index];
    if (gState.mode === 'counting' && q) {
      playWord(q.item, 'tap');
    }
  });

  els.nextBtn.addEventListener('click', () => {
    if (gState.mode === 'memory') {
      renderComplete();
      return;
    }
    gState.index++;
    renderQuestion({ autoPlay: true });
  });

  els.restartBtn.addEventListener('click', () => {
    startRound(gState.mode, { autoPlay: true });
  });

  els.backExploreBtn.addEventListener('click', () => {
    onSwitchExplore();
  });

  els.resetCatBtn.addEventListener('click', () => {
    onResetCategory();
  });

  return {
    startRound,
    stop,
    updateAudioStatus,
  };
}
