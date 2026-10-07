// Self-check for api/rooms.js + api/score.js with an in-memory fake Upstash. Run: node tests/score-api.check.js
const assert = require("assert");
process.env.KV_REST_API_URL = "https://fake"; process.env.KV_REST_API_TOKEN = "t"; process.env.ADMIN_TOKEN = "secret";
const db = new Map();
const h = (key) => db.get(key) || db.set(key, new Map()).get(key);
global.fetch = async (url, opts) => ({ ok: true, json: async () => JSON.parse(opts.body).map(([cmd, key, ...args]) => {
  const [f, v] = args;
  if (cmd === "HSET") { h(key).set(f, String(v)); return { result: 1 }; }
  if (cmd === "HSETNX") { if (h(key).has(f)) return { result: 0 }; h(key).set(f, String(v)); return { result: 1 }; }
  if (cmd === "HGET") return { result: h(key).get(f) ?? null };
  if (cmd === "HLEN") return { result: h(key).size };
  if (cmd === "HDEL") { args.forEach((x) => h(key).delete(x)); return { result: 1 }; }
  if (cmd === "HINCRBY") { h(key).set(f, String(Number(h(key).get(f) || 0) + v)); return { result: 1 }; }
  if (cmd === "HVALS") return { result: [...h(key).values()] };
  if (cmd === "HGETALL") return { result: [...h(key)].flat() };
  if (cmd === "DEL") { [key, ...args].forEach((k) => db.delete(k)); return { result: 1 }; }
  return { result: 1 };
}) });
const rooms = require("../api/rooms.js");
const score = require("../api/score.js");
const call = async (handler, method, { body, query, token } = {}) => {
  const out = {}; const res = { status(c) { out.code = c; return res; }, json(b) { out.body = b; return res; }, end() { return res; }, setHeader() {} };
  await handler({ method, body, query: query || {}, headers: token ? { "x-admin-token": token } : {} }, res); return out;
};
const admin = { token: "secret" };

(async () => {
  // Sessions: only admins create/list; anyone can look a code up.
  assert.equal((await call(rooms, "POST", { body: { name: "Morning" } })).code, 401);
  const a = (await call(rooms, "POST", { ...admin, body: { name: "Morning" } })).body.room;
  const b = (await call(rooms, "POST", { ...admin, body: { name: "Afternoon" } })).body.room;
  assert.match(a.code, /^[A-Z0-9]{3}-[A-Z0-9]{3}$/);
  assert.equal((await call(rooms, "GET", { query: { code: a.code.toLowerCase().replace("-", "") } })).body.room.name, "Morning");
  assert.equal((await call(rooms, "GET", { query: { code: "ZZZ-999" } })).code, 404);
  assert.equal((await call(rooms, "GET", { query: { code: "nope" } })).code, 400);

  // Scores land only in their own session; unknown sessions are rejected.
  const team = { id: "abc123def", group: "Team A", score: 450, answered: 5, total: 40 };
  assert.equal((await call(score, "POST", { body: { ...team, room: a.code, question: { id: "py-1", wrong: 2, correct: true } } })).code, 204);
  assert.equal((await call(score, "POST", { body: { ...team, id: "zzz999yyy", group: "Team B", room: b.code } })).code, 204);
  assert.equal((await call(score, "POST", { body: { ...team, room: "ZZZ-999" } })).code, 404);
  assert.equal((await call(score, "POST", { body: { ...team } })).code, 400);
  assert.equal((await call(score, "POST", { body: { ...team, id: "bad id!", room: a.code } })).code, 400);

  assert.equal((await call(score, "GET", { query: { room: a.code } })).code, 401);
  const ra = (await call(score, "GET", { ...admin, query: { room: a.code } })).body;
  assert.deepEqual(ra.teams.map((t) => t.group), ["Team A"]);
  assert.deepEqual(ra.questions, { "py-1": { seen: 1, wrong: 2, timeout: 0, first: 0 } });
  const rb = (await call(score, "GET", { ...admin, query: { room: b.code } })).body;
  assert.deepEqual(rb.teams.map((t) => t.group), ["Team B"]);
  assert.deepEqual(rb.questions, {});

  // Listing has team counts; reset clears one session; delete removes the session.
  const list = (await call(rooms, "GET", admin)).body.rooms;
  assert.deepEqual(list.map((r) => [r.name, r.teams]).sort(), [["Afternoon", 1], ["Morning", 1]]);
  assert.equal((await call(score, "DELETE", { ...admin, query: { room: a.code } })).code, 204);
  assert.equal((await call(score, "GET", { ...admin, query: { room: a.code } })).body.teams.length, 0);
  assert.equal((await call(score, "GET", { ...admin, query: { room: b.code } })).body.teams.length, 1);
  assert.equal((await call(rooms, "DELETE", { ...admin, query: { code: b.code } })).code, 204);
  assert.equal((await call(rooms, "GET", { query: { code: b.code } })).code, 404);
  assert.equal((await call(score, "POST", { body: { ...team, room: b.code } })).code, 404);
  console.log("ok");
})();
