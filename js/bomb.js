/**
 * Bomb + wire defusal widget.
 * Each wire maps to one question in a chamber; cutWire runs after each answer.
 */
(function () {
  "use strict";

  const CHAMBER_COLORS = {
    python: "#3dd68c",
    powerbi: "#59c2ff",
    alm: "#f0a030",
    sop: "#f07178"
  };

  const SVG_NS = "http://www.w3.org/2000/svg";
  const BOMB_X = 210;
  const BOMB_Y = 172;
  const WIRE_TOP_Y = 14;

  let totalWires = 0;
  let cutCount = 0;
  let stageEl = null;
  let svgEl = null;
  let wiresGroup = null;
  let statusEl = null;
  let displayEl = null;
  let legendEl = null;
  let frameEl = null;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function clearExplosionMess() {
    const debris = document.getElementById("bomb-debris");
    if (debris) debris.remove();

    if (wiresGroup) {
      wiresGroup.querySelectorAll(".wire").forEach(function (wire) {
        wire.classList.remove("wire--blast");
        wire.style.removeProperty("--blast-x");
        wire.style.removeProperty("--blast-y");
        wire.style.removeProperty("--blast-rot");
        wire.style.removeProperty("--blast-delay");
      });
    }

    if (legendEl) {
      legendEl.querySelectorAll(".bomb-legend__item").forEach(function (item) {
        item.classList.remove("bomb-legend__item--blast");
        item.style.removeProperty("--fly-x");
        item.style.removeProperty("--fly-y");
        item.style.removeProperty("--fly-rot");
        item.style.removeProperty("--fly-delay");
      });
    }

    [stageEl && stageEl.querySelector(".bomb-stage__warning"), statusEl].forEach(function (node) {
      if (!node) return;
      node.classList.remove("bomb-chrome--blast");
      node.style.removeProperty("--fly-x");
      node.style.removeProperty("--fly-y");
      node.style.removeProperty("--fly-rot");
    });

    if (frameEl) frameEl.classList.remove("bomb-stage__frame--destroyed");
    const bodyGroup = document.getElementById("bomb-body");
    if (bodyGroup) {
      bodyGroup.classList.remove("bomb-body--vanish");
      bodyGroup.style.opacity = "1";
    }
  }

  function scatterWires() {
    if (!wiresGroup) return;
    wiresGroup.querySelectorAll(".wire").forEach(function (wire, i) {
      wire.classList.add("wire--blast");
      wire.style.setProperty("--blast-x", rand(-140, 140) + "px");
      wire.style.setProperty("--blast-y", rand(-200, 60) + "px");
      wire.style.setProperty("--blast-rot", rand(-220, 220) + "deg");
      wire.style.setProperty("--blast-delay", (i * 0.025) + "s");
    });
  }

  function scatterLegend() {
    if (!legendEl) return;
    legendEl.querySelectorAll(".bomb-legend__item").forEach(function (item, i) {
      item.classList.add("bomb-legend__item--blast");
      item.style.setProperty("--fly-x", rand(-160, 160) + "px");
      item.style.setProperty("--fly-y", rand(-120, 140) + "px");
      item.style.setProperty("--fly-rot", rand(-180, 180) + "deg");
      item.style.setProperty("--fly-delay", (0.05 + i * 0.04) + "s");
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
    for (let i = 0; i < 28; i += 1) {
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

  function wireId(chamberIndex, questionIndex) {
    return "wire-" + chamberIndex + "-" + questionIndex;
  }

  function curvePath(xTop, yTop, xBot, yBot) {
    const cx = (xTop + xBot) / 2;
    const cy = (yTop + yBot) / 2 + 18;
    return "M " + xTop + " " + yTop + " Q " + cx + " " + cy + " " + xBot + " " + yBot;
  }

  function splitWirePaths(xTop, xBot) {
    const cutX = xTop * 0.65 + xBot * 0.35;
    const cutY = WIRE_TOP_Y + (BOMB_Y - WIRE_TOP_Y) * 0.38;
    const stub = "M " + xBot + " " + BOMB_Y + " L " + cutX + " " + cutY;
    const tail = "M " + cutX + " " + cutY + " Q " + ((cutX + xTop) / 2) + " " + (cutY - 12) + " " + xTop + " " + WIRE_TOP_Y;
    const full = curvePath(xTop, WIRE_TOP_Y, xBot, BOMB_Y);
    return { full: full, stub: stub, tail: tail, cutX: cutX, cutY: cutY };
  }

  function buildBombBody(parent) {
    const svg = parent;
    const defs = el("defs", {}, svg);
    const grad = el("radialGradient", { id: "bomb-shine", cx: "38%", cy: "32%", r: "65%" }, defs);
    el("stop", { offset: "0%", "stop-color": "#4a5568" }, grad);
    el("stop", { offset: "55%", "stop-color": "#1e2530" }, grad);
    el("stop", { offset: "100%", "stop-color": "#0d1118" }, grad);

    const shadow = el("ellipse", {
      cx: BOMB_X, cy: BOMB_Y + 38, rx: 72, ry: 14,
      fill: "rgba(0,0,0,0.55)"
    }, svg);

    el("ellipse", {
      cx: BOMB_X, cy: BOMB_Y, rx: 78, ry: 74,
      fill: "url(#bomb-shine)",
      stroke: "#3d4654",
      "stroke-width": "2"
    }, svg);

    el("ellipse", {
      cx: BOMB_X - 22, cy: BOMB_Y - 28, rx: 18, ry: 10,
      fill: "rgba(255,255,255,0.07)",
      transform: "rotate(-25 " + (BOMB_X - 22) + " " + (BOMB_Y - 28) + ")"
    }, svg);

    const panel = el("rect", {
      x: BOMB_X - 34, y: BOMB_Y - 16, width: 68, height: 32,
      rx: 4, fill: "#0a0e14", stroke: "#f07178", "stroke-width": "1.5"
    }, svg);

    displayEl = el("text", {
      x: BOMB_X, y: BOMB_Y + 5,
      "text-anchor": "middle",
      fill: "#f07178",
      "font-family": "JetBrains Mono, monospace",
      "font-size": "14",
      "font-weight": "700"
    }, svg);
    displayEl.textContent = "00";

    [[BOMB_X - 52, BOMB_Y - 40], [BOMB_X + 52, BOMB_Y - 40], [BOMB_X - 52, BOMB_Y + 40], [BOMB_X + 52, BOMB_Y + 40]].forEach(function (pos) {
      el("circle", {
        cx: pos[0], cy: pos[1], r: 5,
        fill: "#2a3140", stroke: "#4a5568", "stroke-width": "1.5"
      }, svg);
    });

    el("rect", {
      x: BOMB_X - 8, y: BOMB_Y - 78, width: 16, height: 22,
      rx: 3, fill: "#3d4654", stroke: "#5a6578", "stroke-width": "1"
    }, svg);

    el("circle", {
      id: "bomb-spark",
      cx: BOMB_X, cy: BOMB_Y - 82, r: 5,
      fill: "#ffb454",
      class: "bomb-spark"
    }, svg);
  }

  function buildWires(chambers) {
    wiresGroup.innerHTML = "";
    totalWires = 0;
    chambers.forEach(function (ch) {
      totalWires += ch.questions.length;
    });

    let wireNum = 0;
    const pad = 36;
    const span = 420 - pad * 2;

    chambers.forEach(function (chamber, chamberIndex) {
      const color = chamber.wireColor || CHAMBER_COLORS[chamber.id] || "#8b9bb4";
      const count = chamber.questions.length;
      const sectionWidth = span / chambers.length;
      const sectionStart = pad + chamberIndex * sectionWidth;

      chamber.questions.forEach(function (_q, questionIndex) {
        const localIndex = questionIndex;
        const localSpan = count > 1 ? sectionWidth * 0.75 : 0;
        const xTop = count > 1
          ? sectionStart + sectionWidth * 0.125 + (localSpan / (count - 1)) * localIndex
          : sectionStart + sectionWidth * 0.5;
        const xBot = BOMB_X + (xTop - BOMB_X) * 0.15;
        const paths = splitWirePaths(xTop, xBot);

        const group = el("g", {
          id: wireId(chamberIndex, questionIndex),
          class: "wire",
          "data-chamber": String(chamberIndex),
          "data-question": String(questionIndex),
          "data-label": chamber.name
        }, wiresGroup);

        el("title", { textContent: chamber.name + " — Question " + (questionIndex + 1) }, group);

        el("path", {
          class: "wire__full",
          d: paths.full,
          stroke: color,
          "stroke-width": "5",
          fill: "none",
          "stroke-linecap": "round"
        }, group);

        el("path", {
          class: "wire__stub",
          d: paths.stub,
          stroke: color,
          "stroke-width": "5",
          fill: "none",
          "stroke-linecap": "round"
        }, group);

        el("path", {
          class: "wire__tail",
          d: paths.tail,
          stroke: color,
          "stroke-width": "5",
          fill: "none",
          "stroke-linecap": "round"
        }, group);

        el("circle", {
          class: "wire__cap wire__cap--top",
          cx: xTop, cy: WIRE_TOP_Y, r: 4,
          fill: color
        }, group);

        el("circle", {
          class: "wire__cap wire__cap--cut",
          cx: paths.cutX, cy: paths.cutY, r: 3.5,
          fill: "#1a2230",
          stroke: color,
          "stroke-width": "1.5"
        }, group);

        wireNum += 1;
      });
    });

    cutCount = 0;
    updateDisplay();
  }

  function buildLegend(chambers) {
    legendEl.innerHTML = "";
    chambers.forEach(function (chamber) {
      const item = document.createElement("span");
      item.className = "bomb-legend__item";
      const dot = document.createElement("span");
      dot.className = "bomb-legend__dot";
      dot.style.background = chamber.wireColor || CHAMBER_COLORS[chamber.id] || "#8b9bb4";
      const label = document.createElement("span");
      label.textContent = chamber.icon + " " + chamber.name + " (" + chamber.questions.length + ")";
      item.appendChild(dot);
      item.appendChild(label);
      legendEl.appendChild(item);
    });
  }

  function updateDisplay() {
    const remaining = totalWires - cutCount;
    if (displayEl) {
      displayEl.textContent = String(remaining).padStart(2, "0");
    }
    if (statusEl) {
      if (remaining === 0) {
        statusEl.textContent = "All wires cut — vault defused!";
        statusEl.className = "bomb-status bomb-status--safe";
      } else if (remaining <= 3) {
        statusEl.textContent = remaining + " wire" + (remaining === 1 ? "" : "s") + " left — hurry!";
        statusEl.className = "bomb-status bomb-status--critical";
      } else {
        statusEl.textContent = remaining + " wires intact — answer each question to cut one";
        statusEl.className = "bomb-status";
      }
    }
    if (stageEl) {
      stageEl.classList.toggle("bomb-stage--critical", remaining > 0 && remaining <= 3);
      stageEl.classList.toggle("bomb-stage--defused", remaining === 0);
    }
    document.body.classList.toggle("vault-critical", remaining > 0 && remaining <= 3);
  }

  window.BombWidget = {
    init: function (chambers) {
      stageEl = document.getElementById("bomb-stage");
      svgEl = document.getElementById("bomb-svg");
      statusEl = document.getElementById("bomb-status");
      legendEl = document.getElementById("bomb-legend");
      frameEl = stageEl && stageEl.querySelector(".bomb-stage__frame");

      if (!svgEl) return;

      clearExplosionMess();
      svgEl.innerHTML = "";
      wiresGroup = el("g", { id: "bomb-wires" }, svgEl);
      const bodyGroup = el("g", { id: "bomb-body" }, svgEl);

      buildWires(chambers);
      buildBombBody(bodyGroup);
      buildLegend(chambers);
    },

    show: function () {
      if (stageEl) stageEl.hidden = false;
      document.body.classList.add("vault-active");
    },

    hide: function () {
      if (stageEl) stageEl.hidden = true;
      document.body.classList.remove("vault-active", "vault-critical");
    },

    reset: function () {
      cutCount = 0;
      if (stageEl) {
        stageEl.classList.remove("bomb-stage--defused", "bomb-stage--critical", "bomb-stage--exploded");
      }
      document.body.classList.remove("vault-critical", "vault-exploded");
      const explosion = document.getElementById("bomb-explosion");
      if (explosion) explosion.remove();
      clearExplosionMess();
      if (wiresGroup) {
        wiresGroup.querySelectorAll(".wire").forEach(function (wire) {
          wire.classList.remove("wire--cut");
        });
      }
      if (displayEl) {
        displayEl.setAttribute("fill", "#f07178");
        displayEl.classList.remove("bomb-display--critical");
      }
      updateDisplay();
    },

    cut: function (chamberIndex, questionIndex) {
      const wire = document.getElementById(wireId(chamberIndex, questionIndex));
      if (!wire || wire.classList.contains("wire--cut")) return;

      wire.classList.add("wire--cut");
      cutCount += 1;
      updateDisplay();

      if (cutCount >= totalWires) {
        this.setDefused();
      }
    },

    setDefused: function () {
      if (stageEl) stageEl.classList.add("bomb-stage--defused");
      const spark = document.getElementById("bomb-spark");
      if (spark) spark.classList.add("bomb-spark--out");
      document.body.classList.remove("vault-critical");
      this.setTimerCritical(false);
      updateDisplay();
    },

    setTimerCritical: function (critical) {
      if (!displayEl) return;
      displayEl.classList.toggle("bomb-display--critical", critical);
      if (critical && displayEl.textContent !== "BOOM") {
        displayEl.textContent = "!!";
        displayEl.setAttribute("fill", "#ffb454");
      } else if (!critical && displayEl.textContent === "!!") {
        updateDisplay();
        displayEl.setAttribute("fill", "#f07178");
      }
    },

    explode: function () {
      if (stageEl) {
        stageEl.classList.remove("bomb-stage--critical", "bomb-stage--defused");
        stageEl.classList.add("bomb-stage--exploded");
      }
      document.body.classList.add("vault-exploded");
      document.body.classList.remove("vault-critical");

      if (frameEl) frameEl.classList.add("bomb-stage__frame--destroyed");

      const bodyGroup = document.getElementById("bomb-body");
      if (bodyGroup) {
        bodyGroup.classList.add("bomb-body--vanish");
      }

      if (displayEl) {
        displayEl.textContent = "BOOM";
        displayEl.setAttribute("fill", "#ffb454");
      }
      if (statusEl) {
        statusEl.textContent = "DETONATED — vault lockdown initiated";
        statusEl.className = "bomb-status bomb-status--exploded";
      }

      if (!reducedMotion()) {
        scatterWires();
        scatterLegend();
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
