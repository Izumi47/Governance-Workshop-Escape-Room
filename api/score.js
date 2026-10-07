/**
 * Live scores per workshop session. Layout in api/_lib.js.
 *   POST   { room, id, group, score, ..., question? } — game reports a team's score (public)
 *   GET    ?room=FIN-7Q2 — admin: that session's teams + question stats
 *   DELETE ?room=FIN-7Q2 — admin: clear that session's board
 */
const { ROOMS, ROOM_TTL_SECONDS, configured, redis, isAdmin, int, cleanCode, roomKeys, isExpired } = require("./_lib");

const STATUSES = ["playing", "finished"];

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

// One finished question: how many wrong tries, whether it timed out, whether it was solved.
function cleanQuestion(q) {
  if (!q || typeof q !== "object") return null;
  const id = String(q.id || "");
  if (!/^[a-z0-9-]{1,40}$/i.test(id)) return null;
  const wrong = int(q.wrong, 50);
  const solved = q.correct === true;
  return { id: id, wrong: wrong, timeout: q.timedOut === true ? 1 : 0, first: solved && wrong === 0 ? 1 : 0 };
}

function questionCommands(key, q) {
  return [
    ["HINCRBY", key, q.id + "|seen", 1],
    ["HINCRBY", key, q.id + "|wrong", q.wrong],
    ["HINCRBY", key, q.id + "|timeout", q.timeout],
    ["HINCRBY", key, q.id + "|first", q.first],
    ["EXPIRE", key, ROOM_TTL_SECONDS]
  ];
}

// Flat HGETALL reply ["py-1|seen", "3", ...] → { "py-1": { seen: 3, ... } }
function parseQuestionStats(flat) {
  const stats = {};
  for (let i = 0; i + 1 < (flat || []).length; i += 2) {
    const [id, field] = flat[i].split("|");
    stats[id] = stats[id] || { seen: 0, wrong: 0, timeout: 0, first: 0 };
    stats[id][field] = Number(flat[i + 1]) || 0;
  }
  return stats;
}

module.exports = async function handler(req, res) {
  if (!configured()) return res.status(500).json({ error: "Upstash Redis is not configured" });

  try {
    if (req.method === "POST") {
      const body = req.body || {};
      const room = cleanCode(body.room);
      const entry = cleanEntry(body);
      if (!room || !entry) return res.status(400).json({ error: "Invalid score" });

      const [{ result }] = await redis([["HGET", ROOMS, room]]);
      if (!result || isExpired(JSON.parse(result))) return res.status(404).json({ error: "Unknown session code" });

      const keys = roomKeys(room);
      const question = cleanQuestion(body.question);
      await redis([
        ["HSET", keys.scores, entry.id, JSON.stringify(entry)],
        ["EXPIRE", keys.scores, ROOM_TTL_SECONDS]
      ].concat(question ? questionCommands(keys.questions, question) : []));
      return res.status(204).end();
    }

    if (!isAdmin(req)) return res.status(401).json({ error: "Admin token required" });

    const room = cleanCode((req.query || {}).room);
    if (!room) return res.status(400).json({ error: "Session code required" });
    const keys = roomKeys(room);

    if (req.method === "GET") {
      const [scores, questions] = await redis([["HVALS", keys.scores], ["HGETALL", keys.questions]]);
      const teams = (scores.result || []).map(function (raw) { return JSON.parse(raw); });
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ teams: teams, questions: parseQuestionStats(questions.result) });
    }

    if (req.method === "DELETE") {
      await redis([["DEL", keys.scores, keys.questions]]);
      return res.status(204).end();
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
};
