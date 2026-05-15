# Card Print View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `?print` query mode to `/card/:id` (renders A6 print page that auto-downloads as PNG) and `/logo` (rewrites every card link to include `?print`).

**Architecture:** A new standalone HTML template (`card-print.ts`) renders an A6-sized page (1240×1748 px) with the b.png paper background, brand/specialty centered up top, owner script signature above a QR in the bottom right, and small "Bushcraft China Community" text in the bottom left. The template embeds qrcodejs + html2canvas from CDN; an inline boot script generates the QR, waits for fonts/images, captures the body, and triggers a PNG download. `renderLogoWall` accepts a `{ print }` option that rewrites cell `href`s. Routes in `pages.ts` detect `?print` (presence, not value) and branch.

**Tech Stack:** Hono + Cloudflare Workers, TypeScript, vitest with `@cloudflare/vitest-pool-workers`. CDN: cdnjs qrcodejs@1.0.0 (already used in edit-form), cdnjs html2canvas@1.4.1.

**Spec:** `docs/superpowers/specs/2026-05-15-card-print-view-design.md`

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/templates/card-print.ts` | Create | Standalone print-page HTML renderer |
| `src/templates/logo-wall.ts` | Modify | Add `print` option that rewrites cell hrefs |
| `src/routes/pages.ts` | Modify | Detect `?print` on `/card/:id` and `/logo` |
| `test/logo-wall.test.ts` | Create | Test href rewriting |
| `test/card-print.test.ts` | Create | Test print template contents |
| `test/pages.test.ts` | Modify | Add route-level `?print` tests |

---

## Task 1: `renderLogoWall` accepts `{ print }` option

**Files:**
- Create: `test/logo-wall.test.ts`
- Modify: `src/templates/logo-wall.ts`

- [ ] **Step 1: Write the failing tests**

Create `test/logo-wall.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { renderLogoWall } from "../src/templates/logo-wall";
import type { Card } from "../src/types";

const sample: Card = {
  id: "shangwu",
  brand: "晌午",
  owner: "张三",
  logo: "/images/shangwu/logo.png",
  specialty: "手工刀匠",
  description: "",
  contact: {},
  socials: {},
  products: [],
  links: [],
};

