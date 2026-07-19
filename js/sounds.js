/**
 * Web Audio SFX + HTMLAudioElement background music playlist.
 */
(function () {
  "use strict";

  const MUSIC_TRACKS = [
    "assets/audio/01-ticking-mission.mp3",
    "assets/audio/02-time-is-ticking.mp3",
    "assets/audio/03-thinking-time.mp3"
  ];
  const MUSIC_VOLUME_KEY = "vault-music-volume";
  const SFX_VOLUME_KEY = "vault-sfx-volume";
  const DEFAULT_MUSIC_VOLUME = 0.2;
  const DEFAULT_SFX_VOLUME = 0.5;

  let ctx = null;
  let muted = false;
  let reducedMotion = false;

  let musicAudio = null;
  let musicIndex = 0;
  let musicVolume = DEFAULT_MUSIC_VOLUME;
  let sfxVolume = DEFAULT_SFX_VOLUME;
  let musicStarted = false;
  let musicWanted = false;

  function ensureContext() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    return ctx;
  }

  function clampVolume(value, fallback) {
    const n = Number(value);
    if (Number.isNaN(n)) return fallback;
    return Math.min(1, Math.max(0, n));
  }

  function sfxGain(base) {
    return (base || 0.08) * sfxVolume;
  }

  function tone(freq, duration, type, volume, ramp) {
    if (muted || reducedMotion || sfxVolume <= 0) return;
    const ac = ensureContext();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const level = Math.max(0.0001, sfxGain(volume));
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    gain.gain.setValueAtTime(level, ac.currentTime);
    if (ramp) {
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    }
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + duration);
  }

  function noise(duration, volume) {
    if (muted || reducedMotion || sfxVolume <= 0) return;
    const ac = ensureContext();
    const bufferSize = ac.sampleRate * duration;
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = ac.createBufferSource();
    const gain = ac.createGain();
    const level = Math.max(0.0001, sfxGain(volume));
    source.buffer = buffer;
    gain.gain.setValueAtTime(level, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    source.connect(gain);
    gain.connect(ac.destination);
    source.start();
  }

  function loadStoredVolume(key, fallback) {
    const stored = localStorage.getItem(key);
    if (stored === null) return fallback;
    return clampVolume(stored, fallback);
  }

  function applyMusicVolume() {
    if (!musicAudio) return;
    musicAudio.volume = muted ? 0 : musicVolume;
  }

  function ensureMusicAudio() {
    if (musicAudio) return musicAudio;
    musicAudio = new Audio();
    musicAudio.preload = "auto";
    musicAudio.addEventListener("ended", function () {
      musicIndex = (musicIndex + 1) % MUSIC_TRACKS.length;
      playCurrentTrack();
    });
    musicAudio.addEventListener("error", function () {
      musicIndex = (musicIndex + 1) % MUSIC_TRACKS.length;
      window.setTimeout(playCurrentTrack, 400);
    });
    applyMusicVolume();
    return musicAudio;
  }

  function playCurrentTrack() {
    if (!musicWanted || muted) return;
    const audio = ensureMusicAudio();
    const src = MUSIC_TRACKS[musicIndex];
    if (audio.getAttribute("data-track") !== src) {
      audio.src = src;
      audio.setAttribute("data-track", src);
    }
    applyMusicVolume();
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function () {
        /* Autoplay blocked until a later user gesture */
      });
    }
  }

  function startBackgroundMusic() {
    musicWanted = true;
    if (muted) return;
    ensureMusicAudio();
    if (!musicStarted) {
      musicStarted = true;
      musicIndex = 0;
    }
    playCurrentTrack();
  }

  function pauseBackgroundMusic() {
    if (musicAudio) musicAudio.pause();
  }

  function syncMusicMuteState() {
    applyMusicVolume();
    if (muted || !musicWanted) {
      pauseBackgroundMusic();
    } else {
      playCurrentTrack();
    }
  }

  window.GameSounds = {
    init: function () {
      reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const stored = localStorage.getItem("vault-sound-muted");
      if (stored === "1") muted = true;
      musicVolume = loadStoredVolume(MUSIC_VOLUME_KEY, DEFAULT_MUSIC_VOLUME);
      sfxVolume = loadStoredVolume(SFX_VOLUME_KEY, DEFAULT_SFX_VOLUME);
    },

    /** Resume AudioContext + start looping BGM playlist (call from a user gesture). */
    unlock: function () {
      ensureContext();
      startBackgroundMusic();
    },

    isMuted: function () {
      return muted;
    },

    toggleMute: function () {
      muted = !muted;
      localStorage.setItem("vault-sound-muted", muted ? "1" : "0");
      syncMusicMuteState();
      if (!muted) tone(520, 0.08, "sine", 0.06, true);
      return muted;
    },

    getMusicVolume: function () {
      return musicVolume;
    },

    setMusicVolume: function (value) {
      musicVolume = clampVolume(value, DEFAULT_MUSIC_VOLUME);
      localStorage.setItem(MUSIC_VOLUME_KEY, String(musicVolume));
      applyMusicVolume();
      if (musicVolume > 0 && musicWanted && !muted && musicAudio && musicAudio.paused) {
        playCurrentTrack();
      }
      return musicVolume;
    },

    getSfxVolume: function () {
      return sfxVolume;
    },

    setSfxVolume: function (value) {
      sfxVolume = clampVolume(value, DEFAULT_SFX_VOLUME);
      localStorage.setItem(SFX_VOLUME_KEY, String(sfxVolume));
      return sfxVolume;
    },

    tick: function () {
      tone(880, 0.06, "square", 0.04, true);
    },

    heartbeat: function () {
      tone(60, 0.12, "sine", 0.12, true);
      window.setTimeout(function () {
        tone(50, 0.15, "sine", 0.1, true);
      }, 140);
    },

    snip: function () {
      tone(1200, 0.04, "square", 0.05, true);
      window.setTimeout(function () { tone(400, 0.06, "sawtooth", 0.04, true); }, 30);
    },

    correct: function () {
      tone(523, 0.1, "sine", 0.07, false);
      window.setTimeout(function () { tone(659, 0.1, "sine", 0.07, false); }, 90);
      window.setTimeout(function () { tone(784, 0.15, "sine", 0.06, true); }, 180);
    },

    wrong: function () {
      tone(220, 0.2, "sawtooth", 0.06, true);
    },

    boom: function () {
      noise(0.5, 0.2);
      tone(80, 0.4, "sine", 0.2, true);
      window.setTimeout(function () { tone(40, 0.5, "sine", 0.15, true); }, 100);
    },

    fanfare: function () {
      tone(392, 0.12, "sine", 0.06, false);
      window.setTimeout(function () { tone(523, 0.12, "sine", 0.06, false); }, 100);
      window.setTimeout(function () { tone(659, 0.2, "sine", 0.07, true); }, 200);
    },

    door: function () {
      noise(0.15, 0.04);
      tone(180, 0.25, "sine", 0.05, true);
    }
  };

  GameSounds.init();
})();
