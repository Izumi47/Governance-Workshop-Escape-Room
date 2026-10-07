/**
 * Live scores for the admin page, stored in one Upstash Redis hash (field = team id).
 *   POST   — game reports a team's score (public)
 *   GET    — admin reads all teams   (header x-admin-token)
 *   DELETE — admin clears the board  (header x-admin-token)
 *
 * Env: ADMIN_TOKEN, plus the Upstash REST vars that the Vercel integration sets
 * (KV_REST_API_URL / KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).
 */
const crypto = require("crypto");

const KEY = "vault:scores";
const TTL_SECONDS = 60 * 60 * 24;
const STATUSES = ["playing", "finished"];

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

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

function cleanEntry(body) {
  if (!body || typeof body !== "object") return null;
  const id = String(body.id || "");
  if (!/^[a-z0-9]{6,32}$/i.test(id)) return null;
  return {
    id: id,
    group: String(body.group || "Unnamed").trim().slice(0, 40),
    score: int(body.score, 100000),
    answered: int(body.answered, 1000),
    total: int(body.total, 1000),
    status: STATUSES.includes(body.status) ? body.status : "playing",
    updated: Date.now()
  };
}

module.exports = async function handler(req, res) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ error: "Upstash Redis is not configured" });
  }

  try {
    if (req.method === "POST") {
      const entry = cleanEntry(req.body);
      if (!entry) return res.status(400).json({ error: "Invalid score" });
      await redis([
        ["HSET", KEY, entry.id, JSON.stringify(entry)],
        ["EXPIRE", KEY, TTL_SECONDS]
      ]);
      return res.status(204).end();
    }

    if (!isAdmin(req)) return res.status(401).json({ error: "Admin token required" });

    if (req.method === "GET") {
      const [{ result }] = await redis([["HVALS", KEY]]);
      const teams = (result || []).map(function (raw) { return JSON.parse(raw); });
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ teams: teams });
    }

    if (req.method === "DELETE") {
      await redis([["DEL", KEY]]);
      return res.status(204).end();
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
};
