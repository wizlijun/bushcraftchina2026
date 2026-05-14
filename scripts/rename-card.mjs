#!/usr/bin/env node
// One-off: rename a card id in R2.
// Usage: node scripts/rename-card.mjs <oldId> <newId> [bucket] [--dry-run]
//   bucket defaults to "bushcraftchina2026" (prod).
//
// Moves: cards/{id}.json, cards/index.json entry, keys.json mapping,
//        images/{id}/* (referenced from card), voices/{id}/* (+ index.json).
// Copy-then-delete: old objects only deleted after new writes succeed.

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const positional = args.filter((a) => !a.startsWith("--"));
const [OLD, NEW, BUCKET = "bushcraftchina2026"] = positional;

if (!OLD || !NEW) {
  console.error("usage: node scripts/rename-card.mjs <oldId> <newId> [bucket] [--dry-run]");
  process.exit(2);
}
if (!/^[a-z0-9-]+$/.test(NEW)) {
  console.error(`abort: newId "${NEW}" must match /^[a-z0-9-]+$/`);
  process.exit(2);
}

function tmpFile(suffix = "") {
  return join(tmpdir(), `r2-${Date.now()}-${Math.random().toString(36).slice(2)}${suffix}`);
}

function r2Get(key) {
  const f = tmpFile();
  try {
    execSync(`npx wrangler r2 object get "${BUCKET}/${key}" --file="${f}"`, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    return f;
  } catch {
    return null;
  }
}

function r2GetJson(key) {
  const f = r2Get(key);
  if (!f) return null;
  const data = readFileSync(f, "utf8");
  rmSync(f, { force: true });
  return JSON.parse(data);
}

function r2PutJson(key, value) {
  if (DRY) { console.log(`[dry] put  ${key}`); return; }
  const f = tmpFile(".json");
  writeFileSync(f, JSON.stringify(value));
  execSync(
    `npx wrangler r2 object put "${BUCKET}/${key}" --file="${f}" --content-type="application/json; charset=utf-8"`,
    { stdio: "inherit" }
  );
  rmSync(f, { force: true });
}

function r2PutFile(key, filePath, contentType) {
  if (DRY) { console.log(`[dry] put  ${key} (${contentType})`); return; }
  execSync(
    `npx wrangler r2 object put "${BUCKET}/${key}" --file="${filePath}" --content-type="${contentType}"`,
    { stdio: "inherit" }
  );
}

function r2Delete(key) {
  if (DRY) { console.log(`[dry] del  ${key}`); return; }
  execSync(`npx wrangler r2 object delete "${BUCKET}/${key}"`, { stdio: "inherit" });
}

function mimeFromExt(ext) {
  switch (ext.toLowerCase()) {
    case "jpg": case "jpeg": return "image/jpeg";
    case "png": return "image/png";
    case "webp": return "image/webp";
    case "gif": return "image/gif";
    case "mp3": return "audio/mpeg";
    case "m4a": return "audio/mp4";
    case "wav": return "audio/wav";
    case "ogg": case "oga": return "audio/ogg";
    case "webm": return "audio/webm";
    default: return "application/octet-stream";
  }
}

const extOf = (k) => k.split(".").pop() ?? "";

console.log(`renaming "${OLD}" -> "${NEW}" in bucket ${BUCKET}${DRY ? "  (DRY RUN)" : ""}`);

// preflight
if (r2GetJson(`cards/${NEW}.json`)) {
  console.error(`abort: cards/${NEW}.json already exists`);
  process.exit(1);
}
const card = r2GetJson(`cards/${OLD}.json`);
if (!card) {
  console.error(`abort: cards/${OLD}.json not found`);
  process.exit(1);
}
const cardsIndex = r2GetJson("cards/index.json") ?? [];
const keys = r2GetJson("keys.json");
if (!keys) {
  console.error("abort: keys.json not found");
  process.exit(1);
}
const voicesIndex = r2GetJson(`voices/${OLD}/index.json`);

// enumerate image keys referenced by the card
const imageOldKeys = [];
if (typeof card.logo === "string" && card.logo.startsWith(`/images/${OLD}/`)) {
  imageOldKeys.push(card.logo.slice(1));
}
for (const p of card.products ?? []) {
  if (typeof p === "string" && p.startsWith(`/images/${OLD}/`)) {
    imageOldKeys.push(p.slice(1));
  }
}

// enumerate voice audio keys
const voiceOldKeys = [];
if (voicesIndex?.items?.length) {
  for (const v of voicesIndex.items) {
    voiceOldKeys.push({ key: `voices/${OLD}/${v.id}.${v.ext}`, ct: v.content_type });
  }
}

console.log(`\nplan:`);
console.log(`  card json:     cards/${OLD}.json -> cards/${NEW}.json`);
console.log(`  index entry:   ${cardsIndex.some((e) => e.id === OLD) ? "yes" : "missing!"}`);
console.log(`  keys mapping:  ${keys.cards[OLD] ? "yes" : "missing!"}`);
console.log(`  images (${imageOldKeys.length}):`);
for (const k of imageOldKeys) console.log(`    ${k}`);
console.log(`  voices index:  ${voicesIndex ? "yes" : "none"}`);
console.log(`  voice audio (${voiceOldKeys.length}):`);
for (const v of voiceOldKeys) console.log(`    ${v.key}`);

// copy phase (writes new before deleting old)
const downloaded = [];

for (const oldKey of imageOldKeys) {
  const newKey = oldKey.replace(`images/${OLD}/`, `images/${NEW}/`);
  if (DRY) { console.log(`[dry] copy ${oldKey} -> ${newKey}`); continue; }
  const tmp = r2Get(oldKey);
  if (!tmp) { console.warn(`warn: source missing, skipping ${oldKey}`); continue; }
  r2PutFile(newKey, tmp, mimeFromExt(extOf(oldKey)));
  downloaded.push(tmp);
}

for (const { key: oldKey, ct } of voiceOldKeys) {
  const newKey = oldKey.replace(`voices/${OLD}/`, `voices/${NEW}/`);
  if (DRY) { console.log(`[dry] copy ${oldKey} -> ${newKey}`); continue; }
  const tmp = r2Get(oldKey);
  if (!tmp) { console.warn(`warn: source missing, skipping ${oldKey}`); continue; }
  r2PutFile(newKey, tmp, ct || mimeFromExt(extOf(oldKey)));
  downloaded.push(tmp);
}

for (const t of downloaded) rmSync(t, { force: true });

// rewrite metadata
const newCard = { ...card, id: NEW };
if (typeof newCard.logo === "string") {
  newCard.logo = newCard.logo.replace(`/images/${OLD}/`, `/images/${NEW}/`);
}
if (Array.isArray(newCard.products)) {
  newCard.products = newCard.products.map((p) =>
    typeof p === "string" ? p.replace(`/images/${OLD}/`, `/images/${NEW}/`) : p
  );
}
r2PutJson(`cards/${NEW}.json`, newCard);

if (voicesIndex) r2PutJson(`voices/${NEW}/index.json`, voicesIndex);

const newCardsIndex = cardsIndex.map((e) => (e.id === OLD ? { ...e, id: NEW } : e));
r2PutJson("cards/index.json", newCardsIndex);

if (keys.cards[OLD]) {
  keys.cards[NEW] = keys.cards[OLD];
  delete keys.cards[OLD];
}
r2PutJson("keys.json", keys);

// delete phase
for (const k of imageOldKeys) r2Delete(k);
for (const { key } of voiceOldKeys) r2Delete(key);
if (voicesIndex) r2Delete(`voices/${OLD}/index.json`);
r2Delete(`cards/${OLD}.json`);

console.log(`\n${DRY ? "dry run done." : "done."}`);
