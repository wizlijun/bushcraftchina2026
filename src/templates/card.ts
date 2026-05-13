import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { Card } from "../types";
import { escapeHtml } from "../utils/escape";

type HtmlOut = HtmlEscapedString | Promise<HtmlEscapedString> | string;

const ICON_WEB = `<svg width="22" height="22" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="currentColor"/><circle cx="12" cy="12" r="6.5" fill="none" stroke="white" stroke-width="1.2"/><path d="M5.5 12h13" stroke="white" stroke-width="1.2"/><path d="M12 5.5c-1.3 1.4-2.2 3.8-2.2 6.5s.9 5.1 2.2 6.5c1.3-1.4 2.2-3.8 2.2-6.5s-.9-5.1-2.2-6.5" stroke="white" stroke-width="1.2" fill="none"/></svg>`;

const ICON_INSTAGRAM = `<svg width="22" height="22" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="currentColor"/><rect x="6.5" y="6.5" width="11" height="11" rx="3" fill="none" stroke="white" stroke-width="1.2"/><circle cx="12" cy="12" r="2.8" fill="none" stroke="white" stroke-width="1.2"/><circle cx="15.2" cy="8.8" r=".9" fill="white"/></svg>`;

const ICON_XIAOHONGSHU = `<svg width="50" height="22" viewBox="0 0 50 22"><rect width="50" height="22" rx="11" fill="currentColor"/><text x="25" y="15.5" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="11" font-weight="500" fill="white" letter-spacing="0.5">小红书</text></svg>`;

const ICON_WECHAT = `<svg width="22" height="22" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="currentColor"/><path d="M9.8 7C7.1 7 5 8.8 5 11c0 1.2.7 2.3 1.7 3l-.4 1.5 1.7-.9c.6.2 1.2.3 1.8.3.2 0 .4 0 .6 0" fill="none" stroke="white" stroke-width="1.1"/><path d="M14.5 10.5c-2.5 0-4.5 1.6-4.5 3.5s2 3.5 4.5 3.5c.5 0 1-.1 1.5-.2l1.3.7-.3-1.2c.9-.7 1.5-1.7 1.5-2.8 0-1.9-2-3.5-4.5-3.5z" fill="none" stroke="white" stroke-width="1.1"/><circle cx="8.5" cy="10" r=".6" fill="white"/><circle cx="11" cy="10" r=".6" fill="white"/><circle cx="13.3" cy="13.2" r=".5" fill="white"/><circle cx="15.5" cy="13.2" r=".5" fill="white"/></svg>`;

function renderProducts(products: string[]): HtmlOut {
  if (!products.length) return "";
  const imgs = products
    .map((src) => `<img loading="lazy" src="${escapeHtml(src)}" alt="" class="back-img" onclick="openLightbox(this.src)" />`)
    .join("");
  return imgs;
}

function renderSocials(socials: Card["socials"], contact: Card["contact"]): HtmlOut {
  const items: string[] = [];
  if (contact.wechat) {
    items.push(`<span class="social-link" title="WeChat">${ICON_WECHAT}<span>${escapeHtml(contact.wechat)}</span></span>`);
  }
  if (socials.web) {
    items.push(`<a class="social-link" href="${escapeHtml(socials.web)}" target="_blank" rel="noopener" title="website">${ICON_WEB}</a>`);
  }
  if (socials.instagram) {
    const handle = socials.instagram.startsWith("@") ? socials.instagram : `@${socials.instagram}`;
    const url = `https://instagram.com/${handle.slice(1)}`;
    items.push(`<a class="social-link" href="${escapeHtml(url)}" target="_blank" rel="noopener" title="${escapeHtml(handle)}">${ICON_INSTAGRAM}</a>`);
  }
  if (socials.xiaohongshu) {
    const handle = socials.xiaohongshu.startsWith("@") ? socials.xiaohongshu : `@${socials.xiaohongshu}`;
    const url = `https://www.xiaohongshu.com/user/profile/${handle.slice(1)}`;
    items.push(`<a class="social-link" href="${escapeHtml(url)}" target="_blank" rel="noopener" title="${escapeHtml(handle)}">${ICON_XIAOHONGSHU}</a>`);
  }
  if (!items.length) return "";
  return html`<div class="socials">${raw(items.join(""))}</div>`;
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
  if (contact.phone) parts.push(`telephone · ${escapeHtml(contact.phone)}`);
  if (!parts.length) return "";
  return html`<div class="contact">${raw(parts.join("　·　"))}</div>`;
}

export function renderCard(card: Card): HtmlEscapedString | Promise<HtmlEscapedString> {
  const logoSrc = card.logo || "/images/_default/logo.png";
  const hasProducts = card.products.length > 0;
  const flipBtn = hasProducts
    ? `<button class="flip-btn" onclick="this.closest('.card-flip').classList.toggle('flipped')" aria-label="flip card">&#x21bb;</button>`
    : "";
  const backFlipBtn = `<button class="flip-btn back-flip-btn" onclick="this.closest('.card-flip').classList.toggle('flipped')" aria-label="flip back">&#x21ba;</button>`;

  const backFace = hasProducts
    ? `<div class="card-back"><div class="back-grid">${renderProducts(card.products)}</div>${backFlipBtn}</div>`
    : "";

  return html`<section class="card" data-id="${card.id}">
  <div class="card-flip${hasProducts ? "" : " no-flip"}">
    <div class="card-front">
      ${raw(flipBtn)}
      <img class="logo" src="${logoSrc}" alt="${card.brand} mark" />
      <h2 class="brand serif">${card.brand}</h2>
      <div class="specialty">${card.specialty}</div>
      ${card.owner ? html`<div class="owner">by the hand of · ${card.owner}</div>` : ""}
      ${card.description ? html`<p class="desc">${card.description}</p>` : ""}
      ${renderSocials(card.socials ?? {}, card.contact)}
      ${renderLinks(card.links)}
      ${renderContact(card.contact)}
      <div class="hint">wander onward · · ·</div>
    </div>
    ${raw(backFace)}
  </div>
</section>`;
}
