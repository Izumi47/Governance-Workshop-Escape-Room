/**
 * Workshop sessions ("rooms"). Layout in api/_lib.js.
 *   GET    ?code=FIN-7Q2  — public: does this session exist? → { room: { code, name } }
 *   GET                   — admin: all live sessions with team counts
 *   POST   { name }       — admin: create a session with a fresh code
 *   DELETE ?code=FIN-7Q2  — admin: delete a session and its scores
 */
const crypto = require("crypto");
const { ROOMS, configured, redis, isAdmin, cleanCode, roomKeys, isExpired } = require("./_lib");

// No 0/O, 1/I/L so codes survive being read off a projector.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function newCode() {
  let s = "";
  for (let i = 0; i < 6; i += 1) s += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return s.slice(0, 3) + "-" + s.slice(3);
}

function publicRoom(room) {
  return { code: room.code, name: room.name };
}

module.exports = async function handler(req, res) {
  if (!configured()) return res.status(500).json({ error: "Upstash Redis is not configured" });
  const query = req.query || {};

  try {
    if (req.method === "GET" && query.code !== undefined) {
      const code = cleanCode(query.code);
      if (!code) return res.status(400).json({ error: "Session codes look like ABC-123" });
      const [{ result }] = await redis([["HGET", ROOMS, code]]);
      const room = result ? JSON.parse(result) : null;
      if (!room || isExpired(room)) return res.status(404).json({ error: "Unknown session code" });
      return res.status(200).json({ room: publicRoom(room) });
    }

    if (!isAdmin(req)) return res.status(401).json({ error: "Admin token required" });

    if (req.method === "GET") {
      const [{ result }] = await redis([["HVALS", ROOMS]]);
      const all = (result || []).map(function (raw) { return JSON.parse(raw); });
      const expired = all.filter(isExpired);
      const live = all.filter(function (r) { return !isExpired(r); });
      const counts = live.length
        ? await redis(live.map(function (r) { return ["HLEN", roomKeys(r.code).scores]; }))
        : [];
      if (expired.length) await redis([["HDEL", ROOMS].concat(expired.map(function (r) { return r.code; }))]);
      const rooms = live
        .map(function (r, i) { return Object.assign(publicRoom(r), { created: r.created, teams: counts[i].result || 0 }); })
        .sort(function (a, b) { return b.created - a.created; });
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ rooms: rooms });
    }

    if (req.method === "POST") {
      const name = String((req.body && req.body.name) || "").trim().slice(0, 40) || "Workshop session";
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const room = { code: newCode(), name: name, created: Date.now() };
        const [{ result }] = await redis([["HSETNX", ROOMS, room.code, JSON.stringify(room)]]);
        if (result === 1) return res.status(201).json({ room: Object.assign(publicRoom(room), { created: room.created, teams: 0 }) });
      }
      return res.status(500).json({ error: "Couldn't generate a unique code" });
    }

    if (req.method === "DELETE") {
      const code = cleanCode(query.code);
      if (!code) return res.status(400).json({ error: "Session code required" });
      const keys = roomKeys(code);
      await redis([["HDEL", ROOMS, code], ["DEL", keys.scores, keys.questions]]);
      return res.status(204).end();
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
};
