/**
 * UI helpers: progress map, theming, animations, leaderboard, debrief.
 */
(function () {
  "use strict";

  const TYPE_LABELS = {
    choice: "Multiple Choice",
    fill: "Fill in the Blank",
    checkbox: "Select All That Apply"
  };

  let chambers = [];
  let progressEl = null;
  let typeBadgeEl = null;
  let debriefPanelEl = null;
  let scorePopContainer = null;
  let snipOverlay = null;
  let confettiCanvas = null;
  let confettiCtx = null;
  let reducedMotion = false;
  let atmosphereEl = null;
  let scoreAnimFrame = null;
  let startLeaderboardEl = null;
  let resultsLeaderboardEl = null;
  let shutterEl = null;
  let shutterTimer = null;
  let sealedChambers = {};
  let bloomTimer = null;

  function getLeaderboardConfig() {
    return window.GAME_DATA && window.GAME_DATA.leaderboard
      ? window.GAME_DATA.leaderboard
      : { showToUsers: false, facilitatorParam: "facilitator" };
  }

  function isFacilitatorMode() {
    const cfg = getLeaderboardConfig();
    const param = cfg.facilitatorParam || "facilitator";
    return new URLSearchParams(window.location.search).get(param) === "1";
  }

  function shouldShowLeaderboard() {
    const cfg = getLeaderboardConfig();
    return cfg.showToUsers === true || isFacilitatorMode();
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function isIconImage(icon) {
    return typeof icon === "string" && /\.(png|svg|webp|jpe?g)(\?|$)/i.test(icon);
  }

  function chamberIconHtml(chamber, className) {
    const label = chamber.iconLabel || chamber.name || "";
    const cls = className || "chamber-icon";
    if (isIconImage(chamber.icon)) {
      return (
        '<img class="' + cls + '" src="' + chamber.icon + '" alt="' + label +
        '" width="48" height="48" decoding="async">'
      );
    }
    return '<span class="' + cls + ' stamp-mark">' + (chamber.iconLabel || chamber.icon || "") + "</span>";
  }

  function applyChamberIcon(el, chamber, className) {
    if (!el) return;
    el.className = className || "chamber-badge";
    el.innerHTML = "";
    if (isIconImage(chamber.icon)) {
      const img = document.createElement("img");
      img.className = "chamber-badge__img";
      img.src = chamber.icon;
      img.alt = "";
      img.width = 72;
      img.height = 72;
      img.decoding = "async";
      el.appendChild(img);
      return;
    }
    el.classList.add("stamp-mark");
    el.textContent = chamber.iconLabel || chamber.icon || "";
  }

  window.GameUI = {
    chamberIconHtml: chamberIconHtml,
    applyChamberIcon: applyChamberIcon,

    init: function (chamberData) {
      chambers = chamberData;
      reducedMotion = prefersReducedMotion();
      progressEl = document.getElementById("vault-progress");
      typeBadgeEl = document.getElementById("question-type-badge");
      debriefPanelEl = document.getElementById("debrief-panel");
      scorePopContainer = document.getElementById("score-pop-container");
      snipOverlay = document.getElementById("snip-overlay");
      confettiCanvas = document.getElementById("confetti-canvas");
      atmosphereEl = document.getElementById("chamber-atmosphere");
      startLeaderboardEl = document.getElementById("start-leaderboard");
      resultsLeaderboardEl = document.getElementById("results-leaderboard");
      shutterEl = document.getElementById("vault-shutter");
      sealedChambers = {};

      this.syncLeaderboardVisibility();

      if (confettiCanvas) {
        confettiCtx = confettiCanvas.getContext("2d");
        this.resizeConfetti();
        window.addEventListener("resize", this.resizeConfetti.bind(this));
      }

      this.buildProgressMap();
    },

    resizeConfetti: function () {
      if (!confettiCanvas) return;
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
    },

    buildProgressMap: function () {
      if (!progressEl) return;
      progressEl.innerHTML = "";
      chambers.forEach(function (ch, i) {
        const step = document.createElement("div");
        step.className = "vault-progress__step";
        step.dataset.chamber = String(i);

        const dots = document.createElement("div");
        dots.className = "vault-progress__dots";
        dots.setAttribute("aria-hidden", "true");
        ch.questions.forEach(function (_q, qi) {
          const dot = document.createElement("span");
          dot.className = "vault-progress__dot";
          dot.dataset.question = String(qi);
          dots.appendChild(dot);
        });

        step.innerHTML =
          chamberIconHtml(ch, "vault-progress__icon") +
          '<span class="vault-progress__label">' + ch.name.replace(" Chamber", "") + "</span>";
        step.appendChild(dots);
        const state = document.createElement("span");
        state.className = "vault-progress__state";
        step.appendChild(state);
        progressEl.appendChild(step);
      });
    },

    updateProgress: function (chamberIndex, questionIndex, completedChambers) {
      if (!progressEl) return;
      progressEl.querySelectorAll(".vault-progress__step").forEach(function (step, i) {
        step.classList.remove(
          "vault-progress__step--done",
          "vault-progress__step--active",
          "vault-progress__step--locked"
        );
        const stateEl = step.querySelector(".vault-progress__state");
        const dots = step.querySelectorAll(".vault-progress__dot");
        const qTotal = chambers[i].questions.length;
        const isDone = i < chamberIndex || (completedChambers && completedChambers.indexOf(i) !== -1);
        const isActive = i === chamberIndex && !isDone;

        dots.forEach(function (dot, qi) {
          dot.classList.remove(
            "vault-progress__dot--done",
            "vault-progress__dot--active",
            "vault-progress__dot--pending"
          );
          if (isDone || qi < questionIndex) {
            dot.classList.add("vault-progress__dot--done");
          } else if (isActive && qi === questionIndex) {
            dot.classList.add("vault-progress__dot--active");
          } else {
            dot.classList.add("vault-progress__dot--pending");
          }
        });

        if (isDone) {
          const wasSealed = !!sealedChambers[i];
          step.classList.add("vault-progress__step--done");
          stateEl.textContent = "✓";
          if (!wasSealed && !reducedMotion) {
            sealedChambers[i] = true;
            step.classList.remove("vault-progress__step--seal");
            void step.offsetWidth;
            step.classList.add("vault-progress__step--seal");
          } else {
            sealedChambers[i] = true;
          }
        } else if (isActive) {
          step.classList.add("vault-progress__step--active");
          stateEl.textContent = "Q" + (questionIndex + 1) + "/" + qTotal;
        } else {
          step.classList.add("vault-progress__step--locked");
          stateEl.textContent = "🔒";
        }
      });
    },

    setChamberTheme: function (chamber) {
      if (!chamber) return;
      document.body.dataset.chamber = chamber.id;
      document.body.style.setProperty("--chamber-color", chamber.wireColor || "#f0a030");
      if (atmosphereEl) {
        atmosphereEl.dataset.chamber = chamber.id;
      }
    },

    clearChamberTheme: function () {
      delete document.body.dataset.chamber;
      document.body.style.removeProperty("--chamber-color");
      if (atmosphereEl) {
        delete atmosphereEl.dataset.chamber;
      }
    },

    setTypeBadge: function (type) {
      if (!typeBadgeEl) return;
      typeBadgeEl.textContent = TYPE_LABELS[type] || type;
      typeBadgeEl.dataset.type = type;
      typeBadgeEl.hidden = false;
    },

    hideTypeBadge: function () {
      if (typeBadgeEl) typeBadgeEl.hidden = true;
    },

    showDebrief: function (question, type, show) {
      if (!debriefPanelEl || !show) {
        if (debriefPanelEl) debriefPanelEl.hidden = true;
        return;
      }
      const text = question.explain || GameUI.getCorrectAnswerText(question, type);
      debriefPanelEl.innerHTML =
        '<p class="debrief-panel__label">Debrief</p><p class="debrief-panel__text">' + text + "</p>";
      debriefPanelEl.hidden = false;
    },

    hideDebrief: function () {
      if (debriefPanelEl) debriefPanelEl.hidden = true;
    },

    getCorrectAnswerText: function (question, type) {
      if (type === "fill") {
        const answers = question.answers || [question.answer];
        return "Correct answer: " + answers[0];
      }
      if (type === "checkbox") {
        return "Correct options: " + question.correct.map(function (i) {
          return question.options[i];
        }).join("; ");
      }
      return "Correct answer: " + question.options[question.correct];
    },

    showScorePop: function (points, bonus) {
      if (!scorePopContainer || reducedMotion) return;
      const pop = document.createElement("div");
      pop.className = "score-pop";
      pop.textContent = bonus
        ? "+" + points + " (" + (points - bonus) + "+" + bonus + " speed)"
        : "+" + points;
      scorePopContainer.appendChild(pop);
      window.setTimeout(function () { pop.remove(); }, 1200);
    },

    triggerWireSnip: function () {
      if (snipOverlay && !reducedMotion) {
        snipOverlay.classList.remove("snip-overlay--active");
        void snipOverlay.offsetWidth;
        snipOverlay.classList.add("snip-overlay--active");
      }
      if (window.GameSounds) GameSounds.snip();
    },

    flashWireCut: function (chamberIndex, questionIndex) {
      const frame = document.querySelector(".bomb-stage__frame");
      if (frame && !reducedMotion) {
        frame.classList.remove("bomb-device--wire-cut");
        void frame.offsetWidth;
        frame.classList.add("bomb-device--wire-cut");
        window.setTimeout(function () {
          frame.classList.remove("bomb-device--wire-cut");
        }, 700);
      }

      if (!progressEl) return;
      const step = progressEl.querySelector('.vault-progress__step[data-chamber="' + chamberIndex + '"]');
      if (!step) return;
      const dot = step.querySelector('.vault-progress__dot[data-question="' + questionIndex + '"]');
      if (dot && !reducedMotion) {
        dot.classList.remove("vault-progress__dot--flash");
        void dot.offsetWidth;
        dot.classList.add("vault-progress__dot--flash");
        window.setTimeout(function () {
          dot.classList.remove("vault-progress__dot--flash");
        }, 700);
      }
      if (step && !reducedMotion) {
        step.classList.remove("vault-progress__step--wire-cut");
        void step.offsetWidth;
        step.classList.add("vault-progress__step--wire-cut");
        window.setTimeout(function () {
          step.classList.remove("vault-progress__step--wire-cut");
        }, 700);
      }
    },

    staggerOptions: function (container) {
      if (!container || reducedMotion) return;
      const items = container.querySelectorAll(".option, .checkbox-option, .fill-form");
      items.forEach(function (el, index) {
        el.classList.add("option-enter");
        el.style.setProperty("--enter-index", String(index));
      });
    },

    animateScore: function (element, targetScore, duration) {
      if (!element) return;
      if (scoreAnimFrame) {
        cancelAnimationFrame(scoreAnimFrame);
        scoreAnimFrame = null;
      }

      const from = Number(element.textContent) || 0;
      const to = targetScore;
      if (reducedMotion || from === to) {
        element.textContent = String(to);
        element.classList.remove("hud__value--tick");
        return;
      }

      const start = performance.now();
      const span = Math.max(0, to - from);

      function frame(now) {
        const t = Math.min(1, (now - start) / (duration || 500));
        const eased = 1 - Math.pow(1 - t, 3);
        element.textContent = String(Math.round(from + span * eased));
        if (t < 1) {
          scoreAnimFrame = requestAnimationFrame(frame);
        } else {
          element.textContent = String(to);
          scoreAnimFrame = null;
          element.classList.remove("hud__value--tick");
        }
      }

      element.classList.add("hud__value--tick");
      scoreAnimFrame = requestAnimationFrame(frame);
    },

    setTimerUrgency: function (level) {
      document.body.classList.remove("timer-warning", "timer-danger");
      if (level === "warning") {
        document.body.classList.add("timer-warning");
      } else if (level === "danger") {
        document.body.classList.add("timer-danger");
      }
    },

    clearTimerUrgency: function () {
      document.body.classList.remove("timer-warning", "timer-danger");
    },

    shakeQuestionCard: function () {
      if (reducedMotion) return;
      const card = document.querySelector(".question-card");
      if (card) {
        card.classList.remove("question-card--shake");
        void card.offsetWidth;
        card.classList.add("question-card--shake");
      }
    },

    animateScreen: function (screenName, animClass) {
      if (reducedMotion) return;
      const map = {
        chamber: document.getElementById("screen-chamber"),
        chamberClear: document.getElementById("screen-chamber-clear"),
        fail: document.getElementById("screen-fail"),
        results: document.getElementById("screen-results")
      };
      const screen = map[screenName];
      if (screen) {
        const inner = screen.querySelector(".screen__inner");
        if (inner) {
          inner.classList.remove(animClass);
          void inner.offsetWidth;
          inner.classList.add(animClass);
        }
      }
    },

    showConfetti: function () {
      if (!confettiCtx || reducedMotion) return;
      const w = confettiCanvas.width;
      const h = confettiCanvas.height;
      const colors = ["#c9921a", "#f0c45a", "#3dd68c", "#59c2ff", "#f07178", "#ebe8e1"];
      const pieces = [];
      for (let i = 0; i < 140; i += 1) {
        const ribbon = Math.random() > 0.45;
        pieces.push({
          x: Math.random() * w,
          y: Math.random() * h * -0.4 - 20,
          w: ribbon ? 3 + Math.random() * 4 : 5 + Math.random() * 7,
          h: ribbon ? 10 + Math.random() * 16 : 4 + Math.random() * 5,
          color: colors[Math.floor(Math.random() * colors.length)],
          vy: 2.2 + Math.random() * 4.5,
          vx: -2.5 + Math.random() * 5,
          rot: Math.random() * 360,
          vr: -10 + Math.random() * 20,
          gravity: 0.045 + Math.random() * 0.04,
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.08 + Math.random() * 0.1
        });
      }

      let frame = 0;
      function draw() {
        confettiCtx.clearRect(0, 0, w, h);
        pieces.forEach(function (p) {
          p.vy += p.gravity;
          p.wobble += p.wobbleSpeed;
          p.x += p.vx + Math.sin(p.wobble) * 0.8;
          p.y += p.vy;
          p.rot += p.vr;
          confettiCtx.save();
          confettiCtx.translate(p.x, p.y);
          confettiCtx.rotate((p.rot * Math.PI) / 180);
          confettiCtx.fillStyle = p.color;
          confettiCtx.globalAlpha = Math.max(0, 1 - frame / 150);
          confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          confettiCtx.restore();
        });
        frame += 1;
        if (frame < 150) {
          requestAnimationFrame(draw);
        } else {
          confettiCtx.clearRect(0, 0, w, h);
        }
      }
      draw();
    },

    playVaultShutter: function (onMidpoint, onComplete) {
      if (reducedMotion || !shutterEl) {
        if (typeof onMidpoint === "function") onMidpoint();
        if (typeof onComplete === "function") onComplete();
        return;
      }

      if (shutterTimer) {
        window.clearTimeout(shutterTimer);
        shutterTimer = null;
      }

      shutterEl.classList.remove("vault-shutter--play");
      void shutterEl.offsetWidth;
      shutterEl.classList.add("vault-shutter--play");
      shutterEl.setAttribute("aria-hidden", "false");

      window.setTimeout(function () {
        if (typeof onMidpoint === "function") onMidpoint();
      }, 290);

      shutterTimer = window.setTimeout(function () {
        shutterEl.classList.remove("vault-shutter--play");
        shutterEl.setAttribute("aria-hidden", "true");
        shutterTimer = null;
        if (typeof onComplete === "function") onComplete();
      }, 900);
    },

    celebrateCorrect: function () {
      if (reducedMotion) return;
      document.body.classList.remove("vault-correct-bloom");
      void document.body.offsetWidth;
      document.body.classList.add("vault-correct-bloom");
      const card = document.querySelector(".question-card");
      if (card) {
        card.classList.remove("question-card--correct-lock");
        void card.offsetWidth;
        card.classList.add("question-card--correct-lock");
      }
      if (bloomTimer) window.clearTimeout(bloomTimer);
      bloomTimer = window.setTimeout(function () {
        document.body.classList.remove("vault-correct-bloom");
        if (card) card.classList.remove("question-card--correct-lock");
        bloomTimer = null;
      }, 750);
    },

    resetSpectacleState: function () {
      sealedChambers = {};
      document.body.classList.remove("vault-correct-bloom");
      if (shutterEl) {
        shutterEl.classList.remove("vault-shutter--play");
        shutterEl.setAttribute("aria-hidden", "true");
      }
    },

    saveScore: function (name, score, tier) {
      if (!shouldShowLeaderboard()) return [];
      const key = "vault-leaderboard";
      let board = [];
      try {
        board = JSON.parse(localStorage.getItem(key) || "[]");
      } catch (_e) {
        board = [];
      }
      board.push({
        name: name,
        score: score,
        tier: tier,
        date: new Date().toISOString()
      });
      board.sort(function (a, b) { return b.score - a.score; });
      board = board.slice(0, 10);
      localStorage.setItem(key, JSON.stringify(board));
      return board;
    },

    renderLeaderboard: function (container, highlightName) {
      if (!container) return;
      let board = [];
      try {
        board = JSON.parse(localStorage.getItem("vault-leaderboard") || "[]");
      } catch (_e) {
        board = [];
      }

      if (board.length === 0) {
        container.innerHTML = '<p class="leaderboard__empty">No scores yet — be the first!</p>';
        return;
      }

      container.innerHTML = "";
      board.forEach(function (entry, i) {
        const row = document.createElement("div");
        row.className = "leaderboard__row";
        if (entry.name === highlightName) row.classList.add("leaderboard__row--you");
        row.innerHTML =
          '<span class="leaderboard__rank">#' + (i + 1) + "</span>" +
          '<span class="leaderboard__name">' + entry.name + "</span>" +
          '<span class="leaderboard__score">' + entry.score + "</span>";
        container.appendChild(row);
      });
    },

    syncLeaderboardVisibility: function () {
      const show = shouldShowLeaderboard();
      document.body.classList.toggle("leaderboard-visible", show);
      document.body.classList.toggle("mode-facilitator", isFacilitatorMode());
      if (startLeaderboardEl) startLeaderboardEl.hidden = !show;
      if (resultsLeaderboardEl) resultsLeaderboardEl.hidden = !show;
    },

    renderLeaderboardIfVisible: function (container, highlightName) {
      if (!shouldShowLeaderboard()) return;
      this.renderLeaderboard(container, highlightName);
    },

    shouldShowLeaderboard: function () {
      return shouldShowLeaderboard();
    },

    isFacilitatorMode: function () {
      return isFacilitatorMode();
    },

    toggleBombCollapsed: function () {
      const stage = document.getElementById("bomb-stage");
      if (stage) stage.classList.toggle("bomb-stage--collapsed");
    }
  };
})();
