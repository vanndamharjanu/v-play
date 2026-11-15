// Audio playback manager: prioritizes pre-recorded warm MP3 clips
// and falls back to Web Speech only when a clip fails to load.
export class AudioController {
  constructor({ onStateChange } = {}) {
    this.muted = false;
    this.currentAudio = null;
    this.audioCtx = null;
    this.playToken = 0;
    this.onStateChange = onStateChange || (() => {});
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.muted) {
      this.stop();
    }
  }

  stop() {
    this.playToken++;
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.onStateChange({ status: 'idle', message: '' });
  }

  _ensureAudioCtx() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!this.audioCtx) {
      this.audioCtx = new Ctx();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  playChime(kind = 'tap') {
    if (this.muted) return;
    const ctx = this._ensureAudioCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const sequences = {
      tap: [[523.25, 0, 0.11, 0.08]],
      success: [
        [523.25, 0, 0.13, 0.09],
        [659.25, 0.09, 0.14, 0.09],
        [783.99, 0.18, 0.22, 0.1],
      ],
      retry: [[329.63, 0, 0.14, 0.06]],
    };
    const notes = sequences[kind] || sequences.tap;

    for (const [freq, delay, dur, peak] of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + delay);
      gain.gain.setValueAtTime(0.001, now + delay);
      gain.gain.exponentialRampToValueAtTime(peak, now + delay + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + dur + 0.02);
    }
  }

  async playVoice(src, fallbackText = '', { chime = null } = {}) {
    this.stop();
    if (this.muted) return true;

    const token = ++this.playToken;
    if (chime) {
      this.playChime(chime);
    }

    let settled = false;
    const loadingTimer = setTimeout(() => {
      if (!settled && token === this.playToken) {
        this.onStateChange({ status: 'loading', message: 'Memuat suara...' });
      }
    }, 120);

    try {
      const audio = new Audio(src);
      audio.preload = 'auto';
      this.currentAudio = audio;

      await new Promise((resolve, reject) => {
        const cleanup = () => {
          clearTimeout(loadingTimer);
          audio.removeEventListener('playing', onPlaying);
          audio.removeEventListener('ended', onEnded);
          audio.removeEventListener('error', onError);
        };
        const markPlaying = () => {
          settled = true;
          clearTimeout(loadingTimer);
          if (token !== this.playToken) return;
          this.onStateChange({ status: 'playing', message: '' });
        };
        const onPlaying = () => markPlaying();
        const onEnded = () => {
          settled = true;
          cleanup();
          if (token === this.playToken) {
            this.currentAudio = null;
            this.onStateChange({ status: 'idle', message: '' });
          }
          resolve();
        };
        const onError = () => {
          settled = true;
          cleanup();
          reject(new Error('Audio file failed to load'));
        };

        audio.addEventListener('playing', onPlaying);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);

        const p = audio.play();
        if (p && typeof p.then === 'function') {
          p.then(() => {
            if (!audio.ended) markPlaying();
          }).catch((err) => {
            settled = true;
            cleanup();
            reject(err);
          });
        }
      });
      return true;
    } catch (err) {
      settled = true;
      clearTimeout(loadingTimer);
      if (token !== this.playToken) return false;
      this.currentAudio = null;

      // Browser blocked autoplay before first gesture: prompt user gently instead of faking playback.
      if (err && err.name === 'NotAllowedError') {
        this.onStateChange({
          status: 'blocked',
          message: 'Ketuk tombol Putar Suara untuk mengaktifkan audio di perangkat ini.',
        });
        return false;
      }

      // Emergency fallback only if local MP3 fails to fetch (e.g. offline without asset cache).
      if (fallbackText && 'speechSynthesis' in window) {
        this.onStateChange({ status: 'playing', message: '' });
        const utter = new SpeechSynthesisUtterance(fallbackText);
        utter.lang = 'en-US';
        utter.rate = 0.84;
        utter.onend = () => {
          if (token === this.playToken) {
            this.onStateChange({ status: 'idle', message: '' });
          }
        };
        utter.onerror = () => {
          if (token === this.playToken) {
            this.onStateChange({
              status: 'error',
              message: 'Suara gagal diputar. Periksa koneksi atau ketuk untuk mencoba lagi.',
            });
          }
        };
        window.speechSynthesis.speak(utter);
        return true;
      }

      this.onStateChange({
        status: 'error',
        message: 'Suara tidak dapat diputar sekarang. Ketuk gambar untuk mencoba lagi.',
      });
      return false;
    }
  }
}
