import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { Card } from "../types";
import { escapeHtml } from "../utils/escape";

export function renderLogoWall(
  cards: Card[],
  opts: { print?: boolean } = {}
): HtmlEscapedString | Promise<HtmlEscapedString> {
  const filtered = cards
    .filter((c) => c.logo && c.logo.trim() !== "")
    .sort((a, b) => a.brand.localeCompare(b.brand));

  const suffix = opts.print ? "?print" : "";

  const cells = filtered
    .map((c) => {
      const craft = c.specialty?.trim();
      return `<a class="logo-cell" href="/card/${encodeURIComponent(c.id)}${suffix}">
        <div class="logo-frame"><img loading="lazy" src="${escapeHtml(c.logo)}" alt="${escapeHtml(c.brand)} mark" /></div>
        <div class="crafter-name">${escapeHtml(c.brand)}</div>
        ${craft ? `<div class="crafter-craft">${escapeHtml(craft)}</div>` : ""}
      </a>`;
    })
    .join("");

  const empty = `<div class="empty-banner">no crafters with a mark yet · 暂未上传 logo</div>`;

  return html`<main class="logo-wall">
    <div class="banner">
      <span class="banner-pin banner-pin-l" aria-hidden="true"></span>
      <span class="banner-pin banner-pin-r" aria-hidden="true"></span>
      <header class="banner-head">
        <h1 class="banner-title serif">From the Bushcraft China Community</h1>
        <div class="banner-sub">Bushcraft Show 2026 · 22 – 25 May 2026</div>
        <div class="banner-loc">Stanford Hall, Lutterworth · LE17 6DH</div>
      </header>
      <section class="logo-grid">
        ${raw(filtered.length ? cells : empty)}
      </section>
    </div>
  </main>`;
}
