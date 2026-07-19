(function () {
  "use strict";

  const data = window.GAME_DATA;
  const TIME_BONUS_MAX = data.timeBonusMax ?? 50;
  const RING_CIRCUMFERENCE = 97.4;
  const PRACTICE_TIME_MIN = data.practice?.timeLimitMin ?? 90;
  const params = new URLSearchParams(window.location.search);
  const debriefForced = params.get("debrief") === "1";

  const state = {
    totalScore: 0,
    chamberIndex: 0,
    questionIndex: 0,
    chamberScores: {},
    answers: [],
    completedChambers: [],
    timerId: null,
    timeLeft: 0,
    timeLimit: 0,
    locked: false,
    gameOver: false,
    mode: "full",
    playerName: "Agent",
    lastTickSecond: -1
  };

  const screens = {
    start: document.getElementById("screen-start"),
    briefing: document.getElementById("screen-briefing"),
    chamber: document.getElementById("screen-chamber"),
    question: document.getElementById("screen-question"),
    chamberClear: document.getElementById("screen-chamber-clear"),
    fail: document.getElementById("screen-fail"),
    results: document.getElementById("screen-results")
  };

  const els = {
    btnStart: document.getElementById("btn-start"),
    btnPractice: document.getElementById("btn-practice"),
    btnBriefingGo: document.getElementById("btn-briefing-go"),
    btnBriefingSkip: document.getElementById("btn-briefing-skip"),
    btnEnterChamber: document.getElementById("btn-enter-chamber"),
    btnNextChamber: document.getElementById("btn-next-chamber"),
    btnRestart: document.getElementById("btn-restart"),
    btnRetry: document.getElementById("btn-retry"),
    btnSound: document.getElementById("btn-sound"),
    btnBombToggle: document.getElementById("btn-bomb-toggle"),
    playerName: document.getElementById("player-name"),
    playerNameError: document.getElementById("player-name-error"),
    briefingMode: document.getElementById("briefing-mode"),
    vaultProgress: document.getElementById("vault-progress"),
    explosionFlash: document.getElementById("explosion-flash"),
    chamberNumber: document.getElementById("chamber-number"),
    chamberTotal: document.getElementById("chamber-total"),
    chamberIcon: document.getElementById("chamber-icon"),
    chamberName: document.getElementById("chamber-name"),
    chamberDesc: document.getElementById("chamber-desc"),
    hudScore: document.getElementById("hud-score"),
    hudChamber: document.getElementById("hud-chamber"),
    hudProgress: document.getElementById("hud-progress"),
    timer: document.getElementById("timer"),
    timerRing: document.getElementById("timer-ring"),
    timerText: document.getElementById("timer-text"),
    questionText: document.getElementById("question-text"),
    options: document.getElementById("options"),
    questionHint: document.getElementById("question-hint"),
    questionCard: document.getElementById("question-card"),
    clearChamberName: document.getElementById("clear-chamber-name"),
    clearChamberMsg: document.getElementById("clear-chamber-msg"),
    clearChamberScore: document.getElementById("clear-chamber-score"),
    resultsTierEyebrow: document.getElementById("results-tier-eyebrow"),
    resultsTitle: document.getElementById("results-title"),
    resultsScore: document.getElementById("results-score"),
    resultsMessage: document.getElementById("results-message"),
    resultsPlayer: document.getElementById("results-player"),
    tierBadge: document.getElementById("tier-badge"),
    breakdown: document.getElementById("breakdown"),
    resultsLeaderboard: document.getElementById("results-leaderboard"),
    startLeaderboard: document.getElementById("start-leaderboard"),
    failScore: document.getElementById("fail-score"),
    failMessage: document.getElementById("fail-message"),
    failDetail: document.getElementById("fail-detail"),
    failAnswer: document.getElementById("fail-answer")
  };

  function showScreen(name) {
    Object.values(screens).forEach(function (screen) {
      if (!screen) return;
      screen.classList.remove("screen--active");
      screen.hidden = true;
    });
    screens[name].classList.add("screen--active");
    screens[name].hidden = false;
  }

  function shouldDebrief() {
    return debriefForced || state.mode === "practice";
  }

  function isPractice() {
    return state.mode === "practice";
  }

  function getChamber() {
    return data.chambers[state.chamberIndex];
  }

  function getQuestion() {
    return getChamber().questions[state.questionIndex];
  }

  function getQuestionType(question) {
    if (question.type === "fill") return "fill";
    if (question.type === "checkbox" || Array.isArray(question.correct)) return "checkbox";
    return "choice";
  }

  function isFillQuestion(question) {
    return getQuestionType(question) === "fill";
  }

  function isCheckboxQuestion(question) {
    return getQuestionType(question) === "checkbox";
  }

  function getEffectiveTimeLimit(question) {
    if (isPractice()) {
      return Math.max(question.timeLimit, PRACTICE_TIME_MIN);
    }
    return question.timeLimit;
  }

  function getCorrectIndices(question) {
    if (isCheckboxQuestion(question)) {
      return question.correct.slice().sort(function (a, b) { return a - b; });
    }
    return [question.correct];
  }

  function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  function checkCheckboxAnswer(question, selectedIndices) {
    const sorted = selectedIndices.slice().sort(function (a, b) { return a - b; });
    return arraysEqual(sorted, getCorrectIndices(question));
  }

  function normalizeText(value) {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
  }

  function checkFillAnswer(question, text) {
    const normalized = normalizeText(text);
    const accepted = question.answers || [question.answer];
    return accepted.some(function (answer) {
      return normalizeText(answer) === normalized;
    });
  }

  function getPlayerName() {
    return (els.playerName.value || "").trim();
  }

  function validatePlayerName() {
    const name = getPlayerName();
    const field = els.playerName.closest(".name-field");

    if (!name) {
      if (field) field.classList.add("name-field--error");
      if (els.playerNameError) els.playerNameError.hidden = false;
      els.playerName.focus();
      return false;
    }

    if (field) field.classList.remove("name-field--error");
    if (els.playerNameError) els.playerNameError.hidden = true;
    return true;
  }

  function clearPlayerNameError() {
    const field = els.playerName.closest(".name-field");
    if (field) field.classList.remove("name-field--error");
    if (els.playerNameError) els.playerNameError.hidden = true;
  }

  function resetGame() {
    clearTimer();
    state.totalScore = 0;
    state.chamberIndex = 0;
    state.questionIndex = 0;
    state.chamberScores = {};
    state.answers = [];
    state.completedChambers = [];
    state.locked = false;
    state.gameOver = false;
    state.lastTickSecond = -1;
    data.chambers.forEach(function (ch) {
      state.chamberScores[ch.id] = 0;
    });
    if (window.BombWidget) BombWidget.reset();
    if (window.BombWidget) BombWidget.setTimerCritical(false);
    if (els.explosionFlash) {
      els.explosionFlash.hidden = true;
      els.explosionFlash.classList.remove("explosion-flash--active");
    }
    if (els.vaultProgress) els.vaultProgress.hidden = true;
    document.body.classList.remove("vault-exploded", "mode-practice");
    if (window.GameUI) GameUI.hideDebrief();
    if (window.GameUI) GameUI.clearChamberTheme();
    if (els.failAnswer) els.failAnswer.hidden = true;
    if (els.tierBadge) els.tierBadge.hidden = true;
  }

  function beginSession(mode) {
    if (!validatePlayerName()) return;
    if (window.GameSounds) GameSounds.unlock();
    state.mode = mode;
    state.playerName = getPlayerName();
    resetGame();
    state.mode = mode;
    state.playerName = getPlayerName();
    document.body.classList.toggle("mode-practice", isPractice());

    if (els.briefingMode) {
      els.briefingMode.textContent = isPractice()
        ? "Practice mode: extended timers, no detonation, debrief enabled."
        : "Full mission: timers are strict — any timeout detonates the bomb.";
    }
    showScreen("briefing");
  }

  function launchMission() {
    if (window.BombWidget) BombWidget.show();
    if (els.vaultProgress) els.vaultProgress.hidden = false;
    if (window.GameUI) GameUI.updateProgress(0, 0, state.completedChambers);
    history.pushState({ game: true }, "");
    showChamberIntro();
  }

  function cutCurrentWire() {
    if (window.BombWidget) BombWidget.cut(state.chamberIndex, state.questionIndex);
    if (window.GameUI) {
      GameUI.triggerWireSnip();
      GameUI.flashWireCut(state.chamberIndex, state.questionIndex);
    }
  }

  function showChamberIntro() {
    const chamber = getChamber();
    els.chamberNumber.textContent = String(state.chamberIndex + 1);
    els.chamberTotal.textContent = String(data.chambers.length);
    els.chamberIcon.textContent = chamber.icon;
    els.chamberName.textContent = chamber.name;
    els.chamberDesc.textContent = chamber.description;
    if (window.GameUI) {
      GameUI.setChamberTheme(chamber);
      GameUI.updateProgress(state.chamberIndex, state.questionIndex, state.completedChambers);
    }
    showScreen("chamber");
    if (window.GameUI) GameUI.animateScreen("chamber", "anim-door-slide");
    if (window.GameSounds) GameSounds.door();
  }

  function renderChoiceOptions(question) {
    els.options.setAttribute("role", "listbox");
    els.options.setAttribute("aria-label", "Answer options");
    question.options.forEach(function (label, index) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option";
      btn.setAttribute("role", "option");
      btn.dataset.index = String(index);
      btn.innerHTML = '<span class="option__key">' + (index + 1) + "</span><span>" + label + "</span>";
      btn.addEventListener("click", function () {
        submitChoiceAnswer(index);
      });
      els.options.appendChild(btn);
    });
  }

  function showQuestion() {
    const chamber = getChamber();
    const question = getQuestion();
    const qType = getQuestionType(question);
    state.locked = false;

    if (window.GameUI) {
      GameUI.hideDebrief();
      GameUI.setChamberTheme(chamber);
      GameUI.setTypeBadge(qType);
      GameUI.updateProgress(state.chamberIndex, state.questionIndex, state.completedChambers);
    }

    els.hudScore.textContent = String(state.totalScore);
    els.hudChamber.textContent = chamber.name;
    els.hudProgress.textContent =
      "Question " + (state.questionIndex + 1) + " of " + chamber.questions.length;
    els.questionText.textContent = question.text;
    els.options.innerHTML = "";

    if (isFillQuestion(question)) {
      els.questionHint.textContent = "Type your answer and press Enter or Submit.";
      els.questionHint.className = "hint";

      const form = document.createElement("form");
      form.className = "fill-form";

      const input = document.createElement("input");
      input.type = "text";
      input.className = "fill-input";
      input.autocomplete = "off";
      input.spellcheck = false;
      input.setAttribute("aria-label", "Your answer");
      input.placeholder = "Type your answer…";

      const submit = document.createElement("button");
      submit.type = "submit";
      submit.className = "btn btn--primary fill-submit";
      submit.textContent = "Submit";

      form.appendChild(input);
      form.appendChild(submit);
      els.options.appendChild(form);

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        submitTextAnswer(input.value);
      });

      showScreen("question");
      if (window.GameUI) GameUI.staggerOptions(els.options);
      startTimer(getEffectiveTimeLimit(question));
      input.focus();
    } else if (isCheckboxQuestion(question)) {
      els.questionHint.textContent = "Select all that apply, then press Submit.";
      els.questionHint.className = "hint";

      const form = document.createElement("form");
      form.className = "checkbox-form";

      question.options.forEach(function (label, index) {
        const option = document.createElement("label");
        option.className = "checkbox-option";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.className = "checkbox-option__input";
        input.dataset.index = String(index);

        const text = document.createElement("span");
        text.className = "checkbox-option__text";
        text.textContent = label;

        option.appendChild(input);
        option.appendChild(text);
        form.appendChild(option);
      });

      const submit = document.createElement("button");
      submit.type = "submit";
      submit.className = "btn btn--primary checkbox-submit";
      submit.textContent = "Submit";
      form.appendChild(submit);
      els.options.appendChild(form);

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        submitCheckboxAnswer();
      });

      showScreen("question");
      if (window.GameUI) GameUI.staggerOptions(els.options);
      startTimer(getEffectiveTimeLimit(question));
    } else {
      els.questionHint.textContent = "Choose an answer (keys 1–4) before time runs out.";
      els.questionHint.className = "hint";
      renderChoiceOptions(question);
      showScreen("question");
      if (window.GameUI) GameUI.staggerOptions(els.options);
      startTimer(getEffectiveTimeLimit(question));
    }
  }

  function startTimer(seconds) {
    clearTimer();
    state.timeLimit = seconds;
    state.timeLeft = seconds;
    state.lastTickSecond = -1;
    updateTimerDisplay();

    state.timerId = window.setInterval(function () {
      state.timeLeft -= 1;
      updateTimerDisplay();

      if (state.timeLeft <= 0) {
        clearTimer();
        if (isPractice()) {
          handlePracticeTimeout();
        } else {
          triggerGameOver();
        }
      }
    }, 1000);
  }

  function clearTimer() {
    if (state.timerId !== null) {
      window.clearInterval(state.timerId);
      state.timerId = null;
    }
    if (window.BombWidget) BombWidget.setTimerCritical(false);
    if (window.GameUI) GameUI.clearTimerUrgency();
  }

  function updateTimerDisplay() {
    const ratio = state.timeLimit > 0 ? state.timeLeft / state.timeLimit : 0;
    els.timerText.textContent = String(Math.max(0, state.timeLeft));
    els.timerRing.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - ratio));

    els.timer.classList.remove("timer--warning", "timer--danger");
    if (state.timeLeft <= 5) {
      els.timer.classList.add("timer--danger");
      if (window.BombWidget) BombWidget.setTimerCritical(true);
      if (window.GameUI) GameUI.setTimerUrgency("danger");
      if (state.timeLeft > 0 && state.timeLeft !== state.lastTickSecond) {
        state.lastTickSecond = state.timeLeft;
        if (window.GameSounds) GameSounds.tick();
        if (window.GameUI) GameUI.shakeQuestionCard();
      }
    } else if (state.timeLeft <= 10) {
      els.timer.classList.add("timer--warning");
      if (window.BombWidget) BombWidget.setTimerCritical(false);
      if (window.GameUI) GameUI.setTimerUrgency("warning");
    } else {
      if (window.BombWidget) BombWidget.setTimerCritical(false);
      if (window.GameUI) GameUI.clearTimerUrgency();
    }
  }

  function lockQuestion() {
    state.locked = true;
    els.options.querySelectorAll(
      ".option, .fill-input, .fill-submit, .checkbox-option__input, .checkbox-submit"
    ).forEach(function (el) {
      el.disabled = true;
    });
  }

  function calcPoints(question, correct, timeLeft) {
    if (!correct) return { total: 0, bonus: 0 };
    const limit = state.timeLimit || question.timeLimit;
    const bonus = Math.round((timeLeft / limit) * TIME_BONUS_MAX);
    return { total: question.basePoints + bonus, bonus: bonus };
  }

  function getPrimaryFillAnswer(question) {
    const accepted = question.answers || [question.answer];
    return accepted[0];
  }

  function recordAnswer(question, response, timedOut) {
    const chamber = getChamber();
    let correct = false;

    if (!timedOut) {
      if (isFillQuestion(question)) {
        correct = checkFillAnswer(question, response);
      } else if (isCheckboxQuestion(question)) {
        correct = checkCheckboxAnswer(question, response);
      } else {
        correct = response === question.correct;
      }
    }

    const pts = calcPoints(question, correct, state.timeLeft);

    state.totalScore += pts.total;
    state.chamberScores[chamber.id] += pts.total;
    state.answers.push({
      chamberId: chamber.id,
      questionId: question.id,
      type: getQuestionType(question),
      correct: correct,
      timedOut: timedOut,
      points: pts.total,
      response: response
    });

    return { correct: correct, points: pts.total, bonus: pts.bonus, timedOut: timedOut };
  }

  function highlightChoiceOptions(question, selectedIndex, timedOut) {
    els.options.querySelectorAll(".option").forEach(function (btn, index) {
      if (index === question.correct) {
        btn.classList.add("option--correct");
      } else if (!timedOut && index === selectedIndex) {
        btn.classList.add("option--wrong");
      }
    });
  }

  function highlightFillInput(correct) {
    const input = els.options.querySelector(".fill-input");
    if (input) input.classList.add(correct ? "fill-input--correct" : "fill-input--wrong");
  }

  function highlightCheckboxOptions(question, selectedIndices, timedOut) {
    const correctSet = getCorrectIndices(question);
    const selectedSet = timedOut ? [] : selectedIndices;

    els.options.querySelectorAll(".checkbox-option").forEach(function (option, index) {
      const isCorrect = correctSet.indexOf(index) !== -1;
      const isSelected = selectedSet.indexOf(index) !== -1;
      if (isCorrect) option.classList.add("checkbox-option--correct");
      else if (isSelected) option.classList.add("checkbox-option--wrong");
      else if (timedOut) option.classList.add("checkbox-option--missed");
    });
  }

  function getSelectedCheckboxIndices() {
    const indices = [];
    els.options.querySelectorAll(".checkbox-option__input:checked").forEach(function (input) {
      indices.push(Number(input.dataset.index));
    });
    return indices;
  }

  function buildFeedbackMessage(question, result) {
    const qType = getQuestionType(question);
    if (result.correct) {
      return result.bonus > 0
        ? "+" + result.points + " pts (" + question.basePoints + " + " + result.bonus + " speed bonus)"
        : "+" + result.points + " points!";
    }
    if (qType === "fill") {
      return "Incorrect — answer: " + getPrimaryFillAnswer(question);
    }
    if (qType === "checkbox") {
      return "Incorrect — see highlighted correct options.";
    }
    return "Incorrect — answer: " + question.options[question.correct];
  }

  function finishQuestion(result) {
    const question = getQuestion();
    const qType = getQuestionType(question);
    cutCurrentWire();

    if (result.correct) {
      if (window.GameSounds) GameSounds.correct();
      if (window.GameUI) GameUI.showScorePop(result.points, result.bonus);
    } else {
      if (window.GameSounds) GameSounds.wrong();
    }

    if (shouldDebrief()) {
      window.GameUI.showDebrief(question, qType, true);
    }

    els.questionHint.textContent = buildFeedbackMessage(question, result);
    els.questionHint.className = "hint " + (result.correct ? "hint--success" : "hint--danger");
    if (window.GameUI) {
      GameUI.animateScore(els.hudScore, state.totalScore);
    } else {
      els.hudScore.textContent = String(state.totalScore);
    }

    window.setTimeout(advanceQuestion, shouldDebrief() ? 2200 : 1600);
  }

  function submitChoiceAnswer(selectedIndex) {
    if (state.locked || state.gameOver) return;
    lockQuestion();
    clearTimer();
    const question = getQuestion();
    const result = recordAnswer(question, selectedIndex, false);
    highlightChoiceOptions(question, selectedIndex, false);
    finishQuestion(result);
  }

  function submitTextAnswer(text) {
    if (state.locked || state.gameOver) return;
    if (!text.trim()) return;
    lockQuestion();
    clearTimer();
    const question = getQuestion();
    const result = recordAnswer(question, text, false);
    highlightFillInput(result.correct);
    finishQuestion(result);
  }

  function submitCheckboxAnswer() {
    if (state.locked || state.gameOver) return;
    const selected = getSelectedCheckboxIndices();
    if (selected.length === 0) return;
    lockQuestion();
    clearTimer();
    const question = getQuestion();
    const result = recordAnswer(question, selected, false);
    highlightCheckboxOptions(question, selected, false);
    finishQuestion(result);
  }

  function handlePracticeTimeout() {
    if (state.locked || state.gameOver) return;
    state.locked = true;
    lockQuestion();
    const question = getQuestion();
    recordAnswer(question, null, true);

    if (isFillQuestion(question)) {
      els.questionHint.textContent = "Time's up (practice) — no detonation.";
    } else if (isCheckboxQuestion(question)) {
      highlightCheckboxOptions(question, [], true);
      els.questionHint.textContent = "Time's up (practice) — see correct options.";
    } else {
      highlightChoiceOptions(question, -1, true);
      els.questionHint.textContent = "Time's up (practice) — see correct answer.";
    }
    els.questionHint.className = "hint hint--danger";
    if (shouldDebrief()) GameUI.showDebrief(question, getQuestionType(question), true);
    cutCurrentWire();
    window.setTimeout(advanceQuestion, 2200);
  }

  function playExplosionFlash() {
    if (!els.explosionFlash) return;
    els.explosionFlash.hidden = false;
    els.explosionFlash.classList.remove("explosion-flash--active");
    void els.explosionFlash.offsetWidth;
    els.explosionFlash.classList.add("explosion-flash--active");
  }

  function triggerGameOver() {
    if (state.gameOver || state.locked) return;
    state.gameOver = true;
    lockQuestion();

    const question = getQuestion();
    const qType = getQuestionType(question);
    recordAnswer(question, null, true);

    if (isFillQuestion(question)) {
      els.questionHint.textContent = "Time's up — the bomb is detonating!";
    } else if (isCheckboxQuestion(question)) {
      highlightCheckboxOptions(question, [], true);
      els.questionHint.textContent = "Time's up — the bomb is detonating!";
    } else {
      highlightChoiceOptions(question, -1, true);
      els.questionHint.textContent = "Time's up — the bomb is detonating!";
    }
    els.questionHint.className = "hint hint--danger";

    if (shouldDebrief()) GameUI.showDebrief(question, qType, true);

    window.setTimeout(function () {
      if (window.BombWidget) BombWidget.explode();
      if (window.GameSounds) GameSounds.boom();
      playExplosionFlash();
    }, 500);

    window.setTimeout(showGameOver, 2400);
  }

  function showGameOver() {
    const chamber = getChamber();
    const question = getQuestion();
    const qType = getQuestionType(question);

    els.failScore.textContent = String(state.totalScore);
    els.failMessage.textContent = "Time ran out — the bomb detonated and the vault remains locked.";
    els.failDetail.textContent =
      state.playerName + " · Failed at " + chamber.name +
      " · Question " + (state.questionIndex + 1) + " of " + chamber.questions.length;

    if (els.failAnswer) {
      els.failAnswer.hidden = false;
      els.failAnswer.innerHTML =
        '<p class="fail-answer__label">The answer was:</p><p class="fail-answer__text">' +
        GameUI.getCorrectAnswerText(question, qType) + "</p>";
    }

    showScreen("fail");
    if (window.GameUI) GameUI.animateScreen("fail", "anim-glitch");
  }

  function returnToStart() {
    resetGame();
    if (window.BombWidget) BombWidget.hide();
    if (window.GameUI) GameUI.renderLeaderboardIfVisible(els.startLeaderboard);
    showScreen("start");
  }

  function advanceQuestion() {
    const chamber = getChamber();
    state.questionIndex += 1;

    if (state.questionIndex < chamber.questions.length) {
      showQuestion();
    } else {
      state.completedChambers.push(state.chamberIndex);
      showChamberClear();
    }
  }

  function showChamberClear() {
    const chamber = getChamber();
    const score = state.chamberScores[chamber.id];
    const isLast = state.chamberIndex >= data.chambers.length - 1;

    els.clearChamberName.textContent = chamber.name;
    els.clearChamberMsg.textContent = isLast
      ? "The final door opens. You've reached the exit."
      : "The door grinds open. Onward to the next chamber.";
    els.clearChamberScore.textContent = "+" + score + " points in this chamber";
    els.btnNextChamber.textContent = isLast ? "See Results" : "Next Chamber";

    if (window.GameUI) GameUI.updateProgress(state.chamberIndex, chamber.questions.length, state.completedChambers);
    showScreen("chamberClear");
    if (window.GameUI) GameUI.animateScreen("chamberClear", "anim-door-open");
    if (window.GameSounds) GameSounds.unlock();
  }

  function nextChamber() {
    if (state.chamberIndex >= data.chambers.length - 1) {
      showResults();
      return;
    }
    state.chamberIndex += 1;
    state.questionIndex = 0;
    showChamberIntro();
  }

  function getTier(score) {
    const tiers = data.tiers.slice().sort(function (a, b) {
      return b.minScore - a.minScore;
    });
    return tiers.find(function (t) {
      return score >= t.minScore;
    }) || tiers[tiers.length - 1];
  }

  function showResults() {
    const tier = getTier(state.totalScore);

    els.resultsTierEyebrow.textContent = tier.eyebrow;
    els.resultsTitle.textContent = tier.title;
    els.resultsScore.textContent = String(state.totalScore);
    els.resultsMessage.textContent = tier.message;
    els.resultsPlayer.textContent = state.playerName + (isPractice() ? " · Practice Run" : "");

    if (els.tierBadge) {
      els.tierBadge.textContent = tier.eyebrow;
      els.tierBadge.hidden = false;
    }

    els.breakdown.innerHTML = "";
    data.chambers.forEach(function (chamber) {
      const row = document.createElement("div");
      row.className = "breakdown__row";
      row.innerHTML =
        '<span class="breakdown__name"><span>' + chamber.icon + "</span><span>" + chamber.name + "</span></span>" +
        '<span class="breakdown__score">' + state.chamberScores[chamber.id] + " pts</span>";
      els.breakdown.appendChild(row);
    });

    if (!isPractice()) {
      GameUI.saveScore(state.playerName, state.totalScore, tier.eyebrow);
    }
    GameUI.renderLeaderboardIfVisible(els.resultsLeaderboard, state.playerName);

    showScreen("results");
    if (window.BombWidget) BombWidget.setDefused();
    if (window.GameUI) {
      GameUI.animateScreen("results", "anim-success");
      GameUI.showConfetti();
    }
    if (window.GameSounds) GameSounds.unlock();
  }

  function onKeyDown(event) {
    if (!screens.question.classList.contains("screen--active") || state.locked || state.gameOver) return;

    const question = getQuestion();
    if (isFillQuestion(question) || isCheckboxQuestion(question)) {
      if (event.key === "Enter" && isCheckboxQuestion(question)) {
        event.preventDefault();
        submitCheckboxAnswer();
      }
      return;
    }

    const key = event.key;
    if (key >= "1" && key <= "4") {
      const index = Number(key) - 1;
      if (index < question.options.length) {
        event.preventDefault();
        submitChoiceAnswer(index);
      }
    }
  }

  function updateSoundButton() {
    if (!els.btnSound) return;
    const muted = window.GameSounds && GameSounds.isMuted();
    els.btnSound.textContent = muted ? "🔇" : "🔊";
    els.btnSound.setAttribute("aria-label", muted ? "Unmute sound" : "Mute sound");
  }

  function onPopState() {
    if (
      screens.question.classList.contains("screen--active") ||
      screens.chamberClear.classList.contains("screen--active")
    ) {
      history.pushState({ game: true }, "");
    }
  }

  els.btnStart.addEventListener("click", function () { beginSession("full"); });
  if (els.btnPractice) {
    els.btnPractice.addEventListener("click", function () { beginSession("practice"); });
  }
  els.playerName.addEventListener("input", clearPlayerNameError);
  els.btnBriefingGo.addEventListener("click", launchMission);
  if (els.btnBriefingSkip) {
    els.btnBriefingSkip.addEventListener("click", launchMission);
  }
  els.btnEnterChamber.addEventListener("click", showQuestion);
  els.btnNextChamber.addEventListener("click", nextChamber);
  els.btnRestart.addEventListener("click", returnToStart);
  els.btnRetry.addEventListener("click", returnToStart);

  if (els.btnSound) {
    els.btnSound.addEventListener("click", function () {
      GameSounds.toggleMute();
      updateSoundButton();
    });
  }

  if (els.btnBombToggle) {
    els.btnBombToggle.addEventListener("click", function () {
      GameUI.toggleBombCollapsed();
      const collapsed = document.getElementById("bomb-stage").classList.contains("bomb-stage--collapsed");
      els.btnBombToggle.textContent = collapsed ? "Show bomb" : "Hide bomb";
      els.btnBombToggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
    });
  }

  document.addEventListener("keydown", onKeyDown);
  window.addEventListener("popstate", onPopState);

  if (window.BombWidget) BombWidget.init(data.chambers);
  if (window.GameUI) GameUI.init(data.chambers);
  if (window.GameUI) {
    GameUI.syncLeaderboardVisibility();
    GameUI.renderLeaderboardIfVisible(els.startLeaderboard);
  }
  updateSoundButton();
  els.chamberTotal.textContent = String(data.chambers.length);
})();
