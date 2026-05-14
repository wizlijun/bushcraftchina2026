import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { Card } from "../types";
import { escapeHtml } from "../utils/escape";

type HtmlOut = HtmlEscapedString | Promise<HtmlEscapedString> | string;

const ICON_EMAIL = `<svg width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="currentColor"/><rect x="6" y="8.5" width="12" height="8" rx="1.2" fill="none" stroke="white" stroke-width="1.1"/><path d="M6.5 9.2l5.5 4 5.5-4" fill="none" stroke="white" stroke-width="1.1" stroke-linejoin="round"/></svg>`;

const ICON_WEB = `<svg width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="currentColor"/><circle cx="12" cy="12" r="6" fill="none" stroke="white" stroke-width="1.1"/><path d="M6 12h12" stroke="white" stroke-width="1.1"/><path d="M12 6c-1.2 1.3-2 3.5-2 6s.8 4.7 2 6c1.2-1.3 2-3.5 2-6s-.8-4.7-2-6" stroke="white" stroke-width="1.1" fill="none"/></svg>`;

const ICON_INSTAGRAM = `<svg width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="currentColor"/><rect x="7" y="7" width="10" height="10" rx="2.5" fill="none" stroke="white" stroke-width="1.1"/><circle cx="12" cy="12" r="2.5" fill="none" stroke="white" stroke-width="1.1"/><circle cx="14.8" cy="9.2" r=".7" fill="white"/></svg>`;

const ICON_XIAOHONGSHU = `<svg width="56" height="18" viewBox="0 0 56 18"><rect width="56" height="18" rx="9" fill="currentColor"/><text x="28" y="13" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,&quot;Helvetica Neue&quot;,Roboto,sans-serif" font-size="10" font-weight="500" fill="white" letter-spacing="0.5">rednote</text></svg>`;

const ICON_WECHAT = `<svg width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="currentColor"/><path d="M9.5 6.5C6.5 6.5 4 8.6 4 11.2c0 1.4.8 2.7 2 3.6l-.5 1.7 2-1.1c.7.2 1.4.3 2 .3.2 0 .4 0 .6-.1-.1-.4-.2-.8-.2-1.2 0-2.5 2.3-4.5 5.3-4.5.2 0 .5 0 .7.1C15.6 7.6 12.8 6.5 9.5 6.5z" fill="white"/><circle cx="7.6" cy="10" r=".8" fill="currentColor"/><circle cx="11.4" cy="10" r=".8" fill="currentColor"/><path d="M20 14.5c0-2.2-2.1-4-4.7-4s-4.7 1.8-4.7 4c0 2.2 2.1 4 4.7 4 .5 0 1-.1 1.5-.2l1.7.9-.4-1.4c1-.7 1.9-1.9 1.9-3.3z" fill="white"/><circle cx="13.6" cy="14" r=".7" fill="currentColor"/><circle cx="17" cy="14" r=".7" fill="currentColor"/></svg>`;

const ICON_LOCATION = `<svg width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="currentColor"/><path d="M12 7c-2.2 0-4 1.8-4 4 0 3 4 7 4 7s4-4 4-7c0-2.2-1.8-4-4-4z" fill="none" stroke="white" stroke-width="1.1"/><circle cx="12" cy="11" r="1.5" fill="none" stroke="white" stroke-width="1.1"/></svg>`;

const ICON_MIC = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0"/><path d="M12 17v4"/><path d="M9 21h6"/></svg>`;

function renderVoiceButton(card: Card): string {
  const count = card.voice_count ?? 0;
  const badge = count > 0 ? `<span class="voice-count">${count}</span>` : "";
  return `<div class="voice-tooltip" hidden>RELEASE TO STOP</div>
<div class="voice-status" hidden><span class="voice-status-dot"></span><span class="voice-status-time">0:00</span></div>
<button class="voice-trigger" type="button" data-card="${escapeHtml(card.id)}" aria-label="press and hold to leave a voice note">${ICON_MIC}${badge}</button>`;
}

function renderProducts(products: string[], brand: string): string {
  const items = products.slice(0, 3);
  if (!items.length) {
    return `<div class="back-empty">No works yet</div>`;
  }
  return items
    .map((src, i) => `<img loading="lazy" src="${escapeHtml(src)}" alt="${escapeHtml(brand)} works ${i + 1}" class="back-img" onclick="openLightbox(this.src)" />`)
    .join("");
}

function renderBottomBar(card: Card): HtmlOut {
  const items: string[] = [];
  if (card.contact.email) {
    items.push(`<a class="bar-item" href="mailto:${escapeHtml(card.contact.email)}">${ICON_EMAIL}<span>${escapeHtml(card.contact.email)}</span></a>`);
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

export function renderCard(
  card: Card,
  opts: { asDetail?: boolean } = {}
): HtmlEscapedString | Promise<HtmlEscapedString> {
  const flipLabel = `<button class="flip-trigger" onclick="this.closest('.card-flip').classList.toggle('flipped')">Works</button>`;
  const backFlipBtn = `<button class="flip-btn-back" onclick="this.closest('.card-flip').classList.toggle('flipped')">Crafter</button>`;
  const voiceBtn = renderVoiceButton(card);
  const backFace = `<div class="card-back"><div class="back-grid">${renderProducts(card.products, card.brand)}</div>${backFlipBtn}</div>`;
  const heading = opts.asDetail
    ? html`<h1 class="brand serif">${card.brand}</h1>`
    : html`<h2 class="brand serif">${card.brand}</h2>`;
  const logoAlt = card.brand ? `${card.brand} logo` : "workshop logo";

  return html`<section class="card" data-id="${card.id}">
  <div class="card-flip">
    <div class="card-front" onclick="flipFront(event,this)">
      <header class="card-header">
        <img class="site-logo" src="${card.logo || "/images/_default/logo.png"}" alt="${logoAlt}" />
        ${raw(flipLabel)}
      </header>
      <div class="card-body">
        ${heading}
        <div class="specialty">${card.specialty}</div>
        <hr class="sep" />
        ${card.owner ? html`<div class="owner">by the hand of ${card.owner}</div>` : ""}
        ${card.description ? html`<div class="desc"><span class="desc-q desc-q-open">“</span><span class="desc-text">${card.description}</span><span class="desc-q desc-q-close">”</span></div>` : ""}
      </div>
      <footer class="card-footer">
        ${renderBottomBar(card)}
        <div class="footer-text">Bushcraft China Community x Bushcraft Show 2026</div>
      </footer>
    </div>
    ${raw(backFace)}
  </div>
  ${raw(voiceBtn)}
</section>`;
}
