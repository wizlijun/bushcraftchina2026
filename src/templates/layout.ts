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
  background-image: url('/images/_default/bg-weave.jpg');
  background-repeat: repeat;
  background-size: 300px 300px;
  color: var(--fg);
  font-family: "Iowan Old Style", "Palatino", "Hoefler Text", "PingFang SC", "Songti SC", "Hiragino Sans GB", serif;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.01em;
}
body { min-height: 100vh; }
a { color: var(--accent); text-decoration: none; }
button, input, textarea, select {
  font: inherit; color: inherit;
}
.serif { font-family: "Georgia", "Songti SC", serif; }
.feed {
  height: 100vh;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
}
.card {
  scroll-snap-align: start;
  height: 100vh;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  perspective: 1200px;
}
.card-flip {
  position: relative;
  width: 100%;
  height: 100%;
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
}
.card-back {
  transform: rotateY(180deg);
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.card-flip.no-flip .card-front {
  position: relative;
}
.card-header {
  padding: 20px 24px 16px;
}
.site-logo {
  width: 64px; height: 64px;
  object-fit: contain;
}
.card-body {
  flex: 1;
  padding: 0 28px;
  text-align: left;
}
.brand-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}
.card .brand {
  font-size: 36px;
  font-weight: 700;
  letter-spacing: 2px;
  line-height: 1.2;
}
.flip-trigger {
  text-align: right;
  cursor: pointer;
  flex-shrink: 0;
  padding-top: 6px;
}
.flip-hint {
  display: block;
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.5px;
}
.flip-label {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: var(--fg);
  letter-spacing: 1px;
}
.card .specialty {
  font-size: 15px;
  color: var(--muted);
  letter-spacing: 2px;
  margin-bottom: 12px;
}
.card .sep {
  border: none;
  border-top: 1px solid var(--line);
  width: 32px;
  margin: 0 0 14px;
}
.card .owner {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 24px;
  letter-spacing: 0.5px;
}
.card .desc {
  font-size: 15px;
  line-height: 2;
  color: var(--fg);
  white-space: pre-wrap;
  margin: 0;
  padding: 0;
  border: none;
  quotes: "\u201C" "\u201D";
}
.card .desc::before {
  content: open-quote;
  display: block;
  font-size: 36px;
  color: var(--line);
  line-height: 1;
  margin-bottom: 8px;
}
.card .desc::after {
  content: close-quote;
  display: block;
  font-size: 36px;
  color: var(--line);
  line-height: 1;
  margin-top: 8px;
}
.card-footer {
  padding: 16px 28px 20px;
  text-align: center;
}
.footer-dot {
  font-size: 10px;
  color: var(--muted);
  margin-bottom: 14px;
}
.bottom-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px 14px;
  margin-bottom: 16px;
}
.bar-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--fg);
  text-decoration: none;
  letter-spacing: 0.2px;
}
.bar-item svg { flex-shrink: 0; }
.footer-text {
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 1px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}
.back-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  width: 100%;
  max-width: 360px;
  padding: 12px;
}
.back-img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 10px;
  cursor: pointer;
  transition: transform 150ms;
  background: #fff;
}
.back-img:hover { transform: scale(1.03); }
.flip-btn-back {
  margin-top: 16px;
  border: 1px solid var(--line);
  background: var(--bg);
  color: var(--muted);
  padding: 8px 18px;
  border-radius: 999px;
  font-size: 13px;
  cursor: pointer;
  letter-spacing: 1px;
}
.flip-btn-back:hover { background: #fff; }
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
.empty {
  height: 100vh; display: flex; align-items: center; justify-content: center;
  color: var(--muted);
}
.edit-wrap {
  max-width: 480px;
  margin: 0 auto;
  padding: 24px;
}
.edit-wrap h1 { font-size: 20px; margin-bottom: 18px; }
.edit-wrap label {
  display: block;
  font-size: 13px;
  color: var(--muted);
  margin: 14px 0 6px;
}
.edit-wrap input[type=text],
.edit-wrap input[type=url],
.edit-wrap textarea {
  width: 100%;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
}
.edit-wrap textarea { min-height: 100px; resize: vertical; }
.edit-wrap .row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.edit-wrap .row input { flex: 1; }
.edit-wrap button.primary {
  background: var(--accent);
  color: #fff;
  border: none;
  padding: 12px 18px;
  border-radius: 8px;
  font-size: 15px;
  margin-top: 22px;
  cursor: pointer;
}
.edit-wrap button.ghost {
  background: transparent;
  border: 1px solid var(--line);
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
.edit-wrap .preview-img {
  width: 80px; height: 80px; object-fit: cover; border-radius: 8px;
}
.edit-wrap .image-tile {
  display: inline-block; position: relative; margin: 4px;
}
.admin-list { list-style: none; }
.admin-list li {
  border-bottom: 1px solid var(--line);
  padding: 12px 0;
  display: flex; justify-content: space-between; align-items: center;
}
.admin-list .meta { font-size: 12px; color: var(--muted); }
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
<style>${raw(GLOBAL_CSS)}</style>
</head>
<body>
${body}
<script>
function openLightbox(src){var d=document.createElement('div');d.className='lightbox';d.onclick=function(){d.remove()};var i=document.createElement('img');i.src=src;d.appendChild(i);document.body.appendChild(d)}
document.addEventListener('keydown',function(e){if(e.key==='Escape'){var lb=document.querySelector('.lightbox');if(lb)lb.remove()}})
</script>
</body>
</html>`;
}
