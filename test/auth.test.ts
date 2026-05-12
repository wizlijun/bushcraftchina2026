import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { Hono } from "hono";
import { requireAuth, requireAdmin } from "../src/middleware/auth";
import { saveKeys } from "../src/utils/keys";
import type { AppEnv } from "../src/types";

function buildApp() {
  const app = new Hono<AppEnv>();
  app.get("/private", requireAuth, (c) => c.json(c.get("auth")));
  app.get("/admin", requireAuth, requireAdmin, (c) => c.text("ok"));
  return app;
}

describe("auth middleware", () => {
  beforeEach(async () => {
    const list = await env.BUCKET.list();
    for (const o of list.objects) await env.BUCKET.delete(o.key);
    await saveKeys(env.BUCKET, { admin: "ADMIN", cards: { shangwu: "KSHANGWU" } });
  });

  it("rejects missing key", async () => {
    const res = await buildApp().request("/private", {}, env);
    expect(res.status).toBe(403);
  });

  it("accepts admin key", async () => {
    const res = await buildApp().request("/private?key=ADMIN", {}, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ role: "admin" });
  });

  it("accepts card key", async () => {
    const res = await buildApp().request("/private?key=KSHANGWU", {}, env);
    expect(await res.json()).toEqual({ role: "card", cardId: "shangwu" });
  });

  it("requireAdmin rejects card key", async () => {
    const res = await buildApp().request("/admin?key=KSHANGWU", {}, env);
    expect(res.status).toBe(403);
  });

  it("requireAdmin accepts admin", async () => {
    const res = await buildApp().request("/admin?key=ADMIN", {}, env);
    expect(res.status).toBe(200);
  });
});
