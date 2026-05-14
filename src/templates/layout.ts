import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { PageMeta } from "../utils/seo";
import { escapeHtml } from "../utils/escape";

const GLOBAL_CSS = `
:root {
  --bg: #F5F2EB;
  --fg: #2C2C2C;
  --muted: #6B6358;
  --accent: #4A5D3A;
  --line: #D4C9B8;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  background-color: var(--bg);
  background-image: url('/b.png');
  background-repeat: repeat;
  background-size: 512px 512px;
  color: var(--fg);
  font-family: "Merriweather", "Iowan Old Style", "Palatino", "PingFang SC", "Songti SC", "Hiragino Sans GB", serif;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.01em;
}
body { min-height: 100vh; }
a { color: var(--accent); text-decoration: none; }
button, input, textarea, select {
  font: inherit; color: inherit;
}
.serif { font-family: inherit; }
.sans { font-family: "Montserrat", -apple-system, "Helvetica Neue", Arial, "PingFang SC", sans-serif; }
.feed {
  height: 100vh;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
}
.card {
  scroll-snap-align: start;
  height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.card-flip {
  position: relative;
  aspect-ratio: 9 / 16;
  width: min(100%, calc(100vh * 9 / 16));
  max-height: 100vh;
  perspective: 1200px;
  transition: transform 0.6s ease;
  transform-style: preserve-3d;
}
.card-flip.flipped { transform: rotateY(180deg); }
.card-front, .card-back {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow-y: auto;
  background-color: #FDFAF2;
}
.card-front { background-color: #ffffff; cursor: pointer; }
.card-front a, .card-front button { cursor: pointer; }
.card-back {
  transform: rotateY(180deg);
  padding: 0;
}
.card-header {
  padding: 20px 32px 12px;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
}
.site-logo {
  width: 256px; height: 256px;
  object-fit: contain;
}
.card-body {
  flex: 1;
  padding: 0 32px;
  display: flex;
  flex-direction: column;
}
.card .brand {
  font-family: "Playfair Display", "Cormorant Garamond", "Georgia", "Songti SC", serif;
  font-size: 44px;
  font-weight: 600;
  letter-spacing: 0.5px;
  line-height: 1.1;
  margin-bottom: 10px;
}
.flip-trigger, .flip-btn-back {
  position: absolute;
  top: 24px;
  right: 24px;
  border: none;
  background: rgba(245, 242, 235, 0.92);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  color: var(--fg);
  height: 32px;
  border-radius: 999px;
  font-family: "Montserrat", -apple-system, "Helvetica Neue", Arial, sans-serif;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  z-index: 10;
}
.flip-trigger:hover, .flip-btn-back:hover { background: #FDFAF2; }
.card .specialty {
  font-family: "Montserrat", -apple-system, "Helvetica Neue", Arial, sans-serif;
  font-size: 12px;
  color: var(--muted);
  letter-spacing: 3px;
  text-transform: uppercase;
  font-weight: 400;
  margin-bottom: 12px;
}
.card .sep {
  border: none;
  border-top: 1px solid var(--line);
  width: 32px;
  margin: 0 0 12px;
}
.card .owner {
  font-family: "Playfair Display", "Georgia", "Songti SC", serif;
  font-size: 16px;
  font-style: italic;
  color: var(--muted);
  letter-spacing: 0.2px;
}
.card blockquote.desc,
.card .desc {
  font-family: "Playfair Display", "Georgia", "Songti SC", serif !important;
  font-size: 17px;
  line-height: 1.7;
  color: var(--fg);
  white-space: pre-wrap;
  margin: auto 0 0;
  padding: 44px 4px 36px;
  border: none;
  position: relative;
  quotes: "\u201C" "\u201D";
}
.card .desc::before {
  content: open-quote;
  position: absolute;
  top: 0;
  left: -6px;
  font-family: "Playfair Display", "Georgia", serif;
  font-size: 70px;
  line-height: 1;
  color: var(--line);
}
.card .desc::after {
  content: close-quote;
  position: absolute;
  right: -2px;
  bottom: -12px;
  font-family: "Playfair Display", "Georgia", serif;
  font-size: 70px;
  line-height: 1;
  color: var(--line);
}
.card-footer {
  padding: 22px 32px 28px;
  border-top: 1px solid var(--line);
  flex-shrink: 0;
  text-align: center;
}
.bottom-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px 18px;
  margin-bottom: 22px;
}
.bar-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: "Montserrat", -apple-system, "Helvetica Neue", Arial, sans-serif;
  font-size: 12px;
  font-weight: 400;
  color: var(--fg);
  text-decoration: none;
  letter-spacing: 0.4px;
}
.bar-item svg { flex-shrink: 0; }
.footer-text {
  font-family: "Montserrat", -apple-system, "Helvetica Neue", Arial, sans-serif;
  font-size: 11px;
  font-weight: 400;
  color: var(--muted);
  letter-spacing: 0.8px;
}
.back-grid {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 0;
}
.back-img {
  flex: 1;
  min-height: 0;
  width: 100%;
  object-fit: cover;
  border-radius: 0;
  cursor: pointer;
  transition: opacity 150ms;
  background: var(--line);
}
.back-img:hover { opacity: 0.92; }
.back-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--muted);
}
.lightbox {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.88);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999;
  cursor: zoom-out;
  animation: lbIn 200ms ease;
}
@keyframes lbIn { from { opacity: 0; } to { opacity: 1; } }
.lightbox img {
  max-width: 92vw; max-height: 90vh;
  object-fit: contain;
  border-radius: 6px;
}
.swipe-hint {
  position: fixed;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  pointer-events: none;
  z-index: 200;
  opacity: 1;
  transition: opacity 0.8s ease;
  color: var(--muted);
}
.swipe-hint.gone { opacity: 0; }
.swipe-hint-label {
  font-size: 10px;
  letter-spacing: 2px;
  opacity: 0.7;
}
.swipe-hint-arrows {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}
.swipe-hint-arrow {
  width: 10px;
  height: 10px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(45deg);
  opacity: 0.5;
}
.swipe-hint-arrow:nth-child(1) { animation: swipeDown 1.4s ease-in-out infinite 0s; }
.swipe-hint-arrow:nth-child(2) { animation: swipeDown 1.4s ease-in-out infinite 0.2s; }
@keyframes swipeDown {
  0%, 100% { transform: rotate(45deg) translate(0,0); opacity: 0.3; }
  50% { transform: rotate(45deg) translate(3px,3px); opacity: 0.8; }
}
.empty {
  height: 100vh; display: flex; align-items: center; justify-content: center;
  color: var(--muted);
}
.voice-trigger {
  position: absolute;
  bottom: 24px;
  right: 24px;
  width: 48px; height: 48px;
  border-radius: 50%;
  border: none;
  background: var(--accent);
  color: #fff;
  box-shadow: 0 4px 14px rgba(74, 93, 58, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 12;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  transition: transform 150ms, box-shadow 150ms;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.voice-trigger:hover { transform: scale(1.05); box-shadow: 0 6px 18px rgba(74, 93, 58, 0.45); }
.voice-trigger.recording {
  background: #C7423B;
  color: #fff;
  animation: voicePulse 1s ease-in-out infinite;
}
@keyframes voicePulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(199,66,59,0.45); }
  50% { transform: scale(1.06); box-shadow: 0 0 0 12px rgba(199,66,59,0); }
}
.voice-count {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: #fff;
  color: var(--accent);
  font-family: "Montserrat", sans-serif;
  font-size: 10px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
  letter-spacing: 0;
  border: 1.5px solid var(--accent);
}
.voice-status {
  position: absolute;
  bottom: 24px;
  right: 80px;
  height: 48px;
  padding: 0 18px;
  border-radius: 999px;
  background: #C7423B;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: "Montserrat", sans-serif;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.5px;
  white-space: nowrap;
  z-index: 11;
  pointer-events: none;
  box-shadow: 0 4px 14px rgba(199, 66, 59, 0.35);
  animation: voiceStatusIn 200ms ease;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.voice-status[hidden] { display: none; }
.voice-status-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  background: #fff;
  animation: voiceDotPulse 1s ease-in-out infinite;
}
@keyframes voiceDotPulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
@keyframes voiceStatusIn {
  from { opacity: 0; transform: translateX(8px); }
  to { opacity: 1; transform: translateX(0); }
}
.voice-tooltip {
  position: absolute;
  bottom: 80px;
  right: 24px;
  padding: 7px 14px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.82);
  color: #fff;
  font-family: "Montserrat", sans-serif;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
  white-space: nowrap;
  z-index: 11;
  pointer-events: none;
  animation: voiceStatusIn 200ms ease;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.voice-tooltip[hidden] { display: none; }
.voice-tooltip::after {
  content: "";
  position: absolute;
  bottom: -4px;
  right: 22px;
  width: 8px; height: 8px;
  background: rgba(0, 0, 0, 0.82);
  transform: rotate(45deg);
}
.voice-sheet {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  z-index: 9100;
  background: rgba(253, 250, 242, 0.98);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-top: 1px solid var(--line);
  padding: 22px 22px 28px;
  padding-right: 60px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-family: "Montserrat", sans-serif;
  transform: translateY(100%);
  transition: transform 250ms ease;
}
.voice-sheet[hidden] { display: none; }
.voice-sheet.open { transform: translateY(0); }
.voice-sheet-header {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--muted);
}
.voice-sheet audio {
  width: 100%;
}
.voice-sheet-actions {
  display: flex;
  gap: 10px;
}
.voice-sheet-actions button {
  flex: 1;
  border-radius: 8px;
  padding: 12px;
  font-family: "Montserrat", sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  cursor: pointer;
  border: 1px solid var(--line);
  background: #fff;
  color: var(--fg);
}
.voice-sheet-actions button.primary {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.voice-sheet-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.voice-sheet-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 36px; height: 36px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.06);
  border: none;
  color: var(--fg);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  line-height: 1;
  padding: 0;
  transition: background 150ms;
}
.voice-sheet-close:hover { background: rgba(0, 0, 0, 0.12); }
.voice-toast {
  position: fixed;
  left: 50%;
  bottom: 32px;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.85);
  color: #fff;
  padding: 10px 18px;
  border-radius: 999px;
  font-family: "Montserrat", sans-serif;
  font-size: 12px;
  letter-spacing: 0.5px;
  z-index: 9200;
  opacity: 0;
  pointer-events: none;
  transition: opacity 250ms;
}
.voice-toast.show { opacity: 1; }
.voice-list { display: flex; flex-direction: column; gap: 14px; }
.voice-item {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 12px 14px;
  background: #faf8f3;
}
.voice-item-meta {
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.3px;
  margin-bottom: 8px;
  word-break: break-word;
}
.voice-item-row {
  display: flex;
  gap: 10px;
  align-items: center;
}
.voice-item-row audio { flex: 1; min-width: 0; }
.voice-item-empty {
  font-size: 12px;
  color: var(--muted);
  font-style: italic;
}
body:has(.edit-wrap) {
  background-image: none;
  background-color: #ffffff;
  font-family: "Montserrat", -apple-system, "Helvetica Neue", Arial, "PingFang SC", sans-serif;
}
body:has(.edit-wrap) .swipe-hint { display: none; }
.edit-wrap {
  max-width: 560px;
  margin: 0 auto;
  padding: 32px 24px 64px;
}
.edit-wrap h1 {
  font-family: "Playfair Display", "Georgia", serif;
  font-size: 28px;
  font-weight: 600;
  letter-spacing: 0.3px;
  margin-bottom: 8px;
}
.edit-wrap h2 {
  font-family: "Montserrat", sans-serif;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--muted);
  margin: 32px 0 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--line);
}
.edit-wrap label {
  display: block;
  font-family: "Montserrat", sans-serif;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.3px;
  color: var(--muted);
  margin: 18px 0 8px;
}
.edit-wrap input[type=text],
.edit-wrap input[type=email],
.edit-wrap input[type=url],
.edit-wrap textarea {
  width: 100%;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 15px;
  font-family: inherit;
  color: var(--fg);
  transition: border-color 150ms;
}
.edit-wrap input[type=text]:focus,
.edit-wrap input[type=email]:focus,
.edit-wrap input[type=url]:focus,
.edit-wrap textarea:focus {
  outline: none;
  border-color: var(--accent);
}
.edit-wrap textarea {
  min-height: 100px;
  resize: vertical;
  line-height: 1.55;
}
.edit-wrap input[type=file] {
  display: block;
  width: 100%;
  padding: 0;
  font-size: 13px;
  color: var(--muted);
  font-family: inherit;
}
.edit-wrap input[type=file]::file-selector-button {
  background: #fff;
  color: var(--fg);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  letter-spacing: 0.3px;
  cursor: pointer;
  margin-right: 12px;
  transition: background 150ms, border-color 150ms;
}
.edit-wrap input[type=file]::file-selector-button:hover {
  background: #faf8f3;
  border-color: var(--muted);
}
.edit-wrap input[type=checkbox] {
  width: 16px; height: 16px;
  accent-color: var(--accent);
  margin-right: 6px;
  vertical-align: middle;
}
.edit-wrap .row {
  display: flex; gap: 10px; align-items: center;
  margin-bottom: 8px;
}
.edit-wrap .row input { flex: 1; }
.edit-wrap button.primary {
  background: var(--accent);
  color: #fff;
  border: none;
  box-sizing: border-box;
  height: 46px;
  padding: 0 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-family: "Montserrat", sans-serif;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-top: 32px;
  cursor: pointer;
  transition: opacity 150ms;
}
.edit-wrap button.primary:hover { opacity: 0.9; }
.edit-wrap button.ghost,
.edit-wrap a.ghost {
  display: inline-block;
  background: transparent;
  color: var(--fg);
  border: 1px solid var(--line);
  padding: 10px 16px;
  border-radius: 8px;
  font-family: "Montserrat", sans-serif;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.5px;
  cursor: pointer;
  text-decoration: none;
  transition: background 150ms, border-color 150ms;
}
.edit-wrap button.ghost:hover,
.edit-wrap a.ghost:hover {
  background: #faf8f3;
  border-color: var(--muted);
}
.edit-wrap a.ghost-lg,
.edit-wrap button.ghost-lg {
  box-sizing: border-box;
  height: 46px;
  padding: 0 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-top: 32px;
}
.edit-wrap .card-share {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-top: 20px;
  padding: 16px;
  background: #faf8f3;
  border: 1px solid var(--line);
  border-radius: 10px;
}
.edit-wrap .card-share #cardQr {
  background: #fff;
  padding: 6px;
  border-radius: 6px;
  flex-shrink: 0;
  display: block;
  width: 132px;
  height: 132px;
}
.edit-wrap .card-share #cardQr img,
.edit-wrap .card-share #cardQr canvas {
  display: block;
  width: 120px;
  height: 120px;
}
.edit-wrap .card-share-body {
  flex: 1;
  min-width: 0;
}
.edit-wrap .card-share-label {
  font-family: "Montserrat", sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 6px;
}
.edit-wrap .card-share-url {
  display: block;
  font-family: "Montserrat", sans-serif;
  font-size: 12px;
  color: var(--accent);
  word-break: break-all;
  margin-bottom: 10px;
  line-height: 1.4;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}
.edit-wrap .card-share-url:hover { opacity: 0.85; }
.edit-wrap .preview-img {
  width: 140px; height: 140px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: #faf8f3;
}
.edit-wrap .product-slot {
  background: #faf8f3;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 12px;
}
.edit-wrap .product-slot > div:first-child {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 10px;
}
.admin-list { list-style: none; }
.admin-list li {
  border-bottom: 1px solid var(--line);
  padding: 16px 0;
  display: flex; justify-content: space-between; align-items: center;
  gap: 12px;
}
.admin-list li strong {
  font-family: "Playfair Display", serif;
  font-size: 17px;
  font-weight: 600;
}
.admin-list .meta {
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.3px;
  margin-top: 4px;
  word-break: break-all;
}
.voice-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 12px;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: #fff;
  color: var(--muted);
  font-family: "Montserrat", sans-serif;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.3px;
  white-space: nowrap;
}
.voice-pill-on {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
  font-weight: 600;
}
`;

