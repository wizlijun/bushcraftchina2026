import { Hono } from "hono";
import type { AppEnv, Card } from "../types";
import { requireAuth, requireAdmin, canEditCard } from "../middleware/auth";
import {
  listIndex, getCard, putCard, deleteCard, upsertIndexEntry, emptyCard,
} from "../utils/cards";
import { loadKeys, saveKeys, generateKey } from "../utils/keys";

export function mountApi(app: Hono<AppEnv>): void {
  app.get("/api/cards", async (c) => c.json(await listIndex(c.env.BUCKET)));

  app.get("/api/card/:id", async (c) => {
    const card = await getCard(c.env.BUCKET, c.req.param("id"));
    if (!card) return c.text("we couldn’t find that maker", 404);
    return c.json(card);
  });

  app.post("/api/card/:id", requireAuth, async (c) => {
    const id = c.req.param("id");
    if (!canEditCard(c.get("auth")!, id)) return c.text("this door isn’t yours to open", 403);
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
    const body = (await c.req.json()) as Partial<Card> & { id?: string };
    const id = (body.id ?? "").trim();
    const brand = (body.brand ?? "").trim();
    if (!/^[a-z0-9-]+$/.test(id)) return c.text("the id isn’t quite right — lowercase letters, numbers or hyphens only", 400);
    if (!brand) return c.text("please give the workshop a name", 400);
    if (await getCard(c.env.BUCKET, id)) return c.text("that id is already taken", 400);
    const card: Card = {
      ...emptyCard(id, brand),
      ...body,
      id,
      brand,
    };
    await putCard(c.env.BUCKET, card);
    const idx = await listIndex(c.env.BUCKET);
    await upsertIndexEntry(c.env.BUCKET, { id, brand, order: idx.length + 1 });
    const keys = await loadKeys(c.env.BUCKET);
    const newKey = generateKey();
    keys.cards[id] = newKey;
    await saveKeys(c.env.BUCKET, keys);
    const origin = new URL(c.req.url).origin;
    return c.json({
      ok: true,
      id,
      brand,
      key: newKey,
      edit_url: `${origin}/edit/${encodeURIComponent(id)}?key=${encodeURIComponent(newKey)}`,
      card_url: `${origin}/card/${encodeURIComponent(id)}`,
      card,
    });
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
