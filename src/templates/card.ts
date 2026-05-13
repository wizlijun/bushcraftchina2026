import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { Card } from "../types";
import { escapeHtml } from "../utils/escape";

type HtmlOut = HtmlEscapedString | Promise<HtmlEscapedString> | string;

const ICON_WEB = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;

const ICON_INSTAGRAM = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>`;

const ICON_XIAOHONGSHU = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="M12 3C9 3 4 4 4 6v12c0 2 5 3 8 3"/><path d="M12 3c3 0 8 1 8 3v12c0 2-5 3-8 3"/><path d="M7 7h3"/><path d="M14 7h3"/></svg>`;

function renderProducts(products: string[]): HtmlOut {
  if (!products.length) return "";
  const imgs = products
    .map((src) => `<img loading="lazy" src="${escapeHtml(src)}" alt="" />`)
    .join("");
  return html`<div class="products">${raw(imgs)}</div>`;
}

function renderSocials(socials: Card["socials"]): HtmlOut {
  const items: string[] = [];
  if (socials.web) {
    items.push(`<a class="social-link" href="${escapeHtml(socials.web)}" target="_blank" rel="noopener" title="website">${ICON_WEB}</a>`);
  }
  if (socials.instagram) {
    const handle = socials.instagram.startsWith("@") ? socials.instagram : `@${socials.instagram}`;
    const url = `https://instagram.com/${handle.slice(1)}`;
    items.push(`<a class="social-link" href="${escapeHtml(url)}" target="_blank" rel="noopener" title="${escapeHtml(handle)}">${ICON_INSTAGRAM}<span>${escapeHtml(handle)}</span></a>`);
  }
  if (socials.xiaohongshu) {
    const handle = socials.xiaohongshu.startsWith("@") ? socials.xiaohongshu : `@${socials.xiaohongshu}`;
    const url = `https://www.xiaohongshu.com/user/profile/${handle.slice(1)}`;
    items.push(`<a class="social-link" href="${escapeHtml(url)}" target="_blank" rel="noopener" title="${escapeHtml(handle)}">${ICON_XIAOHONGSHU}<span>${escapeHtml(handle)}</span></a>`);
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
  if (contact.wechat) parts.push(`WeChat · ${escapeHtml(contact.wechat)}`);
  if (contact.phone) parts.push(`telephone · ${escapeHtml(contact.phone)}`);
  if (!parts.length) return "";
  return html`<div class="contact">${raw(parts.join("　·　"))}</div>`;
}

export function renderCard(card: Card): HtmlEscapedString | Promise<HtmlEscapedString> {
  const logoSrc = card.logo || "/images/_default/logo.png";
  return html`<section class="card" data-id="${card.id}">
  <img class="logo" src="${logoSrc}" alt="${card.brand} mark" />
  <h2 class="brand serif">${card.brand}</h2>
  <div class="specialty">${card.specialty}</div>
  ${card.owner ? html`<div class="owner">by the hand of · ${card.owner}</div>` : ""}
  ${card.description ? html`<p class="desc">${card.description}</p>` : ""}
  ${renderProducts(card.products)}
  ${renderSocials(card.socials ?? {})}
  ${renderLinks(card.links)}
  ${renderContact(card.contact)}
  <div class="hint">wander onward · · ·</div>
</section>`;
}