function renderMeta(meta: PageMeta): string {
  const out: string[] = [];
  if (meta.description) {
    out.push(`<meta name="description" content="${escapeHtml(meta.description)}" />`);
  }
  if (meta.canonical) {
    out.push(`<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`);
  }
  if (meta.noindex) {
    out.push(`<meta name="robots" content="noindex,nofollow" />`);
  }
  out.push(`<meta property="og:site_name" content="Bushcraft China Community" />`);
  out.push(`<meta property="og:type" content="${escapeHtml(meta.type ?? "website")}" />`);
  out.push(`<meta property="og:title" content="${escapeHtml(meta.title)}" />`);
  if (meta.description) {
    out.push(`<meta property="og:description" content="${escapeHtml(meta.description)}" />`);
  }
  if (meta.canonical) {
    out.push(`<meta property="og:url" content="${escapeHtml(meta.canonical)}" />`);
  }
  if (meta.image) {
    out.push(`<meta property="og:image" content="${escapeHtml(meta.image)}" />`);
    out.push(`<meta name="twitter:card" content="summary_large_image" />`);
    out.push(`<meta name="twitter:image" content="${escapeHtml(meta.image)}" />`);
  } else {
    out.push(`<meta name="twitter:card" content="summary" />`);
  }
  out.push(`<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`);
  if (meta.description) {
    out.push(`<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`);
  }
  if (meta.jsonLd) {
    const json = JSON.stringify(meta.jsonLd).replace(/</g, "\\u003c");
    out.push(`<script type="application/ld+json">${json}</script>`);
  }
  return out.join("\n");
}

