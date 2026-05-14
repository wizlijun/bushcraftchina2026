import { Hono } from "hono";
import type { AppEnv, Card } from "../types";
import { getCard, putCard } from "../utils/cards";

export function mountLikes(app: Hono<AppEnv>): void {
  app.post("/api/like/:cardId", async (c) => {
    const cardId = c.req.param("cardId");
    const card = await getCard(c.env.BUCKET, cardId);
    if (!card) return c.text("card not found", 404);

    let body: { action?: string } = {};
    try {
      body = (await c.req.json()) as { action?: string };
    } catch {}
    const delta = body.action === "unlike" ? -1 : 1;

    const next = Math.max(0, (card.like_count ?? 0) + delta);
    const updated: Card = { ...card, like_count: next };
    await putCard(c.env.BUCKET, updated);
    return c.json({ ok: true, like_count: next });
  });
}
