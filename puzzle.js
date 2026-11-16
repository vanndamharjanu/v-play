import { WORDS, getPromptText, getPraiseText, PRAISE_INTRO_AUDIO, getRetryAudio } from './data/words.js';
import { PUZZLE_LEVELS, buildPuzzleRound, getPuzzleLevelConfig } from './data/puzzle.js';

const silhouetteCache = new Map();

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

async function createSilhouetteUrl(src, punchWhiteHoles = false) {
  const cacheKey = `${src}|${punchWhiteHoles ? '1' : '0'}`;
  if (silhouetteCache.has(cacheKey)) return silhouetteCache.get(cacheKey);

  const img = await loadImage(src);
  const size = 192;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, size, size);

  const imageData = ctx.getImageData(0, 0, size, size);
  const { data } = imageData;
  const total = size * size;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  // Flood-fill from borders so white interiors (e.g. clock face, sheep wool) stay solid.
  const isOuterBg = (idx) => {
    const off = idx * 4;
    const min = Math.min(data[off], data[off + 1], data[off + 2]);
    const max = Math.max(data[off], data[off + 1], data[off + 2]);
    return min >= 216 && max - min <= 16;
  };

  const enqueue = (x, y) => {
    const idx = y * size + x;
    if (visited[idx] || !isOuterBg(idx)) return;
    visited[idx] = 1;
    queue[tail++] = idx;
  };

  for (let x = 0; x < size; x++) {
    enqueue(x, 0);
    enqueue(x, size - 1);
  }
  for (let y = 1; y < size - 1; y++) {
    enqueue(0, y);
    enqueue(size - 1, y);
  }

  while (head < tail) {
    const idx = queue[head++];
    const x = idx % size;
    const y = (idx - x) / size;
    if (x > 0) enqueue(x - 1, y);
    if (x < size - 1) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y < size - 1) enqueue(x, y + 1);
  }

  for (let i = 0; i < total; i++) {
    const off = i * 4;
    let transparent = visited[i] === 1;
    if (!transparent && punchWhiteHoles) {
      const min = Math.min(data[off], data[off + 1], data[off + 2]);
      const max = Math.max(data[off], data[off + 1], data[off + 2]);
      // Keep interior cutouts (e.g. A, B, 8, cup handle) visible in silhouettes.
      if (min >= 249 && max - min <= 5) transparent = true;
    }
    if (transparent) {
      data[off + 3] = 0;
    } else {
      data[off] = 53;
      data[off + 1] = 44;
      data[off + 2] = 36;
      data[off + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  const url = canvas.toDataURL('image/png');
  silhouetteCache.set(cacheKey, url);
  return url;
}

function createPieceCrop(src, alt, cols, rows, col, row, onError) {
  const crop = document.createElement('span');
  crop.className = 'jigsaw-crop';
  const img = document.createElement('img');
  img.src = src;
  img.alt = alt;
  img.width = 512;
  img.height = 512;
  img.style.width = `${cols * 100}%`;
  img.style.height = `${rows * 100}%`;
  img.style.left = `${-col * 100}%`;
  img.style.top = `${-row * 100}%`;
  if (onError) img.addEventListener('error', onError, { once: true });
  crop.appendChild(img);
  return crop;
}

export function createPuzzleController({
  audio,
  getFilteredWords,
  announce,
  setLastAudioAction,
  focusStage,
  revealFeedback,
  renderCompleteWords,
  onSwitchExplore,
  onResetCategory,
}) {
  const els = {
    typeButtons: [...document.querySelectorAll('[data-puzzle-type]')],
    levelButtons: [...document.querySelectorAll('[data-puzzle-level]')],
    stage: document.getElementById('puzzle-stage'),
    empty: document.getElementById('puzzle-empty'),
    resetCatBtn: document.getElementById('puzzle-reset-cat-btn'),
    complete: document.getElementById('puzzle-complete'),
    completeTitle: document.getElementById('puzzle-complete-title'),
    completeWords: document.getElementById('puzzle-complete-words'),
    restartBtn: document.getElementById('puzzle-restart-btn'),
    backExploreBtn: document.getElementById('puzzle-back-explore-btn'),
    progress: document.getElementById('puzzle-progress'),
    questionText: document.getElementById('puzzle-question-text'),
    clueText: document.getElementById('puzzle-clue-text'),
    playBtn: document.getElementById('puzzle-play-btn'),
    playLabel: document.getElementById('puzzle-play-label'),
    feedback: document.getElementById('puzzle-feedback'),
    feedbackText: document.getElementById('puzzle-feedback-text'),
    nextBtn: document.getElementById('puzzle-next-btn'),
    jigsawPanel: document.getElementById('puzzle-jigsaw'),
    jigsawBoard: document.getElementById('jigsaw-board'),
    jigsawTray: document.getElementById('jigsaw-tray'),
    shadowPanel: document.getElementById('puzzle-shadow'),
    shadowTargetBox: document.getElementById('shadow-target-box'),
    shadowChoices: document.getElementById('shadow-choices'),
    lettersPanel: document.getElementById('puzzle-letters'),
    lettersPictureCard: document.getElementById('letters-picture-card'),
    lettersGuide: document.getElementById('letters-guide'),
    lettersSlots: document.getElementById('letters-slots'),
    lettersTray: document.getElementById('letters-tray'),
  };

  const pState = {
    type: 'jigsaw',
    level: 1,
    round: [],
    index: 0,
    solved: false,
    renderSeq: 0,
    placedSlots: [],
    selectedPieceIdx: null,
    selectedSlotIdx: null,
    triedIds: new Set(),
    filledLetters: [],
    usedTileIds: new Set(),
  };

  function getCurrentItem() {
    return pState.round[pState.index] || null;
  }

  function playTargetAudio(item, { mode = 'word' } = {}) {
    if (!item) return;
    if (mode === 'prompt') {
      const prompt = getPromptText(item);
      setLastAudioAction(() => playTargetAudio(item, { mode: 'prompt' }));
      announce(prompt);
      audio.playVoice(item.audioPrompt, prompt);
      return;
    }
    setLastAudioAction(() => playTargetAudio(item, { mode: 'word' }));
    announce(`${item.word}, ${item.indo}`);
    audio.playVoice(item.audioWord, item.word, { chime: 'tap' });
  }

  function playPraise(item) {
    const praise = getPraiseText(item);
    const praiseAudio = [PRAISE_INTRO_AUDIO, item.audioWord];
    setLastAudioAction(() => audio.playVoice(praiseAudio, praise, { chime: 'success' }));
    audio.playVoice(praiseAudio, praise, { chime: 'success' });
  }

  function showFeedback(kind, message, { showNext = false } = {}) {
    els.feedback.hidden = false;
    els.feedback.className = `quiz-feedback ${kind}`;
    els.feedbackText.textContent = message;
    els.nextBtn.hidden = !showNext;
    if (showNext) {
      els.nextBtn.textContent =
        pState.index + 1 >= pState.round.length ? 'Lihat hasil' : 'Lanjut';
    }
    if (revealFeedback) revealFeedback(els.feedback);
  }

  function clearFeedback() {
    els.feedback.hidden = true;
    els.feedback.className = 'quiz-feedback';
    els.feedbackText.textContent = '';
    els.nextBtn.hidden = true;
  }

  function syncSettingsUI() {
    for (const btn of els.typeButtons) {
      btn.setAttribute('aria-pressed', String(btn.dataset.puzzleType === pState.type));
    }
    for (const btn of els.levelButtons) {
      btn.setAttribute('aria-pressed', String(Number(btn.dataset.puzzleLevel) === pState.level));
    }
  }

  function setActiveSubPanel(type) {
    els.jigsawPanel.hidden = type !== 'jigsaw';
    els.shadowPanel.hidden = type !== 'shadow';
    els.lettersPanel.hidden = type !== 'letters';
  }

  function handleImageLoadFailure(container) {
    container.innerHTML = '<span class="puzzle-status-note">Gambar tidak dapat dimuat.</span>';
    showFeedback('is-retry', 'Gambar gagal dimuat. Ketuk Lanjut untuk gambar berikutnya.', {
      showNext: true,
    });
  }

  function finishQuestion(item, feedbackMessage) {
    pState.solved = true;
    playPraise(item);
    showFeedback('is-correct', feedbackMessage, { showNext: true });
    announce(feedbackMessage);
  }

  // --- Jigsaw ---
  function renderJigsaw(itemData) {
    const { target, cols, rows, pieces } = itemData;
    const cfg = getPuzzleLevelConfig(pState.level);
    const total = cols * rows;

    els.questionText.textContent = 'Pasang potongan gambar pada kotak yang cocok';
    els.clueText.hidden = false;
    els.clueText.textContent =
      pState.level === 3
        ? `Petunjuk: ${target.indo}`
        : `${target.word} (${target.indo})`;

    els.jigsawBoard.classList.remove('is-complete');
    els.jigsawBoard.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    els.jigsawTray.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    els.jigsawBoard.innerHTML = '';
    els.jigsawTray.innerHTML = '';

    if (cfg.guideOpacity > 0) {
      const ghost = document.createElement('img');
      ghost.className = 'jigsaw-board-ghost';
      ghost.src = target.image;
      ghost.alt = '';
      ghost.width = 512;
      ghost.height = 512;
      ghost.style.opacity = String(cfg.guideOpacity);
      els.jigsawBoard.appendChild(ghost);
    }

    let errored = false;
    const onImgErr = () => {
      if (errored) return;
      errored = true;
      handleImageLoadFailure(els.jigsawBoard);
    };

    for (let slotIdx = 0; slotIdx < total; slotIdx++) {
      const placed = pState.placedSlots[slotIdx];
      const slotBtn = document.createElement('button');
      slotBtn.type = 'button';
      slotBtn.className = 'jigsaw-slot';
      slotBtn.style.aspectRatio = `${rows} / ${cols}`;
      slotBtn.dataset.slotIndex = String(slotIdx);

      if (placed) {
        slotBtn.classList.add('is-filled');
        slotBtn.disabled = true;
        slotBtn.setAttribute('aria-label', `Kotak ${slotIdx + 1} sudah terisi`);
        slotBtn.appendChild(
          createPieceCrop(target.image, `${target.word} bagian ${slotIdx + 1}`, cols, rows, placed.col, placed.row)
        );
      } else {
        const selected = pState.selectedSlotIdx === slotIdx;
        slotBtn.classList.toggle('is-selected', selected);
        slotBtn.classList.toggle('is-ready', pState.selectedPieceIdx !== null);
        slotBtn.setAttribute('aria-pressed', String(selected));
        slotBtn.setAttribute('aria-label', `Kotak kosong ${slotIdx + 1} dari ${total}`);
        const num = document.createElement('span');
        num.className = 'jigsaw-slot-num';
        num.textContent = String(slotIdx + 1);
        slotBtn.appendChild(num);
        slotBtn.addEventListener('click', (e) => handleSlotTap(slotIdx, itemData, e.detail === 0));
      }
      els.jigsawBoard.appendChild(slotBtn);
    }

    const placedSet = new Set(pState.placedSlots.filter(Boolean).map((p) => p.index));
    for (const piece of pieces) {
      const isPlaced = placedSet.has(piece.index);
      const isSelected = pState.selectedPieceIdx === piece.index;
      const pieceBtn = document.createElement('button');
      pieceBtn.type = 'button';
      pieceBtn.className = 'jigsaw-piece';
      pieceBtn.dataset.pieceIndex = String(piece.index);
      pieceBtn.style.aspectRatio = `${rows} / ${cols}`;
      pieceBtn.classList.toggle('is-placed', isPlaced);
      pieceBtn.classList.toggle('is-selected', isSelected);
      pieceBtn.disabled = isPlaced;
      pieceBtn.setAttribute('aria-pressed', String(isSelected));
      pieceBtn.setAttribute(
        'aria-label',
        isPlaced ? 'Potongan sudah terpasang' : `Potongan gambar, posisi ${piece.index + 1}`
      );
      if (!isPlaced) {
        pieceBtn.appendChild(
          createPieceCrop(target.image, `Potongan ${target.word}`, cols, rows, piece.col, piece.row, onImgErr)
        );
        pieceBtn.addEventListener('click', (e) => handlePieceTap(piece.index, itemData, e.detail === 0));
      }
      els.jigsawTray.appendChild(pieceBtn);
    }

    if (pState.solved) {
      els.jigsawBoard.classList.add('is-complete');
    }
  }

  function tryPlaceJigsaw(pieceIdx, slotIdx, itemData, isKeyboard = false) {
    if (pState.solved) return;
    if (pieceIdx === slotIdx) {
      const piece = itemData.pieces.find((p) => p.index === pieceIdx);
      pState.placedSlots[slotIdx] = piece;
      pState.selectedPieceIdx = null;
      pState.selectedSlotIdx = null;
      audio.playChime('tap');

      const allFilled = pState.placedSlots.every(Boolean);
      if (allFilled) {
        renderJigsaw(itemData);
        finishQuestion(itemData.target, `Hebat, gambar ${itemData.target.word} (${itemData.target.indo}) lengkap.`);
        if (isKeyboard) els.nextBtn.focus();
      } else {
        clearFeedback();
        renderJigsaw(itemData);
        announce(`Potongan terpasang di kotak ${slotIdx + 1}`);
        if (isKeyboard) {
          const nextPiece = els.jigsawTray.querySelector('.jigsaw-piece:not(:disabled)');
          if (nextPiece) nextPiece.focus();
        }
      }
      return;
    }

    audio.playChime('retry');
    showFeedback('is-retry', 'Belum pas di kotak itu, coba kotak yang lain.');
    announce('Belum pas di kotak itu, coba lagi.');
  }

  function handlePieceTap(pieceIdx, itemData, isKeyboard = false) {
    if (pState.solved) return;
    if (pState.selectedSlotIdx !== null) {
      tryPlaceJigsaw(pieceIdx, pState.selectedSlotIdx, itemData, isKeyboard);
      return;
    }
    pState.selectedPieceIdx = pState.selectedPieceIdx === pieceIdx ? null : pieceIdx;
    renderJigsaw(itemData);
    if (isKeyboard) {
      const btn = els.jigsawTray.querySelector(`[data-piece-index="${pieceIdx}"]`);
      if (btn) btn.focus();
    }
  }

  function handleSlotTap(slotIdx, itemData, isKeyboard = false) {
    if (pState.solved || pState.placedSlots[slotIdx]) return;
    if (pState.selectedPieceIdx !== null) {
      tryPlaceJigsaw(pState.selectedPieceIdx, slotIdx, itemData, isKeyboard);
      return;
    }
    pState.selectedSlotIdx = pState.selectedSlotIdx === slotIdx ? null : slotIdx;
    renderJigsaw(itemData);
    if (isKeyboard) {
      const btn = els.jigsawBoard.querySelector(`[data-slot-index="${slotIdx}"]`);
      if (btn) btn.focus();
    }
  }

  // --- Shadow Match ---
  async function renderShadow(itemData, seq) {
    const { target, choices } = itemData;
    els.questionText.textContent = 'Gambar mana yang cocok dengan bayangan ini?';
    els.clueText.hidden = true;

    els.shadowTargetBox.className = 'shadow-target-box';
    els.shadowTargetBox.setAttribute('aria-busy', 'true');
    els.shadowTargetBox.innerHTML = '<span class="puzzle-status-note">Menyiapkan bayangan...</span>';

    els.shadowChoices.className = `quiz-choices count-${choices.length}`;
    els.shadowChoices.innerHTML = '';

    for (const option of choices) {
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
      btn.addEventListener('click', () => handleShadowChoice(option, target));
      els.shadowChoices.appendChild(btn);
    }

    const punchWhiteHoles =
      target.category === 'alphabets' ||
      target.category === 'numbers' ||
      target.category === 'objects';

    try {
      const silUrl = await createSilhouetteUrl(target.image, punchWhiteHoles);
      if (seq !== pState.renderSeq || pState.solved) return;
      els.shadowTargetBox.removeAttribute('aria-busy');
      els.shadowTargetBox.innerHTML = '';
      const silImg = document.createElement('img');
      silImg.className = 'shadow-img';
      silImg.src = silUrl;
      silImg.alt = 'Bayangan gambar yang harus dicocokkan';
      silImg.width = 192;
      silImg.height = 192;
      els.shadowTargetBox.appendChild(silImg);
    } catch {
      if (seq !== pState.renderSeq || pState.solved) return;
      els.shadowTargetBox.removeAttribute('aria-busy');
      els.shadowTargetBox.innerHTML = '';
      const fallbackImg = document.createElement('img');
      fallbackImg.className = 'shadow-img shadow-img-fallback';
      fallbackImg.src = target.image;
      fallbackImg.alt = 'Bayangan gambar yang harus dicocokkan';
      fallbackImg.width = 512;
      fallbackImg.height = 512;
      fallbackImg.addEventListener('error', () => handleImageLoadFailure(els.shadowTargetBox), {
        once: true,
      });
      els.shadowTargetBox.appendChild(fallbackImg);
    }
  }

  function handleShadowChoice(picked, target) {
    if (pState.solved) return;

    if (picked.id === target.id) {
      els.shadowTargetBox.removeAttribute('aria-busy');
      els.shadowTargetBox.classList.add('is-revealed');
      els.shadowTargetBox.innerHTML = '';
      const revealed = document.createElement('img');
      revealed.className = 'shadow-revealed-img';
      revealed.src = target.image;
      revealed.alt = `${target.word} (${target.indo})`;
      revealed.width = 512;
      revealed.height = 512;
      els.shadowTargetBox.appendChild(revealed);

      for (const card of els.shadowChoices.querySelectorAll('.quiz-choice-card')) {
        if (card.dataset.wordId === target.id) {
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

      finishQuestion(target, `Benar, itu bayangan ${target.word} (${target.indo}).`);
      return;
    }

    pState.triedIds.add(picked.id);
    const pickedCard = els.shadowChoices.querySelector(`[data-word-id="${picked.id}"]`);
    if (pickedCard) {
      pickedCard.disabled = true;
      pickedCard.classList.add('is-tried');
    }

    const retryFile = getRetryAudio(pState.triedIds.size);
    setLastAudioAction(() => audio.playVoice(retryFile, 'Oops, try again!', { chime: 'retry' }));
    audio.playVoice(retryFile, 'Oops, try again!', { chime: 'retry' });

    const msg = `Itu ${picked.word} (${picked.indo}). Coba cari bentuk yang sama dengan bayangan.`;
    showFeedback('is-retry', msg);
    announce(msg);
  }

  // --- Arrange Letters ---
  function renderLetters(itemData) {
    const { target, letters, tray } = itemData;
    const cfg = getPuzzleLevelConfig(pState.level);

    els.questionText.textContent =
      letters.length === 1 ? 'Pilih huruf yang sesuai dengan gambar' : 'Susun huruf menjadi kata bahasa Inggris';
    els.clueText.hidden = false;
    els.clueText.textContent = `Arti: ${target.indo}`;

    els.lettersPictureCard.innerHTML = '';
    const img = document.createElement('img');
    img.src = target.image;
    img.alt = target.indo;
    img.width = 512;
    img.height = 512;
    img.addEventListener('error', () => handleImageLoadFailure(els.lettersPictureCard), {
      once: true,
    });
    els.lettersPictureCard.appendChild(img);

    if (cfg.showWordGuide && !cfg.showLetterClues && letters.length > 1) {
      els.lettersGuide.hidden = false;
      els.lettersGuide.textContent = letters.join(' ');
    } else {
      els.lettersGuide.hidden = true;
      els.lettersGuide.textContent = '';
    }

    els.lettersSlots.innerHTML = '';
    const activeIndex = pState.filledLetters.length;
    letters.forEach((expected, idx) => {
      const slot = document.createElement('span');
      slot.className = 'letter-slot';
      const filled = pState.filledLetters[idx];
      if (filled) {
        slot.classList.add('is-filled');
        if (pState.solved) slot.classList.add('is-complete');
        slot.textContent = filled;
        slot.setAttribute('aria-label', `Kotak ${idx + 1}: huruf ${filled}`);
      } else {
        if (idx === activeIndex) slot.classList.add('is-active');
        slot.setAttribute('aria-label', `Kotak ${idx + 1} kosong`);
        if (cfg.showLetterClues) {
          const ghost = document.createElement('span');
          ghost.className = 'letter-slot-ghost';
          ghost.textContent = expected;
          ghost.setAttribute('aria-hidden', 'true');
          slot.appendChild(ghost);
        }
      }
      els.lettersSlots.appendChild(slot);
    });

    els.lettersTray.innerHTML = '';
    for (const tile of tray) {
      const used = pState.usedTileIds.has(tile.id);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'letter-tile';
      btn.textContent = tile.letter;
      btn.disabled = used || pState.solved;
      btn.classList.toggle('is-used', used);
      btn.setAttribute('aria-label', `Huruf ${tile.letter}`);
      btn.addEventListener('click', (e) => handleLetterTap(tile, itemData, e.detail === 0));
      els.lettersTray.appendChild(btn);
    }
  }

  function handleLetterTap(tile, itemData, isKeyboard = false) {
    if (pState.solved || pState.usedTileIds.has(tile.id)) return;
    const nextIdx = pState.filledLetters.length;
    const expected = itemData.letters[nextIdx];
    const cfg = getPuzzleLevelConfig(pState.level);

    if (tile.letter === expected) {
      pState.usedTileIds.add(tile.id);
      pState.filledLetters.push(tile.letter);
      audio.playChime('tap');

      if (pState.filledLetters.length >= itemData.letters.length) {
        pState.solved = true;
        renderLetters(itemData);
        finishQuestion(
          itemData.target,
          `Benar, ${itemData.target.word} (${itemData.target.indo}).`
        );
        if (isKeyboard) els.nextBtn.focus();
      } else {
        clearFeedback();
        renderLetters(itemData);
        announce(`Huruf ${tile.letter} benar`);
        if (isKeyboard) {
          const nextTile = els.lettersTray.querySelector('.letter-tile:not(:disabled)');
          if (nextTile) nextTile.focus();
        }
      }
      return;
    }

    audio.playChime('retry');
    const hint =
      cfg.showWordGuide || cfg.showLetterClues
        ? `Bukan ${tile.letter}, coba cari huruf ${expected}.`
        : `Huruf ${tile.letter} belum tepat, coba huruf lain.`;
    showFeedback('is-retry', hint);
    announce(hint);
  }

  // --- Round Lifecycle ---
  function renderComplete() {
    els.stage.hidden = true;
    els.empty.hidden = true;
    els.complete.hidden = false;
    els.completeTitle.textContent = `Hebat, selesai ${pState.round.length} puzzle`;
    renderCompleteWords(
      els.completeWords,
      pState.round.map((roundItem) => roundItem.target),
      (w) => playTargetAudio(w, { mode: 'word' })
    );
    announce(`Hebat, selesai ${pState.round.length} puzzle`);
  }

  function renderQuestion({ autoPlay = false } = {}) {
    const seq = ++pState.renderSeq;
    const itemData = getCurrentItem();
    if (!itemData) {
      renderComplete();
      return;
    }

    pState.solved = false;
    pState.selectedPieceIdx = null;
    pState.selectedSlotIdx = null;
    pState.placedSlots = new Array((itemData.cols || 0) * (itemData.rows || 0)).fill(null);
    pState.triedIds = new Set();
    pState.filledLetters = [];
    pState.usedTileIds = new Set();

    clearFeedback();
    els.progress.textContent = `Puzzle ${pState.index + 1} dari ${pState.round.length}`;
    setActiveSubPanel(itemData.type);

    if (itemData.type === 'jigsaw') {
      renderJigsaw(itemData);
      if (autoPlay && !audio.muted) playTargetAudio(itemData.target, { mode: 'word' });
    } else if (itemData.type === 'shadow') {
      renderShadow(itemData, seq);
    } else {
      renderLetters(itemData);
      if (autoPlay && !audio.muted) playTargetAudio(itemData.target, { mode: 'word' });
    }
  }

  function startRound({ autoPlay = false } = {}) {
    const pool = getFilteredWords();
    syncSettingsUI();

    if (!pool.length) {
      els.stage.hidden = true;
      els.complete.hidden = true;
      els.empty.hidden = false;
      return;
    }

    pState.round = buildPuzzleRound(pool, pState.type, pState.level, WORDS);
    pState.index = 0;

    els.empty.hidden = true;
    els.complete.hidden = true;
    els.stage.hidden = false;
    renderQuestion({ autoPlay });
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
  for (const btn of els.typeButtons) {
    btn.addEventListener('click', () => {
      const nextType = btn.dataset.puzzleType;
      if (!nextType || nextType === pState.type) return;
      pState.type = nextType;
      audio.stop();
      startRound({ autoPlay: true });
    });
  }

  for (const btn of els.levelButtons) {
    btn.addEventListener('click', () => {
      const nextLevel = Number(btn.dataset.puzzleLevel);
      if (!PUZZLE_LEVELS[nextLevel] || nextLevel === pState.level) return;
      pState.level = nextLevel;
      audio.stop();
      startRound({ autoPlay: true });
    });
  }

  els.playBtn.addEventListener('click', () => {
    const current = getCurrentItem();
    if (!current) return;
    playTargetAudio(current.target, {
      mode: current.type === 'shadow' ? 'prompt' : 'word',
    });
  });

  els.nextBtn.addEventListener('click', () => {
    pState.index++;
    renderQuestion({ autoPlay: true });
    if (focusStage) focusStage(els.stage.hidden ? els.complete : els.stage);
  });

  els.restartBtn.addEventListener('click', () => {
    startRound({ autoPlay: true });
    if (focusStage) focusStage(els.stage);
  });

  els.backExploreBtn.addEventListener('click', () => {
    onSwitchExplore();
  });

  els.resetCatBtn.addEventListener('click', () => {
    onResetCategory();
  });

  return {
    startRound,
    updateAudioStatus,
  };
}
