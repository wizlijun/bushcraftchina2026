import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { Card } from "../types";
import { escapeHtml } from "../utils/escape";

type HtmlOut = HtmlEscapedString | Promise<HtmlEscapedString> | string;

const ICON_PHONE = `<svg width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="currentColor"/><path d="M9 6.5c-.4 0-.8.2-1 .5L7 8.5c-.3.4-.4.9-.2 1.3 1 2.2 2.5 4.2 4.4 5.7 1.5 1.2 3.2 2 5 2.5.4.1.9 0 1.2-.3l1.2-1.2c.3-.3.4-.7.2-1.1l-1.2-2.2c-.2-.3-.5-.5-.9-.5l-1.5.2c-.2 0-.4 0-.5-.1-1-.7-1.9-1.6-2.5-2.6-.1-.2-.1-.3-.1-.5l.3-1.5c.1-.4-.1-.7-.4-.9L9.5 6.6c-.1-.1-.3-.1-.5-.1z" fill="white"/></svg>`;

const ICON_WEB = `<svg width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="currentColor"/><circle cx="12" cy="12" r="6" fill="none" stroke="white" stroke-width="1.1"/><path d="M6 12h12" stroke="white" stroke-width="1.1"/><path d="M12 6c-1.2 1.3-2 3.5-2 6s.8 4.7 2 6c1.2-1.3 2-3.5 2-6s-.8-4.7-2-6" stroke="white" stroke-width="1.1" fill="none"/></svg>`;

const ICON_INSTAGRAM = `<svg width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="currentColor"/><rect x="7" y="7" width="10" height="10" rx="2.5" fill="none" stroke="white" stroke-width="1.1"/><circle cx="12" cy="12" r="2.5" fill="none" stroke="white" stroke-width="1.1"/><circle cx="14.8" cy="9.2" r=".7" fill="white"/></svg>`;

const ICON_XIAOHONGSHU = `<svg width="42" height="18" viewBox="0 0 42 18"><rect width="42" height="18" rx="9" fill="currentColor"/><text x="21" y="13" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="9.5" font-weight="500" fill="white" letter-spacing="0.5">小红书</text></svg>`;

const ICON_WECHAT = `<svg width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="currentColor"/><path d="M9.8 7.5C7.4 7.5 5.5 9 5.5 11c0 1 .6 2 1.5 2.6l-.3 1.2 1.4-.7c.5.1 1 .2 1.5.2h.4" fill="none" stroke="white" stroke-width="1"/><path d="M14.2 10.5c-2.2 0-4 1.4-4 3.1s1.8 3.1 4 3.1c.4 0 .9-.1 1.3-.2l1.1.6-.2-1c.8-.6 1.2-1.4 1.2-2.4 0-1.8-1.8-3.2-4-3.2z" fill="none" stroke="white" stroke-width="1"/><circle cx="8.8" cy="10.2" r=".5" fill="white"/><circle cx="10.8" cy="10.2" r=".5" fill="white"/><circle cx="13.2" cy="13" r=".4" fill="white"/><circle cx="15.2" cy="13" r=".4" fill="white"/></svg>`;

const ICON_LOCATION = `<svg width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="currentColor"/><path d="M12 7c-2.2 0-4 1.8-4 4 0 3 4 7 4 7s4-4 4-7c0-2.2-1.8-4-4-4z" fill="none" stroke="white" stroke-width="1.1"/><circle cx="12" cy="11" r="1.5" fill="none" stroke="white" stroke-width="1.1"/></svg>`;

function renderProducts(products: string[]): string {
  if (!products.length) return "";
  return products
    .map((src) => `<img loading="lazy" src="${escapeHtml(src)}" alt="" class="back-img" onclick="openLightbox(this.src)" />`)
    .join("");
}

function renderBottomBar(card: Card): HtmlOut {
  const items: string[] = [];
  if (card.contact.phone) {
    items.push(`<span class="bar-item">${ICON_PHONE}<span>${escapeHtml(card.contact.phone)}</span></span>`);
  }
  if (card.socials?.web) {
    const display = card.socials.web.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
    items.push(`<a class="bar-item" href="${escapeHtml(card.socials.web)}" target="_blank" rel="noopener">${ICON_WEB}<span>${escapeHtml(display)}</span></a>`);
  }
  if (card.contact.wechat) {
    items.push(`<span class="bar-item">${ICON_WECHAT}<span>${escapeHtml(card.contact.wechat)}</span></span>`);
  }
  if (card.socials?.instagram) {
    const handle = card.socials.instagram.startsWith("@") ? card.socials.instagram : `@${card.socials.instagram}`;
    const url = `https://instagram.com/${handle.slice(1)}`;
    items.push(`<a class="bar-item" href="${escapeHtml(url)}" target="_blank" rel="noopener">${ICON_INSTAGRAM}<span>${escapeHtml(handle.slice(1))}</span></a>`);
  }
  if (card.socials?.xiaohongshu) {
    const handle = card.socials.xiaohongshu.startsWith("@") ? card.socials.xiaohongshu : `@${card.socials.xiaohongshu}`;
    const url = `https://www.xiaohongshu.com/user/profile/${handle.slice(1)}`;
    items.push(`<a class="bar-item" href="${escapeHtml(url)}" target="_blank" rel="noopener">${ICON_XIAOHONGSHU}</a>`);
  }
  if (card.address) {
    items.push(`<span class="bar-item">${ICON_LOCATION}<span>${escapeHtml(card.address)}</span></span>`);
  }
  if (!items.length) return "";
  return html`<div class="bottom-bar">${raw(items.join(""))}</div>`;
}

export function renderCard(card: Card): HtmlEscapedString | Promise<HtmlEscapedString> {
  const hasProducts = card.products.length > 0;
  const flipLabel = hasProducts
    ? `<div class="flip-trigger" onclick="this.closest('.card-flip').classList.toggle('flipped')"><span class="flip-hint">点击查看</span><span class="flip-label">查看作品 ▶</span></div>`
    : "";
  const backFlipBtn = `<button class="flip-btn-back" onclick="this.closest('.card-flip').classList.toggle('flipped')">◀ 返回</button>`;
  const backFace = hasProducts
    ? `<div class="card-back"><div class="back-grid">${renderProducts(card.products)}</div>${backFlipBtn}</div>`
    : "";

  return html`<section class="card" data-id="${card.id}">
  <div class="card-flip${hasProducts ? "" : " no-flip"}">
    <div class="card-front">
      <header class="card-header">
        <img class="site-logo" src="/images/_default/logo.png" alt="Bushcraft China" />
      </header>
      <div class="card-body">
        <div class="brand-row">
          <h2 class="brand serif">${card.brand}</h2>
          ${raw(flipLabel)}
        </div>
        <div class="specialty">${card.specialty}</div>
        <hr class="sep" />
        ${card.owner ? html`<div class="owner">by the hand of · ${card.owner}</div>` : ""}
        ${card.description ? html`<blockquote class="desc">${card.description}</blockquote>` : ""}
      </div>
      <footer class="card-footer">
        <div class="footer-dot">✦</div>
        ${renderBottomBar(card)}
        <div class="footer-text">Bushcraft 中国社区 × Bushcraft Show 2026</div>
      </footer>
    </div>
    ${raw(backFace)}
  </div>
</section>`;
}
