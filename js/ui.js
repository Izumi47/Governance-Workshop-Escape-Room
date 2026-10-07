/**
 * UI helpers: progress map, theming, animations, debrief.
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
  let reducedMotion = false;
  let scoreAnimFrame = null;
  let sealedChambers = {};
  let bloomTimer = null;

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
      sealedChambers = {};

      this.buildProgressMap();
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
      const answered = chambers.map(function (ch, i) {
        if (completedChambers && completedChambers.indexOf(i) !== -1) return ch.questions.length;
        if (i < chamberIndex) return ch.questions.length;
        if (i === chamberIndex) return questionIndex;
        return 0;
      });
      this.updateCategoryProgress(answered, chamberIndex);
    },

    /**
     * @param {number[]} categoryAnswered - answered count per tool/chamber
     * @param {number} activeChamberIndex - chamber of the current question (-1 none)
     */
    updateCategoryProgress: function (categoryAnswered, activeChamberIndex) {
      if (!progressEl) return;
      progressEl.querySelectorAll(".vault-progress__step").forEach(function (step, i) {
        step.classList.remove(
          "vault-progress__step--done",
          "vault-progress__step--active",
          "vault-progress__step--locked",
          "vault-progress__step--partial"
        );
        const stateEl = step.querySelector(".vault-progress__state");
        const dots = step.querySelectorAll(".vault-progress__dot");
        const qTotal = chambers[i].questions.length;
        const doneCount = Math.min(categoryAnswered[i] || 0, qTotal);
        const isDone = doneCount >= qTotal;
        const isActive = i === activeChamberIndex && !isDone;

        dots.forEach(function (dot, qi) {
          dot.classList.remove(
            "vault-progress__dot--done",
            "vault-progress__dot--active",
            "vault-progress__dot--pending"
          );
          if (qi < doneCount) {
            dot.classList.add("vault-progress__dot--done");
          } else if (isActive && qi === doneCount) {
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
          stateEl.textContent = doneCount + "/" + qTotal;
        } else if (doneCount > 0) {
          step.classList.add("vault-progress__step--partial");
          stateEl.textContent = doneCount + "/" + qTotal;
        } else {
          step.classList.add("vault-progress__step--locked");
          stateEl.textContent = "0/" + qTotal;
        }
      });
    },

    flashCategoryProgress: function (chamberIndex, answeredDotIndex) {
      this.flashWireCut(chamberIndex, answeredDotIndex);
    },

    // body[data-chamber] also drives the 3D background motif (js/vault3d.js).
    setChamberTheme: function (chamber) {
      if (!chamber) return;
      document.body.dataset.chamber = chamber.id;
      document.body.style.setProperty("--chamber-color", chamber.wireColor || "#f0a030");
    },

    clearChamberTheme: function () {
      delete document.body.dataset.chamber;
      document.body.style.removeProperty("--chamber-color");
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
      const answerHtml = GameUI.getCorrectAnswerHtml(question, type);
      const explain = question.explain
        ? '<p class="debrief-panel__explain">' + question.explain + "</p>"
        : "";
      debriefPanelEl.innerHTML =
        '<p class="debrief-panel__label">Answer &amp; justification</p>' +
        '<div class="debrief-panel__answer">' + answerHtml + "</div>" +
        explain;
      debriefPanelEl.hidden = false;
    },

    hideDebrief: function () {
      if (debriefPanelEl) debriefPanelEl.hidden = true;
    },

    escapeHtml: function (value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    },

    getCorrectAnswerHtml: function (question, type) {
      if (type === "fill") {
        const answers = question.answers || [question.answer];
        return "<p><strong>Correct answer:</strong> " + GameUI.escapeHtml(answers[0]) + "</p>";
      }
      if (type === "checkbox") {
        const items = question.correct.map(function (i) {
          return "<li>" + GameUI.escapeHtml(question.options[i]) + "</li>";
        }).join("");
        return (
          "<p class=\"debrief-panel__answer-label\"><strong>Correct options:</strong></p>" +
          "<ul class=\"debrief-panel__list\">" + items + "</ul>"
        );
      }
      return (
        "<p><strong>Correct answer:</strong> " +
        GameUI.escapeHtml(question.options[question.correct]) +
        "</p>"
      );
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
      if (reducedMotion || !window.Vault3D) return;
      Vault3D.confetti();
    },

    playVaultShutter: function (onMidpoint, onComplete) {
      if (reducedMotion || !window.Vault3D) {
        if (typeof onMidpoint === "function") onMidpoint();
        if (typeof onComplete === "function") onComplete();
        return;
      }
      Vault3D.shutter(onMidpoint, onComplete);
    },

    celebrateCorrect: function () {
      if (reducedMotion) return;
      // The 3D background watches for this class and fires a green shockwave.
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
    },

    toggleBombCollapsed: function () {
      const stage = document.getElementById("bomb-stage");
      if (stage) stage.classList.toggle("bomb-stage--collapsed");
    }
  };
})();
