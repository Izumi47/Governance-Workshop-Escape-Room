/**
 * Access gate — requires workshop password / token before the vault UI unlocks.
 * Client-side only (hides content; not cryptographic security).
 *
 * Change the password: update EXPECTED_HASH below to SHA-256 hex of your token.
 *   node -e "require('crypto').createHash('sha256').update('YOUR-TOKEN','utf8').digest('hex')"
 *
 * Default token: DG-VAULT-2026
 * Also unlocks with ?token=DG-VAULT-2026
 */
(function () {
  "use strict";

  const STORAGE_KEY = "vault-access-ok";
  const EXPECTED_HASH =
    "20b1979e57cd151d0d0c8942c1879774585b1b7504f658dd1fb784dd3ff1fb63";

  const gateEl = document.getElementById("screen-gate");
  const formEl = document.getElementById("gate-form");
  const inputEl = document.getElementById("gate-token");
  const errorEl = document.getElementById("gate-error");
  const shellEl = document.querySelector(".page-shell");
  const audioDock = document.getElementById("audio-dock");

  function normalizeToken(value) {
    return String(value || "").trim();
  }

  function hexFromBuffer(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map(function (b) {
        return b.toString(16).padStart(2, "0");
      })
      .join("");
  }

  function hashToken(token) {
    if (window.crypto && window.crypto.subtle) {
      return window.crypto.subtle
        .digest("SHA-256", new TextEncoder().encode(token))
        .then(hexFromBuffer);
    }
    // Very old browsers: fall back to plaintext compare against known default only
    return Promise.resolve(
      token === "DG-VAULT-2026" ? EXPECTED_HASH : ""
    );
  }

  function clearError() {
    if (!errorEl) return;
    errorEl.hidden = true;
    errorEl.textContent = "";
    if (inputEl) inputEl.removeAttribute("aria-invalid");
  }

  function showError(message) {
    if (!errorEl) return;
    errorEl.hidden = false;
    errorEl.textContent = message;
    if (inputEl) {
      inputEl.setAttribute("aria-invalid", "true");
      inputEl.focus();
      inputEl.select();
    }
  }

  function unlock() {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch (e) {
      /* ignore quota / private mode */
    }
    document.body.classList.remove("vault-locked");
    document.body.classList.add("vault-unlocked");
    if (gateEl) {
      gateEl.hidden = true;
      gateEl.classList.remove("screen--active");
    }
    if (shellEl) shellEl.hidden = false;
    if (audioDock) audioDock.hidden = false;
    document.dispatchEvent(new CustomEvent("vault:unlocked"));
  }

  function isUnlocked() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function tryUnlock(rawToken) {
    const token = normalizeToken(rawToken);
    if (!token) {
      showError("Enter the access token to open the vault.");
      return Promise.resolve(false);
    }

    return hashToken(token).then(function (hash) {
      if (hash === EXPECTED_HASH) {
        clearError();
        unlock();
        return true;
      }
      showError("Access denied. Check the token and try again.");
      return false;
    });
  }

  function init() {
    document.body.classList.add("vault-locked");
    if (shellEl) shellEl.hidden = true;
    if (audioDock) audioDock.hidden = true;

    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token") || params.get("access");

    if (isUnlocked()) {
      unlock();
      return;
    }

    if (urlToken) {
      tryUnlock(urlToken).then(function (ok) {
        if (ok && window.history && window.history.replaceState) {
          params.delete("token");
          params.delete("access");
          const qs = params.toString();
          const next = window.location.pathname + (qs ? "?" + qs : "") + window.location.hash;
          window.history.replaceState({}, "", next);
        }
      });
    }

    if (gateEl) {
      gateEl.hidden = false;
      gateEl.classList.add("screen--active");
    }
    if (inputEl) {
      inputEl.addEventListener("input", clearError);
      window.setTimeout(function () {
        inputEl.focus();
      }, 50);
    }
    if (formEl) {
      formEl.addEventListener("submit", function (event) {
        event.preventDefault();
        tryUnlock(inputEl && inputEl.value);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.VaultGate = {
    unlock: unlock,
    tryUnlock: tryUnlock,
    isUnlocked: isUnlocked
  };
})();
