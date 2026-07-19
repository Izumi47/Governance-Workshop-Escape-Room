/**
 * Web Audio sound effects — no external files required.
 */
(function () {
  "use strict";

  let ctx = null;
  let muted = false;
  let reducedMotion = false;

  function ensureContext() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    return ctx;
  }

  function tone(freq, duration, type, volume, ramp) {
    if (muted || reducedMotion) return;
    const ac = ensureContext();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    gain.gain.setValueAtTime(volume || 0.08, ac.currentTime);
    if (ramp) {
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    }
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + duration);
  }

  function noise(duration, volume) {
    if (muted || reducedMotion) return;
    const ac = ensureContext();
    const bufferSize = ac.sampleRate * duration;
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = ac.createBufferSource();
    const gain = ac.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(volume || 0.06, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    source.connect(gain);
    gain.connect(ac.destination);
    source.start();
  }

  window.GameSounds = {
    init: function () {
      reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const stored = localStorage.getItem("vault-sound-muted");
      if (stored === "1") muted = true;
    },

    unlock: function () {
      ensureContext();
    },

    isMuted: function () {
      return muted;
    },

    toggleMute: function () {
      muted = !muted;
      localStorage.setItem("vault-sound-muted", muted ? "1" : "0");
      if (!muted) tone(520, 0.08, "sine", 0.06, true);
      return muted;
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

    unlock: function () {
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
