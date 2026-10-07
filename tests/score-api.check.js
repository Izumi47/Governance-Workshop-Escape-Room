// Self-check for api/score.js with an in-memory fake Upstash. Run: node tests/score-api.check.js
const assert = require("assert");
process.env.KV_REST_API_URL = "https://fake"; process.env.KV_REST_API_TOKEN = "t"; process.env.ADMIN_TOKEN = "secret";
const db = new Map();
const h = (key) => db.get(key) || db.set(key, new Map()).get(key);
global.fetch = async (url, opts) => ({ ok: true, json: async () => JSON.parse(opts.body).map(([cmd, key, f, v, ...rest]) => {
  if (cmd === "HSET") { h(key).set(f, String(v)); return { result: 1 }; }
  if (cmd === "HINCRBY") { h(key).set(f, String(Number(h(key).get(f) || 0) + v)); return { result: 1 }; }
  if (cmd === "HVALS") return { result: [...h(key).values()] };
  if (cmd === "HGETALL") return { result: [...h(key)].flat() };
  if (cmd === "DEL") { [key, f, v, ...rest].forEach((k) => db.delete(k)); return { result: 1 }; }
  return { result: 1 };
}) });
const handler = require("../api/score.js");
const call = async (method, body, token) => {
  const out = {}; const res = { status(c) { out.code = c; return res; }, json(b) { out.body = b; return res; }, end() { return res; }, setHeader() {} };
  await handler({ method, body, headers: token ? { "x-admin-token": token } : {} }, res); return out;
};
(async () => {
  assert.equal((await call("POST", { id: "abc123def", group: "Team A", score: 450, answered: 5, total: 40 })).code, 204);
  assert.equal((await call("POST", { id: "bad id!", score: 1 })).code, 400);
  assert.equal((await call("GET")).code, 401);
  assert.equal((await call("GET", null, "wrong")).code, 401);
  const r = await call("GET", null, "secret");
  assert.equal(r.code, 200); assert.equal(r.body.teams[0].group, "Team A"); assert.equal(r.body.teams[0].status, "playing");

  // Question stats: first-try solve, solve after 2 wrong, timeout after 1 wrong, bad id ignored.
  const team = { id: "abc123def", group: "Team A", score: 500, answered: 6, total: 40 };
  await call("POST", { ...team, question: { id: "py-1", wrong: 0, correct: true } });
  await call("POST", { ...team, question: { id: "py-1", wrong: 2, correct: true } });
  await call("POST", { ...team, question: { id: "py-1", wrong: 1, correct: false, timedOut: true } });
  await call("POST", { ...team, question: { id: "<script>", wrong: 9 } });
  const q = (await call("GET", null, "secret")).body.questions;
  assert.deepEqual(q, { "py-1": { seen: 3, wrong: 3, timeout: 1, first: 1 } });

  assert.equal((await call("DELETE", null, "secret")).code, 204);
  const empty = (await call("GET", null, "secret")).body;
  assert.equal(empty.teams.length, 0); assert.deepEqual(empty.questions, {});
  console.log("ok");
})();
