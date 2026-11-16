import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  WORDS,
  CATEGORIES,
  filterWords,
  pickQuestionChoices,
  buildQuizRound,
  getPromptText,
  getPraiseText,
  PRAISE_INTRO_AUDIO,
  getRetryAudio,
} from '../data/words.js';

const rootDir = path.resolve(import.meta.dirname, '..');
const folderCategories = ['animals', 'colors', 'fruits', 'objects', 'alphabets', 'numbers', 'shapes'];

test('every word entry has unique id and points to existing image and audio files', () => {
  assert.equal(WORDS.length, 139);
  assert.equal(new Set(WORDS.map((w) => w.id)).size, WORDS.length);
  for (const item of WORDS) {
    assert.ok(CATEGORIES.some((c) => c.id === item.category), `unknown category ${item.category}`);
    assert.ok(typeof item.pronun === 'string' && item.pronun.trim().length > 0, `missing pronun for ${item.id}`);
    for (const rel of [item.image, item.audioWord, item.audioPrompt, item.audioPraise]) {
      const full = path.join(rootDir, rel);
      assert.ok(fs.existsSync(full), `missing asset ${rel}`);
      assert.ok(fs.statSync(full).size > 500, `asset unexpectedly tiny: ${rel}`);
    }
  }
  assert.ok(fs.existsSync(path.join(rootDir, getRetryAudio(1))));
  assert.ok(fs.existsSync(path.join(rootDir, getRetryAudio(2))));
  assert.ok(fs.existsSync(path.join(rootDir, PRAISE_INTRO_AUDIO)));
  for (const cat of CATEGORIES) {
    if (cat.thumb) {
      const thumbPath = path.join(rootDir, cat.thumb);
      assert.ok(fs.existsSync(thumbPath), `missing category thumb ${cat.thumb}`);
      assert.ok(fs.statSync(thumbPath).size > 500);
    }
  }
});

test('every image in category subfolders is referenced in WORDS', () => {
  const referenced = new Set(WORDS.map((w) => path.resolve(rootDir, w.image)));
  for (const cat of folderCategories) {
    const dir = path.join(rootDir, 'assets/images', cat);
    for (const file of fs.readdirSync(dir)) {
      const full = path.resolve(dir, file);
      assert.ok(referenced.has(full), `unreferenced image: ${cat}/${file}`);
    }
  }
});

test('filterWords filters by category and handles unknown or all', () => {
  assert.equal(filterWords('all').length, 139);
  assert.equal(filterWords('animals').length, 20);
  assert.equal(filterWords('colors').length, 12);
  assert.equal(filterWords('fruits').length, 20);
  assert.equal(filterWords('objects').length, 20);
  assert.equal(filterWords('alphabets').length, 26);
  assert.equal(filterWords('numbers').length, 29);
  assert.equal(filterWords('shapes').length, 12);
  assert.equal(filterWords('missing').length, 0);
});

test('pickQuestionChoices returns unique options including target without duplicate word labels', () => {
  for (const cat of folderCategories) {
    const pool = filterWords(cat);
    const target = pool[0];
    for (const count of [2, 3]) {
      const choices = pickQuestionChoices(target, pool, count);
      assert.equal(choices.length, count);
      assert.ok(choices.some((c) => c.id === target.id));
      assert.equal(new Set(choices.map((c) => c.id)).size, count);
    }
  }

  const orangeFruit = WORDS.find((w) => w.id === 'orange');
  assert.ok(orangeFruit);
  for (let i = 0; i < 20; i++) {
    const choices = pickQuestionChoices(orangeFruit, WORDS, 3);
    assert.ok(!choices.some((c) => c.id === 'color-orange'));
  }
});

test('getPromptText and getPraiseText format category-specific speech clearly', () => {
  const colorOrange = WORDS.find((w) => w.id === 'color-orange');
  const fruitOrange = WORDS.find((w) => w.id === 'orange');
  const letterA = WORDS.find((w) => w.id === 'letter-a');
  const numberTen = WORDS.find((w) => w.id === 'number-10');
  const shapeStar = WORDS.find((w) => w.id === 'star');

  assert.equal(getPromptText(colorOrange), 'Where is the color orange?');
  assert.equal(getPromptText(fruitOrange), 'Where is the orange?');
  assert.equal(getPromptText(letterA), 'Where is the letter A?');
  assert.equal(getPromptText(numberTen), 'Where is the number ten?');
  assert.equal(getPromptText(shapeStar), 'Where is the star?');

  assert.equal(getPraiseText(letterA), 'Great! Letter A!');
  assert.equal(getPraiseText(shapeStar), 'Great! Star!');
});

test('buildQuizRound limits round size to pool length and contains valid questions', () => {
  const pool = filterWords('fruits');
  const round = buildQuizRound(pool, 3, 5);
  assert.equal(round.length, 5);
  for (const q of round) {
    assert.equal(q.choices.length, 3);
    assert.ok(q.choices.some((c) => c.id === q.target.id));
  }
  assert.deepEqual(buildQuizRound([], 2, 5), []);
});

test('AudioController plays sequential clips on one Audio element and stops cleanly mid-sequence', async () => {
  const { AudioController } = await import('../audio.js');
  const prevWindow = globalThis.window;
  const prevAudio = globalThis.Audio;
  const instances = [];
  const playedSrcs = [];

  class FakeAudio {
    constructor() {
      this.src = '';
      this.ended = false;
      this.listeners = new Map();
      instances.push(this);
    }
    addEventListener(type, fn) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type).add(fn);
    }
    removeEventListener(type, fn) {
      this.listeners.get(type)?.delete(fn);
    }
    emit(type) {
      for (const fn of [...(this.listeners.get(type) || [])]) fn();
    }
    pause() {}
    play() {
      playedSrcs.push(this.src);
      return Promise.resolve();
    }
  }

  globalThis.window = {};
  globalThis.Audio = FakeAudio;
  try {
    const statuses = [];
    const ctrl = new AudioController({ onStateChange: ({ status }) => statuses.push(status) });

    const seqPromise = ctrl.playVoice(['a.wav', 'b.mp3'], 'Great! Cat!');
    await Promise.resolve();
    instances[0].emit('ended');
    await Promise.resolve();
    instances[0].emit('ended');
    assert.equal(await seqPromise, true);
    assert.deepEqual(playedSrcs, ['a.wav', 'b.mp3']);
    assert.equal(instances.length, 1);
    assert.equal(statuses.at(-1), 'idle');

    // Mid-sequence stop must cancel before advancing to the second clip.
    playedSrcs.length = 0;
    const aborted = ctrl.playVoice(['a.wav', 'b.mp3'], 'Great! Cat!');
    await Promise.resolve();
    ctrl.stop();
    assert.equal(await aborted, false);
    assert.deepEqual(playedSrcs, ['a.wav']);
  } finally {
    globalThis.window = prevWindow;
    globalThis.Audio = prevAudio;
  }
});

