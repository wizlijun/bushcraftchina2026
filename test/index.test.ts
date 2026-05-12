import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";
import { saveKeys } from "../src/utils/keys";

describe("app entrypoint", () => {
  beforeEach(async () => {
    const list = await env.BUCKET.list();
    for (const o of list.objects) await env.BUCKET.delete(o.key);
  });

  it("serves /", async () => {
    const res = await app.request("/", {}, env);
    expect(res.status).toBe(200);
  });

  it("serves /api/cards", async () => {
    const res = await app.request("/api/cards", {}, env);
    expect(res.status).toBe(200);
  });

  it("/edit requires key", async () => {
    await saveKeys(env.BUCKET, { admin: "A", cards: {} });
    const res = await app.request("/edit", {}, env);
    expect(res.status).toBe(403);
  });

  it("returns 404 for unknown", async () => {
    const res = await app.request("/nope", {}, env);
    expect(res.status).toBe(404);
  });
});
