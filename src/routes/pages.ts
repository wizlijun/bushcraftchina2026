import { Hono } from "hono";
import { html, raw } from "hono/html";
import type { AppEnv, Card } from "../types";
import { layout } from "../templates/layout";
import { renderCard } from "../templates/card";
import { getCard, loadAllCards } from "../utils/cards";
import { getImage } from "../utils/r2";

function shuffled<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const j = buf[0] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function mountPages(app: Hono<AppEnv>): void {
  app.get("/", async (c) => {
    const cards: Card[] = await loadAllCards(c.env.BUCKET);
    if (cards.length === 0) {
      const empty = html`<div class="empty">no makers gathered yet · the fire is only just lit</div>`;
      return c.html(layout("a gathering of makers · bushcraft china", await empty));
    }
    const ordered = shuffled(cards);
    const rendered = await Promise.all(
      ordered.map(async (card) => (await renderCard(card)).toString())
    );
    const body = html`<main class="feed">${raw(rendered.join(""))}</main>`;
    const headers = { "cache-control": "no-store" };
    return c.html(layout("a gathering of makers · bushcraft china", await body), 200, headers);
  });

  app.get("/card/:id", async (c) => {
    const card = await getCard(c.env.BUCKET, c.req.param("id"));
    if (!card) return c.text("we couldn’t find that maker", 404);
    const cardHtml = await renderCard(card);
    const body = html`<main class="feed">${cardHtml}</main>`;
    return c.html(layout(`${card.brand} · bushcraft china`, await body));
  });

  app.get("/images/:id/:filename{.+}", async (c) => {
    const id = c.req.param("id");
    const filename = c.req.param("filename");
    const obj = await getImage(c.env.BUCKET, `images/${id}/${filename}`);
    if (!obj) return c.text("nothing here", 404);
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set("etag", obj.httpEtag);
    if (!headers.has("cache-control")) headers.set("cache-control", "public, max-age=86400");
    return new Response(obj.body, { headers });
  });
}
