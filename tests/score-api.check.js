// Self-check for api/score.js with an in-memory fake Upstash. Run: node tests/score-api.check.js
const assert = require("assert");
process.env.KV_REST_API_URL = "https://fake"; process.env.KV_REST_API_TOKEN = "t"; process.env.ADMIN_TOKEN = "secret";
const hash = new Map();
global.fetch = async (url, opts) => ({ ok: true, json: async () => JSON.parse(opts.body).map(([cmd, , f, v]) => {
  if (cmd === "HSET") { hash.set(f, v); return { result: 1 }; }
  if (cmd === "HVALS") return { result: [...hash.values()] };
  if (cmd === "DEL") { hash.clear(); return { result: 1 }; }
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
  assert.equal((await call("DELETE", null, "secret")).code, 204);
  assert.equal((await call("GET", null, "secret")).body.teams.length, 0);
  console.log("ok");
})();
