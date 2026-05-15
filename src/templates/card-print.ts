import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { Card } from "../types";

const FONT_FACES = `
@font-face { font-family: 'Lora'; font-style: normal; font-weight: 400; font-display: block; src: url('/fonts/lora-400.woff2') format('woff2'); }
@font-face { font-family: 'Lora'; font-style: normal; font-weight: 700; font-display: block; src: url('/fonts/lora-700.woff2') format('woff2'); }
@font-face { font-family: 'Caveat'; font-style: normal; font-weight: 500; font-display: block; src: url('/fonts/caveat-500.woff2') format('woff2'); }
@font-face { font-family: 'Caveat'; font-style: normal; font-weight: 700; font-display: block; src: url('/fonts/caveat-700.woff2') format('woff2'); }
@font-face { font-family: 'Raleway'; font-style: normal; font-weight: 400; font-display: block; src: url('/fonts/raleway-400.woff2') format('woff2'); }
@font-face { font-family: 'Raleway'; font-style: normal; font-weight: 500; font-display: block; src: url('/fonts/raleway-500.woff2') format('woff2'); }
@font-face { font-family: 'Raleway'; font-style: normal; font-weight: 600; font-display: block; src: url('/fonts/raleway-600.woff2') format('woff2'); }
`;

const PRINT_CSS = `
:root {
  --font-serif-display: "Lora", "Iowan Old Style", Georgia, "Songti SC", serif;
  --font-sans: "Raleway", -apple-system, "Helvetica Neue", "PingFang SC", sans-serif;
  --font-script: "Caveat", "Snell Roundhand", cursive;
  --bg: #F5F2EB;
  --fg: #2C2C2C;
  --muted: #6B6358;
  --accent: #4A5D3A;
  --line: #D4C9B8;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  background-color: var(--bg);
  color: var(--fg);
  font-family: var(--font-serif-display);
  -webkit-font-smoothing: antialiased;
}
body {
  width: 1240px;
  height: 1748px;
  background-image: url('/b.png');
  background-repeat: repeat;
  background-size: 512px 512px;
  position: relative;
  overflow: hidden;
}
.print-top {
  position: absolute;
  top: 120px;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.print-logo {
  width: 320px;
  height: 320px;
  object-fit: contain;
  margin-bottom: 56px;
}
.print-brand {
  font-family: var(--font-serif-display);
  font-size: 72px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: 0.5px;
  color: var(--fg);
  margin-bottom: 28px;
  max-width: 1000px;
  word-wrap: break-word;
}
.print-craft {
  font-family: var(--font-sans);
  font-size: 22px;
  font-weight: 500;
  letter-spacing: 6px;
  text-transform: uppercase;
  color: var(--muted);
}
.print-owner {
  position: absolute;
  bottom: 360px;
  right: 96px;
  font-family: var(--font-script);
  font-size: 64px;
  font-weight: 500;
  color: var(--muted);
  line-height: 1;
  text-align: right;
}
.print-qr {
  position: absolute;
  bottom: 96px;
  right: 96px;
  width: 220px;
  height: 220px;
  background: #ffffff;
  padding: 14px;
  border-radius: 6px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}
.print-qr img,
.print-qr canvas { display: block; width: 192px; height: 192px; }
.print-foot {
  position: absolute;
  bottom: 96px;
  left: 96px;
  font-family: var(--font-sans);
  font-size: 22px;
  font-weight: 500;
  letter-spacing: 2px;
  color: var(--muted);
  line-height: 1.4;
  max-width: 480px;
}
.download-btn {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9999;
  padding: 10px 20px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 999px;
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0,0,0,0.18);
}
.download-btn:hover { opacity: 0.92; }
@media print {
  .download-btn { display: none !important; }
}
`;

function slugifyBrand(brand: string, fallbackId: string): string {
  const slug = brand
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `card-${fallbackId}`;
}

export function renderCardPrint(
  card: Card,
  origin: string
): HtmlEscapedString | Promise<HtmlEscapedString> {
  const logo = card.logo && card.logo.trim() !== "" ? card.logo : "/images/_default/logo.png";
  const qrUrl = `${origin}/card/${encodeURIComponent(card.id)}`;
  const slug = slugifyBrand(card.brand, card.id);
  const filename = `${slug}.png`;

  const title = `${card.brand} · Bushcraft China`;
  const boot = `
(function(){
  function makeQr(){
    var el = document.getElementById('card-qr');
    if (!el || typeof QRCode === 'undefined') return;
    el.innerHTML = '';
    new QRCode(el, {
      text: ${JSON.stringify(qrUrl)},
      width: 192,
      height: 192,
      colorDark: '#2C2C2C',
      colorLight: '#FFFFFF',
      correctLevel: QRCode.CorrectLevel.M
    });
  }
  function waitImages(){
    var imgs = Array.prototype.slice.call(document.querySelectorAll('img'));
    return Promise.all(imgs.map(function(i){
      if (i.complete && i.naturalWidth > 0) return Promise.resolve();
      return new Promise(function(res){
        i.addEventListener('load', res, { once: true });
        i.addEventListener('error', res, { once: true });
      });
    }));
  }
  async function capture(){
    if (typeof html2canvas === 'undefined') return null;
    var canvas = await html2canvas(document.body, {
      scale: 1,
      backgroundColor: null,
      useCORS: true,
      logging: false,
      width: 1240,
      height: 1748,
      windowWidth: 1240,
      windowHeight: 1748
    });
    return canvas;
  }
  function download(canvas){
    if (!canvas) return;
    canvas.toBlob(function(blob){
      if (!blob) return;
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = ${JSON.stringify(filename)};
      document.body.appendChild(a);
      a.click();
      setTimeout(function(){
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);
    }, 'image/png');
  }
  async function run(){
    makeQr();
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch(e){}
    await waitImages();
    await new Promise(function(r){ setTimeout(r, 400); });
    var canvas = await capture();
    download(canvas);
  }
  var btn = document.getElementById('downloadBtn');
  if (btn) btn.addEventListener('click', async function(){
    btn.disabled = true;
    var canvas = await capture();
    download(canvas);
    btn.disabled = false;
  });
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run);
})();
`;

  return html`<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=1240, initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<title>${title}</title>
<style>${raw(FONT_FACES)}${raw(PRINT_CSS)}</style>
</head>
<body>
<div class="print-top">
  <img class="print-logo" src="${logo}" alt="${card.brand} mark" crossorigin="anonymous" />
  <div class="print-brand">${card.brand}</div>
  ${card.specialty ? html`<div class="print-craft">${card.specialty}</div>` : ""}
</div>
${card.owner ? html`<div class="print-owner">${card.owner}</div>` : ""}
<div class="print-qr" id="card-qr"></div>
<div class="print-foot">Bushcraft China Community</div>
<button id="downloadBtn" class="download-btn" type="button">Download PNG</button>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script>${raw(boot)}</script>
</body>
</html>`;
}
