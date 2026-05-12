import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { Hono } from "hono";
import { mountApi } from "../src/routes/api";
import { putCard, upsertIndexEntry, getCard } from "../src/utils/cards";
import { saveKeys } from "../src/utils/keys";
import type { AppEnv } from "../src/types";

function app() {
  const a = new Hono<AppEnv>();
  mountApi(a);
  return a;
}

describe("api routes", () => {
  beforeEach(async () => {
    const list = await env.BUCKET.list();
    for (const o of list.objects) await env.BUCKET.delete(o.key);
    await saveKeys(env.BUCKET, { admin: "ADMIN", cards: { shangwu: "KSHANGWU" } });
    await putCard(env.BUCKET, {
      id: "shangwu", brand: "晌午", owner: "", logo: "", specialty: "刀匠",
      description: "", contact: {}, products: [], links: [],
    });
    await upsertIndexEntry(env.BUCKET, { id: "shangwu", brand: "晌午", order: 1 });
  });

  it("GET /api/cards returns index publicly", async () => {
    const res = await app().request("/api/cards", {}, env);
    expect(res.status).toBe(200);
    const body = await res.json<any>();
    expect(body).toEqual([{ id: "shangwu", brand: "晌午", order: 1 }]);
  });

  it("GET /api/card/:id returns card", async () => {
    const res = await app().request("/api/card/shangwu", {}, env);
    expect(res.status).toBe(200);
    expect((await res.json<any>()).brand).toBe("晌午");
  });

  it("POST /api/card/:id without key fails", async () => {
    const res = await app().request(
      "/api/card/shangwu",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brand: "hacked" }),
      },
      env
    );
    expect(res.status).toBe(403);
  });

  it("POST /api/card/:id with card key updates", async () => {
    const res = await app().request(
      "/api/card/shangwu?key=KSHANGWU",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brand: "晌午v3", specialty: "x" }),
      },
      env
    );
    expect(res.status).toBe(200);
    expect((await getCard(env.BUCKET, "shangwu"))?.brand).toBe("晌午v3");
  });

  it("POST /api/cards admin-only creates card", async () => {
    const res = await app().request(
      "/api/cards?key=ADMIN",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: "newone", brand: "新" }),
      },
      env
    );
    expect(res.status).toBe(200);
    const body = await res.json<any>();
    expect(body.key).toMatch(/^[a-f0-9]{32}$/);
  });

  it("DELETE /api/card/:id admin-only", async () => {
    const res = await app().request(
      "/api/card/shangwu?key=KSHANGWU",
      { method: "DELETE" },
      env
    );
    expect(res.status).toBe(403);
    const res2 = await app().request(
      "/api/card/shangwu?key=ADMIN",
      { method: "DELETE" },
      env
    );
    expect(res2.status).toBe(200);
    expect(await getCard(env.BUCKET, "shangwu")).toBeNull();
  });
});