export function layout(
  meta: PageMeta | string,
  body: HtmlEscapedString | string
): HtmlEscapedString | Promise<HtmlEscapedString> {
  const m: PageMeta = typeof meta === "string" ? { title: meta } : meta;
  return html`<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${m.title}</title>
${raw(renderMeta(m))}
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Montserrat:wght@400;500;600&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet" />
<style>${raw(GLOBAL_CSS)}</style>
</head>
<body>
${body}
<div class="swipe-hint" id="swipeHint">
  <div class="swipe-hint-arrows">
    <div class="swipe-hint-arrow"></div>
    <div class="swipe-hint-arrow"></div>
  </div>
  <span class="swipe-hint-label">Scroll</span>
</div>
<div class="voice-sheet" id="voiceSheet" hidden>
  <button type="button" class="voice-sheet-close" id="voiceCancel" aria-label="close">×</button>
  <div class="voice-sheet-header"><span id="voiceSheetTitle">Your voice note · 0:00</span></div>
  <audio id="voiceSheetAudio" controls preload="metadata"></audio>
  <div class="voice-sheet-actions">
    <button type="button" id="voiceRedo">↻ Re-record</button>
    <button type="button" class="primary" id="voiceSend">✓ Send</button>
  </div>
</div>
<div class="voice-toast" id="voiceToast"></div>
<script>
function openLightbox(src){var d=document.createElement('div');d.className='lightbox';d.onclick=function(){d.remove()};var i=document.createElement('img');i.src=src;d.appendChild(i);document.body.appendChild(d)}
function flipFront(ev,el){if(ev.target.closest('a,button'))return;el.closest('.card-flip').classList.toggle('flipped')}
document.addEventListener('keydown',function(e){if(e.key==='Escape'){var lb=document.querySelector('.lightbox');if(lb)lb.remove()}});
(function(){
  var feed=document.querySelector('.feed');
  var h=document.getElementById('swipeHint');
  if(!feed||!h)return;
  function dismiss(){h.classList.add('gone');setTimeout(function(){h.remove()},800);}
  feed.addEventListener('scroll',dismiss,{once:true});
  setTimeout(dismiss,4000);
})();
(function(){
  var MIN_MS=5000, MAX_MS=120000, HOLD_MS=250;
  var triggers=document.querySelectorAll('.voice-trigger');
  if(!triggers.length) return;
  var supported=typeof MediaRecorder!=='undefined' && !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;
  if(!supported){triggers.forEach(function(b){b.style.display='none'});return;}
  function inlineFor(btn){
    var parent=btn.parentElement;
    if(!parent) return {tip:null,status:null,time:null};
    return {
      tip: parent.querySelector('.voice-tooltip'),
      status: parent.querySelector('.voice-status'),
      time: parent.querySelector('.voice-status-time'),
    };
  }
  var sheet=document.getElementById('voiceSheet');
  var sheetAudio=document.getElementById('voiceSheetAudio');
  var sheetTitle=document.getElementById('voiceSheetTitle');
  var btnRedo=document.getElementById('voiceRedo');
  var btnSend=document.getElementById('voiceSend');
  var btnCancel=document.getElementById('voiceCancel');
  var toast=document.getElementById('voiceToast');
  var state={cardId:null,btn:null,inline:null,stream:null,rec:null,chunks:[],startTs:0,durationMs:0,blob:null,mime:'',holdTimer:null,maxTimer:null,tickTimer:null,armed:false};
  function showToast(msg){toast.textContent=msg;toast.classList.add('show');setTimeout(function(){toast.classList.remove('show')},2200);}
  function fmt(ms){var s=Math.floor(ms/1000);var m=Math.floor(s/60);return m+':'+String(s%60).padStart(2,'0');}
  function pickMime(){var c=['audio/webm;codecs=opus','audio/mp4;codecs=mp4a.40.2','audio/ogg;codecs=opus','audio/webm','audio/mp4'];for(var i=0;i<c.length;i++){if(MediaRecorder.isTypeSupported(c[i]))return c[i];}return '';}
  function stopStream(){if(state.stream){state.stream.getTracks().forEach(function(t){t.stop()});state.stream=null;}}
  function reset(full){
    if(state.btn){state.btn.classList.remove('recording');}
    if(state.inline){
      if(state.inline.tip)state.inline.tip.hidden=true;
      if(state.inline.status)state.inline.status.hidden=true;
    }
    if(state.holdTimer){clearTimeout(state.holdTimer);state.holdTimer=null;}
    if(state.maxTimer){clearTimeout(state.maxTimer);state.maxTimer=null;}
    if(state.tickTimer){clearInterval(state.tickTimer);state.tickTimer=null;}
    state.armed=false;
    if(full){state.cardId=null;state.btn=null;state.inline=null;state.rec=null;state.chunks=[];state.blob=null;state.mime='';state.durationMs=0;stopStream();}
  }
  function openSheet(){
    sheet.hidden=false;
    requestAnimationFrame(function(){sheet.classList.add('open');});
    var url=URL.createObjectURL(state.blob);
    sheetAudio.src=url;
    sheetTitle.textContent='Your voice note · '+fmt(state.durationMs);
    btnSend.disabled=false;
  }
  function closeSheet(){
    sheet.classList.remove('open');
    setTimeout(function(){sheet.hidden=true;if(sheetAudio.src){URL.revokeObjectURL(sheetAudio.src);sheetAudio.removeAttribute('src');sheetAudio.load();}},250);
  }
  async function startRecording(){
    try{
      state.stream=await navigator.mediaDevices.getUserMedia({audio:true});
    }catch(err){
      showToast('Microphone access denied');
      reset(true);
      return;
    }
    var mime=pickMime();
    state.mime=mime;
    try{
      state.rec=mime?new MediaRecorder(state.stream,{mimeType:mime,audioBitsPerSecond:32000}):new MediaRecorder(state.stream);
    }catch(err){
      showToast('Recording not supported on this device');
      reset(true);
      return;
    }
    state.chunks=[];
    state.rec.ondataavailable=function(e){if(e.data&&e.data.size>0)state.chunks.push(e.data);};
    state.rec.onerror=function(){
      showToast('Recording failed, please retry');
      reset(true);
    };
    state.rec.onstop=function(){
      var actualMime=state.mime||(state.chunks[0]?state.chunks[0].type:'audio/webm');
      state.blob=new Blob(state.chunks,{type:actualMime});
      stopStream();
      if(state.inline){
        if(state.inline.tip)state.inline.tip.hidden=true;
        if(state.inline.status)state.inline.status.hidden=true;
      }
      if(state.btn)state.btn.classList.remove('recording');
      if(state.tickTimer){clearInterval(state.tickTimer);state.tickTimer=null;}
      if(state.durationMs<MIN_MS){
        showToast('At least 5 seconds, please');
        reset(true);
        return;
      }
      openSheet();
    };
    state.startTs=Date.now();
    state.rec.start();
    if(state.btn)state.btn.classList.add('recording');
    state.inline=inlineFor(state.btn);
    if(state.inline.tip)state.inline.tip.hidden=false;
    if(state.inline.status)state.inline.status.hidden=false;
    if(state.inline.time)state.inline.time.textContent='0:00';
    state.tickTimer=setInterval(function(){
      state.durationMs=Date.now()-state.startTs;
      if(state.inline&&state.inline.time)state.inline.time.textContent=fmt(state.durationMs);
    },200);
    state.maxTimer=setTimeout(function(){stopRecording();},MAX_MS);
  }
  function stopRecording(){
    if(!state.rec||state.rec.state==='inactive')return;
    state.durationMs=Date.now()-state.startTs;
    try{state.rec.stop();}catch(e){}
    if(state.maxTimer){clearTimeout(state.maxTimer);state.maxTimer=null;}
  }
  function isBusy(){
    if(state.armed)return true;
    if(state.rec&&state.rec.state==='recording')return true;
    if(sheet&&!sheet.hidden)return true;
    return false;
  }
  function onPointerDown(e){
    var btn=e.currentTarget;
    if(isBusy())return;
    state.btn=btn;
    state.cardId=btn.getAttribute('data-card');
    state.armed=true;
    e.preventDefault();
    state.holdTimer=setTimeout(function(){
      state.holdTimer=null;
      startRecording();
    },HOLD_MS);
  }
  function onPointerUp(){
    if(state.holdTimer){clearTimeout(state.holdTimer);state.holdTimer=null;state.armed=false;state.btn=null;return;}
    if(state.rec&&state.rec.state==='recording'){stopRecording();}
  }
  triggers.forEach(function(b){
    b.addEventListener('pointerdown',onPointerDown);
    b.addEventListener('pointerup',onPointerUp);
    b.addEventListener('pointercancel',onPointerUp);
    b.addEventListener('pointerleave',function(){if(state.rec&&state.rec.state==='recording')stopRecording();else onPointerUp();});
    b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();});
  });
  btnRedo.addEventListener('click',function(){
    closeSheet();
    state.blob=null;state.chunks=[];state.durationMs=0;
    setTimeout(startRecording,300);
  });
  btnCancel.addEventListener('click',function(){
    closeSheet();
    reset(true);
  });
  btnSend.addEventListener('click',async function(){
    if(!state.blob||!state.cardId)return;
    btnSend.disabled=true;
    btnSend.textContent='sending…';
    var ext=(state.mime.indexOf('mp4')>=0)?'mp4':(state.mime.indexOf('ogg')>=0?'ogg':'webm');
    var fd=new FormData();
    fd.append('audio',state.blob,'voice.'+ext);
    fd.append('duration_ms',String(Math.min(state.durationMs,MAX_MS)));
    try{
      var res=await fetch('/api/voice/'+encodeURIComponent(state.cardId),{method:'POST',body:fd});
      if(res.status===429){showToast("You've reached today's voice limit (50)");btnSend.disabled=false;btnSend.textContent='✓ Send';return;}
      if(res.status===413){showToast('Recording too long');btnSend.disabled=false;btnSend.textContent='✓ Send';return;}
      if(!res.ok){var t=await res.text();showToast(t||'Submit failed, try again');btnSend.disabled=false;btnSend.textContent='✓ Send';return;}
      var data=await res.json();
      var cardId=state.cardId;
      closeSheet();
      reset(true);
      btnSend.textContent='✓ Send';
      showToast('Thanks for your voice');
      document.querySelectorAll('.voice-trigger[data-card="'+cardId+'"]').forEach(function(b){
        var c=b.querySelector('.voice-count');
        if(c){c.textContent=String(data.voice_count);}
        else{var s=document.createElement('span');s.className='voice-count';s.textContent=String(data.voice_count);b.appendChild(s);}
      });
    }catch(err){
      showToast('Network error, please retry');
      btnSend.disabled=false;
      btnSend.textContent='✓ Send';
    }
  });
})();
</script>
</body>
</html>`;
}
