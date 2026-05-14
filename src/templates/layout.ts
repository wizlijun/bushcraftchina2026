import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";

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
.card .desc {
  font-family: "Merriweather", "Georgia", "Songti SC", serif;
  font-size: 15px;
  line-height: 1.75;
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
  padding: 14px 28px;
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
`;

export function layout(
  title: string,
  body: HtmlEscapedString | string
): HtmlEscapedString | Promise<HtmlEscapedString> {
  return html`<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${title}</title>
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
</script>
</body>
</html>`;
}
