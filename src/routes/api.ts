import { Hono } from "hono";
import type { Env, AuthContext, Card } from "../types";
import { requireAuth, requireAdmin, canEditCard } from "../middleware/auth";
import {
  listIndex, getCard, putCard, deleteCard, upsertIndexEntry, emptyCard,
} from "../utils/cards";
import { loadKeys, saveKeys, generateKey } from "../utils/keys";

type Vars = { auth: AuthContext };

export function mountApi(app: Hono<{ Bindings: Env; Variables: Vars }>): void {
  app.get("/api/cards", async (c) => c.json(await listIndex(c.env.BUCKET)));

  app.get("/api/card/:id", async (c) => {
    const card = await getCard(c.env.BUCKET, c.req.param("id"));
    if (!card) return c.text("not found", 404);
    return c.json(card);
  });

  app.post("/api/card/:id", requireAuth, async (c) => {
    const id = c.req.param("id");
    if (!canEditCard(c.get("auth"), id)) return c.text("无权限", 403);
    const patch = (await c.req.json()) as Partial<Card>;
    const current = (await getCard(c.env.BUCKET, id)) ?? emptyCard(id, patch.brand ?? "");
    const merged: Card = { ...current, ...patch, id };
    await putCard(c.env.BUCKET, merged);
    const idx = await listIndex(c.env.BUCKET);
    const existing = idx.find((e) => e.id === id);
    await upsertIndexEntry(c.env.BUCKET, {
      id,
      brand: merged.brand,
      order: existing?.order ?? idx.length + 1,
    });
    return c.json(merged);
  });

  app.post("/api/cards", requireAuth, requireAdmin, async (c) => {
    const body = (await c.req.json()) as { id?: string; brand?: string };
    const id = (body.id ?? "").trim();
    const brand = (body.brand ?? "").trim();
    if (!/^[a-z0-9-]+$/.test(id)) return c.text("非法 id", 400);
    if (!brand) return c.text("品牌名必填", 400);
    if (await getCard(c.env.BUCKET, id)) return c.text("id 已存在", 400);
    const card = emptyCard(id, brand);
    await putCard(c.env.BUCKET, card);
    const idx = await listIndex(c.env.BUCKET);
    await upsertIndexEntry(c.env.BUCKET, { id, brand, order: idx.length + 1 });
    const keys = await loadKeys(c.env.BUCKET);
    const newKey = generateKey();
    keys.cards[id] = newKey;
    await saveKeys(c.env.BUCKET, keys);
    return c.json({ card, key: newKey });
  });

  app.delete("/api/card/:id", requireAuth, requireAdmin, async (c) => {
    const id = c.req.param("id");
    await deleteCard(c.env.BUCKET, id);
    const keys = await loadKeys(c.env.BUCKET);
    delete keys.cards[id];
    await saveKeys(c.env.BUCKET, keys);
    return c.json({ ok: true });
  });
}
