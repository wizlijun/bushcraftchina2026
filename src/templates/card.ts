import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { Card } from "../types";
import { escapeHtml } from "../utils/escape";

type HtmlOut = HtmlEscapedString | Promise<HtmlEscapedString> | string;

function renderProducts(products: string[]): HtmlOut {
  if (!products.length) return "";
  const imgs = products
    .map((src) => `<img loading="lazy" src="${escapeHtml(src)}" alt="" />`)
    .join("");
  return html`<div class="products">${raw(imgs)}</div>`;
}

function renderLinks(links: Card["links"]): HtmlOut {
  if (!links.length) return "";
  const items = links
    .map(
      (l) =>
        `<a href="${escapeHtml(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.label)}</a>`
    )
    .join("");
  return html`<div class="links">${raw(items)}</div>`;
}

function renderContact(contact: Card["contact"]): HtmlOut {
  const parts: string[] = [];
  if (contact.wechat) parts.push(`微信：${escapeHtml(contact.wechat)}`);
  if (contact.phone) parts.push(`电话：${escapeHtml(contact.phone)}`);
  if (!parts.length) return "";
  return html`<div class="contact">${raw(parts.join("　·　"))}</div>`;
}

export function renderCard(card: Card): HtmlEscapedString | Promise<HtmlEscapedString> {
  const logoSrc = card.logo || "/images/_placeholder/logo.png";
  return html`<section class="card" data-id="${card.id}">
  <img class="logo" src="${logoSrc}" alt="${card.brand} logo" />
  <h2 class="brand serif">${card.brand}</h2>
  <div class="specialty">${card.specialty}</div>
  ${card.owner ? html`<div class="owner">主理人 · ${card.owner}</div>` : ""}
  ${card.description ? html`<p class="desc">${card.description}</p>` : ""}
  ${renderProducts(card.products)}
  ${renderLinks(card.links)}
  ${renderContact(card.contact)}
  <div class="hint">向上滑动 · · ·</div>
</section>`;
}
