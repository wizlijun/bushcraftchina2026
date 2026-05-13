import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { Hono } from "hono";
import { mountEdit } from "../src/routes/edit";
import { putCard, upsertIndexEntry } from "../src/utils/cards";
import { saveKeys } from "../src/utils/keys";
import type { AppEnv } from "../src/types";

function app() {
  const a = new Hono<AppEnv>();
  mountEdit(a);
  return a;
}

describe("edit GET", () => {
  beforeEach(async () => {
    const list = await env.BUCKET.list();
    for (const o of list.objects) await env.BUCKET.delete(o.key);
    await saveKeys(env.BUCKET, { admin: "ADMIN", cards: { shangwu: "KSHANGWU" } });
    await putCard(env.BUCKET, {
      id: "shangwu", brand: "晌午", owner: "", logo: "", specialty: "刀匠",
      description: "", contact: {}, socials: {}, products: [], links: [],
    });
    await upsertIndexEntry(env.BUCKET, { id: "shangwu", brand: "晌午", order: 1 });
  });

  it("/edit without key returns 403", async () => {
    const res = await app().request("/edit", {}, env);
    expect(res.status).toBe(403);
  });

  it("/edit?key=ADMIN shows admin list", async () => {
    const res = await app().request("/edit?key=ADMIN", {}, env);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("the steward");
    expect(body).toContain("晌午");
  });

  it("/edit?key=KSHANGWU shows that card's edit form", async () => {
    const res = await app().request("/edit?key=KSHANGWU", {}, env);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("tending to");
  });

  it("/edit/shangwu?key=KSHANGWU shows form", async () => {
    const res = await app().request("/edit/shangwu?key=KSHANGWU", {}, env);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("name of the workshop");
  });

  it("/edit/other?key=KSHANGWU returns 403", async () => {
    await putCard(env.BUCKET, {
      id: "other", brand: "O", owner: "", logo: "", specialty: "",
      description: "", contact: {}, socials: {}, products: [], links: [],
    });
    const res = await app().request("/edit/other?key=KSHANGWU", {}, env);
    expect(res.status).toBe(403);
  });
});
