/**
 * Per-question timer bomb.
 * One bomb per question — LED shows seconds left; defuse on correct, explode on timeout.
 */
(function () {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const BOMB_X = 210;
  const BOMB_Y = 120;

  let stageEl = null;
  let svgEl = null;
  let statusEl = null;
  let legendEl = null;
  let frameEl = null;
  let displayEl = null;
  let fuseEl = null;
  let bodyGroup = null;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function el(tag, attrs, parent) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (key) {
      if (key === "textContent") {
        node.textContent = attrs[key];
      } else {
        node.setAttribute(key, attrs[key]);
      }
    });
    if (parent) parent.appendChild(node);
    return node;
  }

  function clearExplosionMess() {
    const debris = document.getElementById("bomb-debris");
    if (debris) debris.remove();
    const explosion = document.getElementById("bomb-explosion");
    if (explosion) explosion.remove();
    if (frameEl) frameEl.classList.remove("bomb-stage__frame--destroyed");
    if (bodyGroup) {
      bodyGroup.classList.remove("bomb-body--vanish");
      bodyGroup.style.opacity = "1";
    }
    [stageEl && stageEl.querySelector(".bomb-stage__warning"), statusEl].forEach(function (node) {
      if (!node) return;
      node.classList.remove("bomb-chrome--blast");
      node.style.removeProperty("--fly-x");
      node.style.removeProperty("--fly-y");
      node.style.removeProperty("--fly-rot");
    });
  }

  function scatterChrome() {
    const warning = stageEl && stageEl.querySelector(".bomb-stage__warning");
    [warning, statusEl].forEach(function (node) {
      if (!node) return;
      node.classList.add("bomb-chrome--blast");
      node.style.setProperty("--fly-x", rand(-100, 100) + "px");
      node.style.setProperty("--fly-y", rand(-80, 120) + "px");
      node.style.setProperty("--fly-rot", rand(-45, 45) + "deg");
    });
  }

  function spawnDebris() {
    if (!frameEl || document.getElementById("bomb-debris")) return;

    const layer = document.createElement("div");
    layer.className = "bomb-debris-layer";
    layer.id = "bomb-debris";
    layer.setAttribute("aria-hidden", "true");

    const variants = ["shard", "shard", "panel", "bolt", "wire-bit", "smoke"];
    for (let i = 0; i < 22; i += 1) {
      const piece = document.createElement("div");
      const variant = variants[i % variants.length];
      piece.className = "bomb-debris bomb-debris--" + variant;
      piece.style.setProperty("--fly-x", rand(-220, 220) + "px");
      piece.style.setProperty("--fly-y", rand(-240, 160) + "px");
      piece.style.setProperty("--fly-rot", rand(-720, 720) + "deg");
      piece.style.setProperty("--fly-delay", rand(0, 0.2) + "s");
      piece.style.setProperty("--origin-x", rand(25, 75) + "%");
      piece.style.setProperty("--origin-y", rand(30, 70) + "%");
      piece.style.left = "var(--origin-x)";
      piece.style.top = "var(--origin-y)";
      if (variant === "panel" && i % 3 === 0) {
        piece.textContent = ["00", "!!", "BOOM"][i % 3];
      }
      layer.appendChild(piece);
    }

    frameEl.appendChild(layer);
  }

  function buildBombBody(parent) {
    const defs = el("defs", {}, parent);
    const grad = el("radialGradient", { id: "bomb-shine", cx: "38%", cy: "32%", r: "65%" }, defs);
    el("stop", { offset: "0%", "stop-color": "#4a5568" }, grad);
    el("stop", { offset: "55%", "stop-color": "#1e2530" }, grad);
    el("stop", { offset: "100%", "stop-color": "#0d1118" }, grad);

    el("ellipse", {
      cx: BOMB_X, cy: BOMB_Y + 48, rx: 78, ry: 14,
      fill: "rgba(0,0,0,0.55)"
    }, parent);

    el("ellipse", {
      cx: BOMB_X, cy: BOMB_Y, rx: 86, ry: 80,
      fill: "url(#bomb-shine)",
      stroke: "#3d4654",
      "stroke-width": "2"
    }, parent);

    el("ellipse", {
      cx: BOMB_X - 24, cy: BOMB_Y - 30, rx: 20, ry: 11,
      fill: "rgba(255,255,255,0.07)",
      transform: "rotate(-25 " + (BOMB_X - 24) + " " + (BOMB_Y - 30) + ")"
    }, parent);

    el("rect", {
      x: BOMB_X - 40, y: BOMB_Y - 18, width: 80, height: 36,
      rx: 4, fill: "#0a0e14", stroke: "#f07178", "stroke-width": "1.5"
    }, parent);

    displayEl = el("text", {
      x: BOMB_X, y: BOMB_Y + 6,
      "text-anchor": "middle",
      fill: "#f07178",
      "font-family": "JetBrains Mono, monospace",
      "font-size": "18",
      "font-weight": "700",
      id: "bomb-led"
    }, parent);
    displayEl.textContent = "30";

    [[BOMB_X - 56, BOMB_Y - 44], [BOMB_X + 56, BOMB_Y - 44], [BOMB_X - 56, BOMB_Y + 44], [BOMB_X + 56, BOMB_Y + 44]].forEach(function (pos) {
      el("circle", {
        cx: pos[0], cy: pos[1], r: 5,
        fill: "#2a3140", stroke: "#4a5568", "stroke-width": "1.5"
      }, parent);
    });

    el("rect", {
      x: BOMB_X - 9, y: BOMB_Y - 88, width: 18, height: 26,
      rx: 3, fill: "#3d4654", stroke: "#5a6578", "stroke-width": "1"
    }, parent);

    fuseEl = el("circle", {
      id: "bomb-spark",
      cx: BOMB_X, cy: BOMB_Y - 92, r: 6,
      fill: "#ffb454",
      class: "bomb-spark"
    }, parent);
  }

  function setStatus(text, className) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = "bomb-status" + (className ? " " + className : "");
  }

  function formatSeconds(seconds) {
    const n = Math.max(0, Math.ceil(seconds));
    return String(n).padStart(2, "0");
  }

  window.BombWidget = {
    init: function () {
      stageEl = document.getElementById("bomb-stage");
      svgEl = document.getElementById("bomb-svg");
      statusEl = document.getElementById("bomb-status");
      legendEl = document.getElementById("bomb-legend");
      frameEl = stageEl && stageEl.querySelector(".bomb-stage__frame");

      if (!svgEl) return;

      clearExplosionMess();
      svgEl.setAttribute("viewBox", "0 0 420 200");
      svgEl.setAttribute("aria-label", "Question timer bomb");
      svgEl.innerHTML = "";
      bodyGroup = el("g", { id: "bomb-body" }, svgEl);
      buildBombBody(bodyGroup);

      if (legendEl) {
        legendEl.innerHTML = "";
        legendEl.hidden = true;
      }

      setStatus("Armed — answer correctly to defuse", "");
    },

    show: function () {
      if (stageEl) stageEl.hidden = false;
      document.body.classList.add("vault-active");
    },

    hide: function () {
      if (stageEl) stageEl.hidden = true;
      document.body.classList.remove("vault-active", "vault-critical");
    },

    /** Fresh bomb for the next question. */
    reset: function () {
      clearExplosionMess();
      if (stageEl) {
        stageEl.classList.remove(
          "bomb-stage--defused",
          "bomb-stage--critical",
          "bomb-stage--exploded"
        );
      }
      document.body.classList.remove("vault-critical", "vault-exploded");
      if (bodyGroup) {
        bodyGroup.classList.remove("bomb-body--vanish");
        bodyGroup.style.opacity = "1";
      }
      if (fuseEl) fuseEl.classList.remove("bomb-spark--out");
      if (displayEl) {
        displayEl.classList.remove("bomb-display--critical");
        displayEl.setAttribute("fill", "#f07178");
        displayEl.textContent = "30";
      }
      setStatus("Armed — answer correctly to defuse", "");
    },

    setSeconds: function (seconds) {
      if (!displayEl) return;
      if (displayEl.textContent === "BOOM" || displayEl.textContent === "OK") return;
      displayEl.textContent = formatSeconds(seconds);
    },

    setTimerCritical: function (critical) {
      if (!displayEl) return;
      displayEl.classList.toggle("bomb-display--critical", critical);
      if (stageEl) stageEl.classList.toggle("bomb-stage--critical", critical);
      document.body.classList.toggle("vault-critical", critical);
      if (critical) {
        displayEl.setAttribute("fill", "#ffb454");
        setStatus("Critical — timer almost gone!", "bomb-status--critical");
      } else if (displayEl.textContent !== "BOOM" && displayEl.textContent !== "OK") {
        displayEl.setAttribute("fill", "#f07178");
        setStatus("Armed — answer correctly to defuse", "");
      }
    },

    defuse: function () {
      if (stageEl) {
        stageEl.classList.remove("bomb-stage--critical", "bomb-stage--exploded");
        stageEl.classList.add("bomb-stage--defused");
      }
      document.body.classList.remove("vault-critical");
      if (fuseEl) fuseEl.classList.add("bomb-spark--out");
      if (displayEl) {
        displayEl.textContent = "OK";
        displayEl.setAttribute("fill", "#3dd68c");
        displayEl.classList.remove("bomb-display--critical");
      }
      setStatus("Defused — correct answer accepted", "bomb-status--safe");
    },

    /** @deprecated Use defuse() */
    setDefused: function () {
      this.defuse();
    },

    /** No-op kept for older call sites during migration. */
    cut: function () {},

    explode: function () {
      if (stageEl) {
        stageEl.classList.remove("bomb-stage--critical", "bomb-stage--defused");
        stageEl.classList.add("bomb-stage--exploded");
      }
      document.body.classList.add("vault-exploded");
      document.body.classList.remove("vault-critical");

      if (frameEl) frameEl.classList.add("bomb-stage__frame--destroyed");
      if (bodyGroup) bodyGroup.classList.add("bomb-body--vanish");

      if (displayEl) {
        displayEl.textContent = "BOOM";
        displayEl.setAttribute("fill", "#ffb454");
      }
      setStatus("Detonated — moving to next question", "bomb-status--exploded");

      if (!reducedMotion()) {
        scatterChrome();
        spawnDebris();
      } else if (bodyGroup) {
        bodyGroup.style.opacity = "0";
      }

      if (svgEl && !document.getElementById("bomb-explosion")) {
        const burst = el("g", { id: "bomb-explosion", class: "bomb-explosion" }, svgEl);
        [
          { r: 30, fill: "#ffb454", delay: 0 },
          { r: 55, fill: "#f07178", delay: 0.05 },
          { r: 80, fill: "#f0a030", delay: 0.1 },
          { r: 105, fill: "rgba(255,180,80,0.4)", delay: 0.15 }
        ].forEach(function (ring, i) {
          el("circle", {
            cx: BOMB_X, cy: BOMB_Y, r: ring.r,
            fill: "none",
            stroke: ring.fill,
            "stroke-width": i === 0 ? 6 : 4 - i * 0.5,
            class: "bomb-explosion__ring",
            style: "animation-delay: " + ring.delay + "s"
          }, burst);
        });
        el("circle", {
          cx: BOMB_X, cy: BOMB_Y, r: 20,
          fill: "#ffb454",
          class: "bomb-explosion__core"
        }, burst);
      }
    }
  };
})();