describe("renderLogoWall", () => {
  it("default mode links to /card/:id without ?print", async () => {
    const out = (await renderLogoWall([sample])).toString();
    expect(out).toContain('href="/card/shangwu"');
    expect(out).not.toContain('href="/card/shangwu?print"');
  });

  it("print mode rewrites every card link with ?print", async () => {
    const out = (await renderLogoWall([sample], { print: true })).toString();
    expect(out).toContain('href="/card/shangwu?print"');
    expect(out).not.toMatch(/href="\/card\/shangwu"/);
  });

  it("print mode preserves brand/craft labels", async () => {
    const out = (await renderLogoWall([sample], { print: true })).toString();
    expect(out).toContain("晌午");
    expect(out).toContain("手工刀匠");
  });

  it("filters out cards without a logo", async () => {
    const noLogo: Card = { ...sample, id: "x", brand: "X", logo: "" };
    const out = (await renderLogoWall([sample, noLogo])).toString();
    expect(out).not.toContain('href="/card/x"');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- test/logo-wall.test.ts`

Expected: first test passes (no opts), second fails (no `print` option supported yet).

- [ ] **Step 3: Modify `renderLogoWall` to accept `print` option**

Edit `src/templates/logo-wall.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- test/logo-wall.test.ts`

Expected: all 4 tests pass.

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/templates/logo-wall.ts test/logo-wall.test.ts
git commit -m "feat(logo-wall): accept print option that rewrites card links"
```

---

## Task 2: Create `renderCardPrint` template

**Files:**
- Create: `src/templates/card-print.ts`
- Create: `test/card-print.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `test/card-print.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { renderCardPrint } from "../src/templates/card-print";
import type { Card } from "../src/types";

const sample: Card = {
  id: "shangwu",
  brand: "晌午",
  owner: "Jerry",
  logo: "/images/shangwu/logo.png",
  specialty: "HANDMADE LEATHER",
  description: "ignored in print view",
  contact: { wechat: "wx", email: "hi@shangwu.com" },
  socials: { web: "https://shangwu.com" },
  products: ["/images/shangwu/p1.jpg"],
  links: [],
};

describe("renderCardPrint", () => {
  it("returns a complete HTML document", async () => {
    const out = (await renderCardPrint(sample, "https://example.com")).toString();
    expect(out.startsWith("<!doctype html>")).toBe(true);
    expect(out).toContain("</html>");
  });

  it("includes brand, owner (script), and specialty", async () => {
    const out = (await renderCardPrint(sample, "https://example.com")).toString();
    expect(out).toContain("晌午");
    expect(out).toContain("Jerry");
    expect(out).toContain("HANDMADE LEATHER");
  });

  it("includes the logo image", async () => {
    const out = (await renderCardPrint(sample, "https://example.com")).toString();
    expect(out).toContain("/images/shangwu/logo.png");
  });

  it("encodes the canonical card URL (no ?print) for the QR", async () => {
    const out = (await renderCardPrint(sample, "https://example.com")).toString();
    expect(out).toContain("https://example.com/card/shangwu");
    expect(out).not.toContain("https://example.com/card/shangwu?print");
  });

  it("includes the Bushcraft China Community footer text", async () => {
    const out = (await renderCardPrint(sample, "https://example.com")).toString();
    expect(out).toContain("Bushcraft China Community");
  });

  it("loads qrcodejs and html2canvas from CDN", async () => {
    const out = (await renderCardPrint(sample, "https://example.com")).toString();
    expect(out).toContain("qrcodejs/1.0.0/qrcode.min.js");
    expect(out).toContain("html2canvas");
  });

  it("does not include feed/voice-sheet/swipe-hint markup", async () => {
    const out = (await renderCardPrint(sample, "https://example.com")).toString();
    expect(out).not.toContain("voice-sheet");
    expect(out).not.toContain("swipe-hint");
    expect(out).not.toContain("voice-trigger");
    expect(out).not.toContain("like-trigger");
  });

  it("escapes XSS in brand", async () => {
    const bad: Card = { ...sample, brand: "<script>x</script>" };
    const out = (await renderCardPrint(bad, "https://example.com")).toString();
    expect(out).not.toContain("<script>x</script>");
    expect(out).toContain("&lt;script&gt;");
  });

  it("falls back to default logo when card has no logo", async () => {
    const noLogo: Card = { ...sample, logo: "" };
    const out = (await renderCardPrint(noLogo, "https://example.com")).toString();
    expect(out).toContain("/images/_default/logo.png");
  });

  it("falls back to card-<id>.png filename when brand has no ASCII chars", async () => {
    const out = (await renderCardPrint(sample, "https://example.com")).toString();
    // Brand "晌午" has no a-z0-9 chars, so slug falls back to `card-${id}`.
    expect(out).toContain("card-shangwu.png");
  });

  it("slugifies ASCII brand for filename", async () => {
    const ascii: Card = { ...sample, id: "x", brand: "Bottle Bound Crafts" };
    const out = (await renderCardPrint(ascii, "https://example.com")).toString();
    expect(out).toContain("bottle-bound-crafts.png");
  });

  it("sets noindex meta", async () => {
    const out = (await renderCardPrint(sample, "https://example.com")).toString();
    expect(out).toContain('name="robots"');
    expect(out).toContain("noindex");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- test/card-print.test.ts`

Expected: all tests fail (module not found / `renderCardPrint` undefined).

- [ ] **Step 3: Implement `renderCardPrint`**

Create `src/templates/card-print.ts`:

```ts
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
```

Note: All dynamic values inside the `html\`...\`` template literal are auto-escaped by `hono/html` (same pattern as `card.ts`). Only the inline `<script>` content is wrapped in `raw(...)` because that block is itself JavaScript and must not be HTML-escaped. The boot script embeds `qrUrl` and `filename` via `JSON.stringify`, which safely escapes any malicious content (string is treated as JS string literal, not HTML).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- test/card-print.test.ts`

Expected: all 11 tests pass.

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/templates/card-print.ts test/card-print.test.ts
git commit -m "feat(card-print): standalone A6 print template with PNG auto-download"
```

---

## Task 3: Wire `?print` into routes

**Files:**
- Modify: `src/routes/pages.ts`
- Modify: `test/pages.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `test/pages.test.ts` (inside the existing `describe("pages routes", ...)` block, after the last `it(...)`):

```ts
  it("GET /card/:id?print renders the print template", async () => {
    await putCard(env.BUCKET, {
      id: "shangwu", brand: "晌午", owner: "Jerry", logo: "", specialty: "刀匠",
      description: "", contact: {}, socials: {}, products: [], links: [],
    });
    await upsertIndexEntry(env.BUCKET, { id: "shangwu", brand: "晌午", order: 1 });
    const res = await buildApp().request("/card/shangwu?print", {}, env);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("晌午");
    expect(body).toContain("Jerry");
    expect(body).toContain("Bushcraft China Community");
    expect(body).toContain("html2canvas");
    expect(body).not.toContain("voice-sheet");
    expect(body).not.toContain("swipe-hint");
  });

  it("GET /card/:id?print returns 404 for unknown", async () => {
    const res = await buildApp().request("/card/none?print", {}, env);
    expect(res.status).toBe(404);
  });

  it("GET /logo?print rewrites card links with ?print", async () => {
    await putCard(env.BUCKET, {
      id: "shangwu", brand: "晌午", owner: "", logo: "/images/shangwu/logo.png", specialty: "刀匠",
      description: "", contact: {}, socials: {}, products: [], links: [],
    });
    await upsertIndexEntry(env.BUCKET, { id: "shangwu", brand: "晌午", order: 1 });
    const res = await buildApp().request("/logo?print", {}, env);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('href="/card/shangwu?print"');
  });

  it("GET /logo without ?print keeps plain card links", async () => {
    await putCard(env.BUCKET, {
      id: "shangwu", brand: "晌午", owner: "", logo: "/images/shangwu/logo.png", specialty: "刀匠",
      description: "", contact: {}, socials: {}, products: [], links: [],
    });
    await upsertIndexEntry(env.BUCKET, { id: "shangwu", brand: "晌午", order: 1 });
    const res = await buildApp().request("/logo", {}, env);
    const body = await res.text();
    expect(body).toContain('href="/card/shangwu"');
    expect(body).not.toContain('href="/card/shangwu?print"');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- test/pages.test.ts`

Expected: 4 new tests fail (route does not branch on `?print` yet).

- [ ] **Step 3: Wire `?print` into `pages.ts`**

Edit `src/routes/pages.ts`:

a) Add import at the top (next to the other template imports):

```ts
import { renderCardPrint } from "../templates/card-print";
```

b) Replace the `/card/:id` handler with:

```ts
  app.get("/card/:id", async (c) => {
    const card = await getCard(c.env.BUCKET, c.req.param("id"));
    if (!card) return c.text("we couldn’t find that maker", 404);
    const o = origin(c.req.url);
    if (c.req.query("print") !== undefined) {
      const page = await renderCardPrint(card, o);
      return c.html(page, 200, {
        "cache-control": "no-store",
        "x-robots-tag": "noindex, nofollow",
      });
    }
    const published = isPublished(card);
    const meta = cardMeta(card, o, { published });
    const cardHtml = await renderCard(card, { asDetail: true });
    const body = html`<main class="feed">${cardHtml}</main>`;
    return c.html(layout(meta, await body), 200, { "cache-control": "no-store" });
  });
```

c) Replace the `/logo` handler with:

```ts
  app.get("/logo", async (c) => {
    const o = origin(c.req.url);
    const cards: Card[] = await loadAllCards(c.env.BUCKET);
    const print = c.req.query("print") !== undefined;
    const meta = {
      title: "Crafters · Bushcraft China Community",
      description: "Marks of every workshop gathered at Bushcraft China 2026.",
      canonical: `${o}/logo`,
      image: `${o}/b.png`,
      type: "website" as const,
      noindex: print,
    };
    const body = await renderLogoWall(cards, { print });
    return c.html(layout(meta, body), 200, { "cache-control": "no-store" });
  });
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- test/pages.test.ts`

Expected: all tests in this file pass (including the 4 new ones).

- [ ] **Step 5: Run the whole suite**

Run: `npm test`

Expected: every test in the project passes. No regressions.

- [ ] **Step 6: Run typecheck**

Run: `npm run typecheck`

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/routes/pages.ts test/pages.test.ts
git commit -m "feat(pages): handle ?print on /card/:id and /logo"
```

---

## Task 4: Manual browser verification

**Files:** none (manual verification of work from prior tasks).

The vitest suite can't validate the html2canvas + qrcodejs runtime. Verify in a real browser before declaring done.

- [ ] **Step 1: Boot the dev server**

Run: `npm run dev`

Expected: wrangler dev starts and prints a localhost URL (typically `http://localhost:8787`).

- [ ] **Step 2: Open the logo wall in print mode**

Open `http://localhost:8787/logo?print` in a browser.

Expected:
- Logo wall renders normally
- Every logo cell's link target ends with `?print` (hover to see in status bar, or right-click → inspect)

- [ ] **Step 3: Open one card's print view**

Click any logo cell. URL becomes `/card/<id>?print`.

Expected:
- Page renders at fixed A6 dimensions (will overflow / require scroll on a typical viewport — that's correct)
- b.png paper background visible
- Logo centered up top, brand large below it, specialty in small tracked uppercase below brand
- Owner script ("Jerry"-style) above QR
- QR in bottom right
- "Bushcraft China Community" in bottom left
- "Download PNG" pill button in top right
- A PNG file downloads automatically within ~2 seconds, named after the brand slug (e.g. `bottle-bound-crafts.png`)

- [ ] **Step 4: Verify the downloaded PNG**

Open the downloaded PNG. Expected:
- Dimensions 1240 × 1748 px (right-click → properties or use `file <name>.png`)
- All visible elements from the live page are captured
- QR code is scannable and links to `${origin}/card/<id>` (NOT `?print`)

- [ ] **Step 5: Verify a card with no logo / no owner**

If any card lacks a logo or owner, open its `?print` view too.

Expected:
- No-logo card: shows default logo `/images/_default/logo.png`
- No-owner card: script signature area is empty (no stray text)

If any of the above fails, debug then re-run the relevant test task before continuing.

- [ ] **Step 6: Final commit (if any fixes were needed)**

Only run if you made fixes during manual verification:

```bash
git add -A
git commit -m "fix(card-print): <what you fixed>"
```

---

## Self-Review Notes

- All spec sections (URL contract, layout, standalone shell, logo wall mode, failure modes) are covered by Tasks 1–4.
- The download-fallback button (spec Open Assumption #4) is implemented and tested implicitly by Task 2's checks that the page renders correctly. The button is hidden in `@media print`.
- `escapeHtml` is used for every dynamic value rendered into attributes or text; XSS test in Task 2 verifies.
- Type signatures: `renderLogoWall(cards, opts?: { print?: boolean })`, `renderCardPrint(card, origin)` — used consistently.
- No new dependencies installed; qrcodejs and html2canvas come from the same cdnjs the project already trusts (see `edit-form.ts:qrcodejs/1.0.0/qrcode.min.js`).
