import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { Hono } from "hono";
import { mountEdit } from "../src/routes/edit";
import { putCard, upsertIndexEntry, getCard } from "../src/utils/cards";
import { saveKeys } from "../src/utils/keys";
import type { AppEnv } from "../src/types";

function app() {
  const a = new Hono<AppEnv>();
  mountEdit(a);
  return a;
}

function formData(fields: Record<string, string | Blob | undefined>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    fd.append(k, v as any);
  }
  return fd;
}

describe("edit POST", () => {
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

  it("saves text fields", async () => {
    const fd = formData({
      action: "save",
      brand: "晌午v2",
      owner: "张三",
      specialty: "刀匠",
      description: "描述",
      wechat: "wxid",
      phone: "",
      link_label_new: "小红书",
      link_url_new: "https://xhs.com/x",
    });
    const res = await app().request(
      "/edit/shangwu?key=KSHANGWU",
      { method: "POST", body: fd },
      env
    );
    expect(res.status).toBe(303);
    const card = await getCard(env.BUCKET, "shangwu");
    expect(card?.brand).toBe("晌午v2");
    expect(card?.owner).toBe("张三");
    expect(card?.contact.wechat).toBe("wxid");
    expect(card?.links).toEqual([{ label: "小红书", url: "https://xhs.com/x" }]);
  });

  it("uploads logo image", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const file = new File([png], "logo.png", { type: "image/png" });
    const fd = formData({ action: "save", brand: "晌午", logo: file });
    const res = await app().request(
      "/edit/shangwu?key=KSHANGWU",
      { method: "POST", body: fd },
      env
    );
    expect(res.status).toBe(303);
    const card = await getCard(env.BUCKET, "shangwu");
    expect(card?.logo).toMatch(/^\/images\/shangwu\/logo-/);
    const stored = await env.BUCKET.head(card!.logo.slice(1));
    expect(stored).not.toBeNull();
  });

  it("rejects oversized image", async () => {
    const big = new Uint8Array(6 * 1024 * 1024);
    const file = new File([big], "x.png", { type: "image/png" });
    const fd = formData({ action: "save", brand: "晌午", logo: file });
    const res = await app().request(
      "/edit/shangwu?key=KSHANGWU",
      { method: "POST", body: fd },
      env
    );
    expect(res.status).toBe(400);
  });

  it("rejects non-image upload", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "x.exe", {
      type: "application/octet-stream",
    });
    const fd = formData({ action: "save", brand: "晌午", logo: file });
    const res = await app().request(
      "/edit/shangwu?key=KSHANGWU",
      { method: "POST", body: fd },
      env
    );
    expect(res.status).toBe(400);
  });

  it("rejects POST from foreign card key", async () => {
    await putCard(env.BUCKET, {
      id: "other", brand: "O", owner: "", logo: "", specialty: "",
      description: "", contact: {}, socials: {}, products: [], links: [],
    });
    const fd = formData({ action: "save", brand: "hack" });
    const res = await app().request(
      "/edit/other?key=KSHANGWU",
      { method: "POST", body: fd },
      env
    );
    expect(res.status).toBe(403);
  });

  it("deletes a product via del-product action", async () => {
    const card = await getCard(env.BUCKET, "shangwu");
    card!.products = ["/images/shangwu/p1.jpg"];
    await putCard(env.BUCKET, card!);
    await env.BUCKET.put("images/shangwu/p1.jpg", new Uint8Array([1]));
    const fd = formData({
      action: "del-product:/images/shangwu/p1.jpg",
      brand: "晌午",
    });
    const res = await app().request(
      "/edit/shangwu?key=KSHANGWU",
      { method: "POST", body: fd },
      env
    );
    expect(res.status).toBe(303);
    const updated = await getCard(env.BUCKET, "shangwu");
    expect(updated?.products).toEqual([]);
    expect(await env.BUCKET.get("images/shangwu/p1.jpg")).toBeNull();
  });

  it("admin can create new card via /edit/_new", async () => {
    const fd = formData({ new_id: "newone", new_brand: "新品" });
    const res = await app().request("/edit/_new?key=ADMIN", { method: "POST", body: fd }, env);
    expect(res.status).toBe(303);
    const card = await getCard(env.BUCKET, "newone");
    expect(card?.brand).toBe("新品");
  });

  it("non-admin cannot use /edit/_new", async () => {
    const fd = formData({ new_id: "x", new_brand: "y" });
    const res = await app().request(
      "/edit/_new?key=KSHANGWU",
      { method: "POST", body: fd },
      env
    );
    expect(res.status).toBe(403);
  });

  it("admin can delete and reset via /edit/_admin", async () => {
    let res = await app().request(
      "/edit/_admin?key=ADMIN",
      {
        method: "POST",
        body: formData({ action: "reset-key", reset_id: "shangwu" }),
      },
      env
    );
    expect(res.status).toBe(303);
    res = await app().request(
      "/edit/_admin?key=ADMIN",
      {
        method: "POST",
        body: formData({ action: "delete", del_id: "shangwu" }),
      },
      env
    );
    expect(res.status).toBe(303);
    expect(await getCard(env.BUCKET, "shangwu")).toBeNull();
  });
});
