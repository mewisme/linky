#!/usr/bin/env node
import { setTimeout as wait } from "node:timers/promises";

const TS = process.env.TS_BASE_URL || "http://127.0.0.1:7270";
const GO = process.env.GO_BASE_URL || "http://127.0.0.1:17270";

const endpoints = [
  { name: "GET /healthz", path: "/healthz", auth: false },
  { name: "GET /api", path: "/api", auth: false },
  { name: "GET /api/v1/interest-tags?limit=5", path: "/api/v1/interest-tags?limit=5", auth: false },
  { name: "GET /api/v1/users/me (no auth -> 401)", path: "/api/v1/users/me", auth: false, expectStatus: 401 },
  { name: "GET /api/v1/users/level/me (no auth -> 401)", path: "/api/v1/users/level/me", auth: false, expectStatus: 401 },
  { name: "GET /api/v1/users/streak/me (no auth -> 401)", path: "/api/v1/users/streak/me", auth: false, expectStatus: 401 },
  { name: "GET /api/v1/notifications/me (no auth -> 401)", path: "/api/v1/notifications/me", auth: false, expectStatus: 401 },
  { name: "GET /api/v1/matchmaking/queue-status", path: "/api/v1/matchmaking/queue-status", auth: false },
  { name: "GET /api/v1/admin/users (no auth -> 401)", path: "/api/v1/admin/users", auth: false, expectStatus: 401 },
];

async function fetchJson(base, path) {
  try {
    const res = await fetch(base + path, { redirect: "manual" });
    const text = await res.text();
    let body = text;
    try { body = JSON.parse(text); } catch {}
    return { status: res.status, body, ok: res.ok };
  } catch (err) {
    return { error: String(err) };
  }
}

function topLevelKeys(v) {
  if (v == null || typeof v !== "object") return null;
  if (Array.isArray(v)) return ["[array]"];
  return Object.keys(v).sort();
}

function shapeMatch(a, b) {
  const ka = topLevelKeys(a);
  const kb = topLevelKeys(b);
  if (ka == null && kb == null) return true;
  if (!ka || !kb) return false;
  return JSON.stringify(ka) === JSON.stringify(kb);
}

function nestedKeysOfFirstItem(body) {
  if (!body) return null;
  if (Array.isArray(body)) {
    return body.length === 0 ? "[]" : topLevelKeys(body[0]);
  }
  if (body.data && Array.isArray(body.data)) {
    return body.data.length === 0 ? "data:[]" : topLevelKeys(body.data[0]);
  }
  return null;
}

const rows = [];
for (const ep of endpoints) {
  const tsRes = await fetchJson(TS, ep.path);
  const goRes = await fetchJson(GO, ep.path);
  const tsKeys = JSON.stringify(topLevelKeys(tsRes.body));
  const goKeys = JSON.stringify(topLevelKeys(goRes.body));
  const tsItem = JSON.stringify(nestedKeysOfFirstItem(tsRes.body));
  const goItem = JSON.stringify(nestedKeysOfFirstItem(goRes.body));
  const statusMatch = tsRes.status === goRes.status;
  const shapeOK = shapeMatch(tsRes.body, goRes.body);
  rows.push({ name: ep.name, ts: tsRes.status, go: goRes.status, statusMatch, shapeMatch: shapeOK, tsKeys, goKeys, tsItem, goItem });
  await wait(50);
}

console.log("\nParity smoke results");
console.log("=".repeat(80));
for (const r of rows) {
  const flag = r.statusMatch && r.shapeMatch ? "OK" : "DIFF";
  console.log(`${flag.padEnd(4)} ${r.name}`);
  console.log(`     ts=${r.ts} go=${r.go} | top-keys ts=${r.tsKeys} go=${r.goKeys}`);
  if (r.tsItem || r.goItem) {
    console.log(`     item-keys ts=${r.tsItem} go=${r.goItem}`);
  }
}

const allOK = rows.every((r) => r.statusMatch && r.shapeMatch);
console.log("\n" + (allOK ? "ALL ENDPOINTS PARITY: OK" : "PARITY DIFFERENCES PRESENT"));
process.exit(allOK ? 0 : 1);
