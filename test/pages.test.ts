import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { Hono } from "hono";
import { mountPages } from "../src/routes/pages";
import { putCard, upsertIndexEntry } from "../src/utils/cards";
import { putImage } from "../src/utils/r2";
import type { AppEnv } from "../src/types";

function buildApp() {
  const app = new Hono<AppEnv>();
  mountPages(app);
  return app;
}

describe("pages routes", () => {
  beforeEach(async () => {
    const list = await env.BUCKET.list();
    for (const o of list.objects) await env.BUCKET.delete(o.key);
  });

  it("GET / returns empty state when no cards", async () => {
    const res = await buildApp().request("/", {}, env);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("no makers gathered yet");
  });

  it("GET / lists cards by order", async () => {
    await putCard(env.BUCKET, {
      id: "a", brand: "A", owner: "", logo: "", specialty: "S",
      description: "", contact: {}, socials: {}, products: [], links: [],
    });
    await upsertIndexEntry(env.BUCKET, { id: "a", brand: "A", order: 1 });
    const res = await buildApp().request("/", {}, env);
    const body = await res.text();
    expect(body).toContain("A");
    expect(body).toContain("S");
  });

  it("GET /card/:id returns single card page", async () => {
    await putCard(env.BUCKET, {
      id: "shangwu", brand: "晌午", owner: "", logo: "", specialty: "刀匠",
      description: "", contact: {}, socials: {}, products: [], links: [],
    });
    await upsertIndexEntry(env.BUCKET, { id: "shangwu", brand: "晌午", order: 1 });
    const res = await buildApp().request("/card/shangwu", {}, env);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("晌午");
  });

  it("GET /card/:id returns 404 for unknown", async () => {
    const res = await buildApp().request("/card/none", {}, env);
    expect(res.status).toBe(404);
  });

  it("GET /images/:id/:filename returns binary", async () => {
    const data = new Uint8Array([1, 2, 3, 4]);
    await putImage(env.BUCKET, "images/x/y.png", data.buffer, "image/png");
    const res = await buildApp().request("/images/x/y.png", {}, env);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("image/png");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(data);
  });

  it("GET /images/:id/:filename 404 when missing", async () => {
    const res = await buildApp().request("/images/x/none.png", {}, env);
    expect(res.status).toBe(404);
  });

  it("GET /card/:id?print renders the print template", async () => {
    await putCard(env.BUCKET, {
      id: "shangwu", brand: "晌午", owner: "Jerry", logo: "", specialty: "刀匠",
      description: "", contact: {}, socials: {}, products: [], links: [],
    });
    await upsertIndexEntry(env.BUCKET, { id: "shangwu", brand: "晌午", order: 1 });
    const res = await buildApp().request("/card/shangwu?print", {}, env);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("晌午");
    expect(body).toContain("Jerry");
    expect(body).toContain("Bushcraft China Community");
    expect(body).toContain("html2canvas");
    expect(body).not.toContain("voice-sheet");
    expect(body).not.toContain("swipe-hint");
  });

  it("GET /card/:id?print returns 404 for unknown", async () => {
    const res = await buildApp().request("/card/none?print", {}, env);
    expect(res.status).toBe(404);
  });

  it("GET /logo?print rewrites card links with ?print", async () => {
    await putCard(env.BUCKET, {
      id: "shangwu", brand: "晌午", owner: "", logo: "/images/shangwu/logo.png", specialty: "刀匠",
      description: "", contact: {}, socials: {}, products: [], links: [],
    });
    await upsertIndexEntry(env.BUCKET, { id: "shangwu", brand: "晌午", order: 1 });
    const res = await buildApp().request("/logo?print", {}, env);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('href="/card/shangwu?print"');
  });

  it("GET /logo without ?print keeps plain card links", async () => {
    await putCard(env.BUCKET, {
      id: "shangwu", brand: "晌午", owner: "", logo: "/images/shangwu/logo.png", specialty: "刀匠",
      description: "", contact: {}, socials: {}, products: [], links: [],
    });
    await upsertIndexEntry(env.BUCKET, { id: "shangwu", brand: "晌午", order: 1 });
    const res = await buildApp().request("/logo", {}, env);
    const body = await res.text();
    expect(body).toContain('href="/card/shangwu"');
    expect(body).not.toContain('href="/card/shangwu?print"');
  });
});
