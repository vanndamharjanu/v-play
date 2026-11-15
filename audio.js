// Audio playback manager: prioritizes pre-recorded warm MP3 clips
// and falls back to Web Speech only when a clip fails to load.
export class AudioController {
  constructor({ onStateChange } = {}) {
    this.muted = false;
    this.currentAudio = null;
    this.audioCtx = null;
    this.playToken = 0;
    this._cancelClip = null;
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
    if (this._cancelClip) {
      this._cancelClip();
    }
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
        [523.25, 0, 0.08, 0.08],
        [659.25, 0.055, 0.08, 0.085],
        [783.99, 0.11, 0.09, 0.09],
        [1046.5, 0.165, 0.22, 0.105],
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

    const sources = (Array.isArray(src) ? src : [src]).filter(Boolean);
    if (!sources.length) return false;

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
      // Reuse one Audio element across sequential clips so mobile browsers keep the tap activation.
      const audio = new Audio();
      audio.preload = 'auto';
      this.currentAudio = audio;

      for (let i = 0; i < sources.length; i++) {
        if (token !== this.playToken) {
          clearTimeout(loadingTimer);
          return false;
        }

        const outcome = await new Promise((resolve, reject) => {
          const cleanup = () => {
            clearTimeout(loadingTimer);
            if (this._cancelClip === cancelFn) this._cancelClip = null;
            audio.removeEventListener('playing', onPlaying);
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('error', onError);
          };
          const cancelFn = () => {
            settled = true;
            cleanup();
            resolve('cancelled');
          };
          const onPlaying = () => {
            settled = true;
            clearTimeout(loadingTimer);
            if (token === this.playToken) {
              this.onStateChange({ status: 'playing', message: '' });
            }
          };
          const onEnded = () => {
            settled = true;
            cleanup();
            resolve('ended');
          };
          const onError = () => {
            settled = true;
            cleanup();
            reject(new Error('Audio file failed to load'));
          };

          this._cancelClip = cancelFn;
          audio.addEventListener('playing', onPlaying);
          audio.addEventListener('ended', onEnded);
          audio.addEventListener('error', onError);
          audio.src = sources[i];

          const p = audio.play();
          if (p && typeof p.then === 'function') {
            p.then(() => {
              if (!audio.ended && token === this.playToken) onPlaying();
            }).catch((err) => {
              settled = true;
              cleanup();
              reject(err);
            });
          }
        });

        if (outcome === 'cancelled' || token !== this.playToken) {
          return false;
        }
      }

      if (token === this.playToken) {
        this.currentAudio = null;
        this.onStateChange({ status: 'idle', message: '' });
      }
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
