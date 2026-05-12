import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { generateKey, loadKeys, saveKeys, verifyKey } from "../src/utils/keys";

describe("keys utils", () => {
  beforeEach(async () => {
    const list = await env.BUCKET.list();
    for (const obj of list.objects) await env.BUCKET.delete(obj.key);
  });

  it("generateKey produces 32-char hex string", () => {
    const k = generateKey();
    expect(k).toMatch(/^[a-f0-9]{32}$/);
    expect(generateKey()).not.toBe(k);
  });

  it("loadKeys returns default when missing", async () => {
    const keys = await loadKeys(env.BUCKET);
    expect(keys).toEqual({ admin: "", cards: {} });
  });

  it("saveKeys then loadKeys roundtrips", async () => {
    await saveKeys(env.BUCKET, { admin: "A", cards: { x: "K" } });
    expect(await loadKeys(env.BUCKET)).toEqual({ admin: "A", cards: { x: "K" } });
  });

  it("verifyKey identifies admin", async () => {
    await saveKeys(env.BUCKET, { admin: "ADMIN", cards: { x: "K" } });
    expect(await verifyKey(env.BUCKET, "ADMIN")).toEqual({ role: "admin" });
  });

  it("verifyKey identifies card key", async () => {
    await saveKeys(env.BUCKET, { admin: "ADMIN", cards: { x: "K", y: "Q" } });
    expect(await verifyKey(env.BUCKET, "Q")).toEqual({ role: "card", cardId: "y" });
  });

  it("verifyKey returns null on invalid", async () => {
    await saveKeys(env.BUCKET, { admin: "ADMIN", cards: {} });
    expect(await verifyKey(env.BUCKET, "nope")).toBeNull();
  });

  it("verifyKey rejects empty key", async () => {
    await saveKeys(env.BUCKET, { admin: "", cards: { x: "" } });
    expect(await verifyKey(env.BUCKET, "")).toBeNull();
  });
});
