import { Hono } from "hono";
import { html, raw } from "hono/html";
import type { AppEnv, Card } from "../types";
import { layout } from "../templates/layout";
import { renderCard } from "../templates/card";
import { renderLogoWall } from "../templates/logo-wall";
import { getCard, loadAllCards } from "../utils/cards";
import { getImage } from "../utils/r2";
import {
  origin,
  homeMeta,
  cardMeta,
  isPublished,
  buildSitemap,
  buildRobots,
} from "../utils/seo";

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
    const o = origin(c.req.url);
    const meta = homeMeta(o);
    const cards: Card[] = await loadAllCards(c.env.BUCKET);
    const published = cards.filter(isPublished);
    if (published.length === 0) {
      const empty = html`<div class="empty">no makers gathered yet · the fire is only just lit</div>`;
      return c.html(layout(meta, await empty));
    }
    const ordered = shuffled(published);
    const rendered = await Promise.all(
      ordered.map(async (card) => (await renderCard(card)).toString())
    );
    const body = html`<main class="feed">${raw(rendered.join(""))}</main>`;
    const headers = { "cache-control": "no-store" };
    return c.html(layout(meta, await body), 200, headers);
  });

  app.get("/logo", async (c) => {
    const o = origin(c.req.url);
    const cards: Card[] = await loadAllCards(c.env.BUCKET);
    const meta = {
      title: "Crafters · Bushcraft China Community",
      description: "Marks of every workshop gathered at Bushcraft China 2026.",
      canonical: `${o}/logo`,
      image: `${o}/b.png`,
      type: "website" as const,
    };
    const body = await renderLogoWall(cards);
    return c.html(layout(meta, body), 200, { "cache-control": "no-store" });
  });

  app.get("/card/:id", async (c) => {
    const card = await getCard(c.env.BUCKET, c.req.param("id"));
    if (!card) return c.text("we couldn’t find that maker", 404);
    const o = origin(c.req.url);
    const published = isPublished(card);
    const meta = cardMeta(card, o, { published });
    const cardHtml = await renderCard(card, { asDetail: true });
    const body = html`<main class="feed">${cardHtml}</main>`;
    return c.html(layout(meta, await body), 200, { "cache-control": "no-store" });
  });

  app.get("/sitemap.xml", async (c) => {
    const cards = await loadAllCards(c.env.BUCKET);
    const xml = buildSitemap(origin(c.req.url), cards);
    return new Response(xml, {
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "public, max-age=600",
      },
    });
  });

  app.get("/robots.txt", (c) => {
    const body = buildRobots(origin(c.req.url));
    return new Response(body, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    });
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
