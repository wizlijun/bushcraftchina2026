import { Hono } from "hono";
import { html, raw } from "hono/html";
import type { Env } from "../types";
import { layout } from "../templates/layout";
import { renderCard } from "../templates/card";
import { getCard, loadAllCards } from "../utils/cards";
import { getImage } from "../utils/r2";

export function mountPages(app: Hono<{ Bindings: Env }>): void {
  app.get("/", async (c) => {
    const cards = await loadAllCards(c.env.BUCKET);
    const body =
      cards.length === 0
        ? html`<div class="empty">还没有卡片</div>`
        : html`<main class="feed">${raw(cards.map((card) => renderCard(card).toString()).join(""))}</main>`;
    return c.html(layout("中国 Bushcraft 工匠展", body));
  });

  app.get("/card/:id", async (c) => {
    const card = await getCard(c.env.BUCKET, c.req.param("id"));
    if (!card) return c.text("卡片不存在", 404);
    const body = html`<main class="feed">${renderCard(card)}</main>`;
    return c.html(layout(`${card.brand} · Bushcraft`, body));
  });

  app.get("/images/:id/:filename", async (c) => {
    const id = c.req.param("id");
    const filename = c.req.param("filename");
    const obj = await getImage(c.env.BUCKET, `images/${id}/${filename}`);
    if (!obj) return c.text("not found", 404);
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set("etag", obj.httpEtag);
    if (!headers.has("cache-control")) headers.set("cache-control", "public, max-age=86400");
    return new Response(obj.body, { headers });
  });
}
