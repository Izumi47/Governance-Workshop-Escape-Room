/**
 * Shared helpers for the /api functions (the leading underscore keeps Vercel from routing it).
 *
 * Redis layout, per workshop session ("room", code like FIN-7Q2):
 *   vault:rooms              hash, field = code, value = JSON { code, name, created }
 *   vault:scores:<code>      hash, field = team id, value = JSON entry
 *   vault:questions:<code>   hash of counters, field = "<question id>|seen|wrong|timeout|first"
 *
 * Env: ADMIN_TOKEN, plus the Upstash REST vars that the Vercel integration sets
 * (KV_REST_API_URL / KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).
 */
const crypto = require("crypto");

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const ROOMS = "vault:rooms";
const ROOM_TTL_SECONDS = 60 * 60 * 24 * 7;

function configured() {
  return Boolean(REDIS_URL && REDIS_TOKEN);
}

async function redis(commands) {
  const res = await fetch(REDIS_URL + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + REDIS_TOKEN },
    body: JSON.stringify(commands)
  });
  if (!res.ok) throw new Error("Upstash " + res.status);
  return res.json();
}

function sha(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest();
}

function isAdmin(req) {
  return Boolean(process.env.ADMIN_TOKEN) &&
    crypto.timingSafeEqual(sha(req.headers["x-admin-token"]), sha(process.env.ADMIN_TOKEN));
}

function int(value, max) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.max(0, Math.min(n, max)) : 0;
}

/** "fin7q2", " FIN-7Q2 " → "FIN-7Q2"; anything else → null. */
function cleanCode(value) {
  let code = String(value || "").toUpperCase().replace(/[\s-]/g, "");
  if (!/^[A-Z0-9]{6}$/.test(code)) return null;
  return code.slice(0, 3) + "-" + code.slice(3);
}

function roomKeys(code) {
  return { scores: "vault:scores:" + code, questions: "vault:questions:" + code };
}

function isExpired(room) {
  return Date.now() - room.created > ROOM_TTL_SECONDS * 1000;
}

module.exports = { ROOMS, ROOM_TTL_SECONDS, configured, redis, isAdmin, int, cleanCode, roomKeys, isExpired };
