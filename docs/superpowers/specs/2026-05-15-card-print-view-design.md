# Card Print View — Design

## Purpose

Provide a printable, downloadable PNG version of each exhibitor card so the organizer can collect physical cards for the 2026 show. Each PNG is sized for A6 (105 × 148 mm) print stock, contains the essential identity of the brand, and includes a QR code linking back to the live card page.

Two surfaces are added:

- `GET /card/:id?print` — renders the single-card print view; PNG auto-downloads on load.
- `GET /logo?print` — same logo wall, but every `/card/:id` link is rewritten to `/card/:id?print`, so the organizer can walk through every card and collect every PNG in one pass.

## Non-goals

- No server-side PNG rendering. PNGs are generated in the browser via html2canvas. Cloudflare Workers is not a Puppeteer host.
- No bulk-zip "download all". The mechanism is one-PNG-per-tab via the rewritten logo-wall links.
- No edits to the existing feed/detail card view.
- No new persisted state (no cached PNGs in R2). Generation is fully on-the-fly client-side.

## URL contract

`?print` is detected by presence (`c.req.query("print") !== undefined`); any value (including empty) activates print mode. This matches the user's phrasing "带这个参数".

- `/card/:id` — unchanged (feed-style card)
- `/card/:id?print` — print page; renders the standalone print HTML described below; auto-downloads PNG
- `/logo` — unchanged
- `/logo?print` — logo wall, link rewriting active

`<meta name="robots" content="noindex,nofollow">` on both `?print` responses to keep them out of indexes.

## Print page layout (A6 portrait)

Page == canvas. Body is fixed-size 1240 × 1748 px (A6 @ ~300 DPI). html2canvas captures the body at `scale: 1`, so the output PNG is exactly 1240 × 1748.

```
┌──────────────────────────────┐  body: 1240 × 1748 px, b.png paper texture
│                              │
│         [LOGO 320×320]       │  centered horizontally, top padding ~120px
│                              │
│      Bottle Bound Crafts     │  serif display, ~64px, centered
│                              │
│      HANDMADE LEATHER        │  sans, ~16px, letter-spaced uppercase, muted, centered
│                              │
│                              │
│                              │
│         (lower half blank)   │
│                              │
│                              │
│                              │
│                     Jerry    │  Caveat script ~46px, right-aligned, above QR, muted
│                    ▣▣▣▣      │
│                    ▣▣▣▣      │  QR ~200×200 px, bottom-right
│                    ▣▣▣▣      │
│ Bushcraft China              │
│ Community                    │  sans 18-20px, muted, bottom-left, 1-2 lines
└──────────────────────────────┘
   ↑ ~64px from bottom-left   ↑ ~64px from bottom-right
```

Margins from page edges: ~64px standard inset. Logo block, brand, craft are stacked at the top with even spacing; the lower half is intentionally empty.

QR encodes the canonical card URL `${origin}/card/${id}` (no `?print`).

## Standalone HTML shell

The print view does NOT use `layout()`. `layout()` injects voice-sheet markup, swipe-hint UI, lightbox handlers, and full-page interactive scripts that have no role in a print snapshot. A new file `src/templates/card-print.ts` exports `renderCardPrint(card, origin)` which returns a complete `<!doctype html>...</html>` document.

What the shell does include:

- The `@font-face` declarations for Lora / Caveat / Raleway, copy-pasted (not imported — to keep the file fully self-contained for offline rendering inside html2canvas).
- A scoped stylesheet for the print page only. No `:root` collisions with layout.ts because this page is loaded standalone.
- Two CDN scripts: `qrcodejs` (already used in edit-form) and `html2canvas@1.4.1`.
- An inline boot script that: (1) generates the QR into `#card-qr`, (2) waits for fonts via `document.fonts.ready`, (3) waits ~800ms for layout settle and image load, (4) runs `html2canvas(document.body, { scale: 1, backgroundColor: null, useCORS: true })`, (5) triggers download of the resulting canvas as `${slug}.png`.

Filename slug: `brand.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")`. If empty after slugify (rare), fall back to `card-${id}.png`.

## Logo wall print mode

`renderLogoWall(cards, opts?: { print?: boolean })` — when `opts.print` is true, the `href` for each cell is `/card/${id}?print` instead of `/card/${id}`. No other visual change. The pin/banner UI stays.

Caller in `pages.ts`:

```ts
app.get("/logo", async (c) => {
  const print = c.req.query("print") !== undefined;
  // ...
  const body = await renderLogoWall(cards, { print });
});
```

## Failure modes

- **Browser without `MediaRecorder` / `<canvas>` toBlob**: html2canvas requires `<canvas>` toBlob/toDataURL, supported everywhere we ship to (modern Safari/Chrome/Firefox). No fallback; print view is desktop-organizer use, not end-user.
- **Cross-origin logo images**: Logos are served from same origin (`/images/:id/:filename`), so html2canvas does not hit CORS. `useCORS: true` is set defensively in case any logo is later swapped to an absolute URL.
- **QR generation failure**: If `QRCode` is undefined (CDN blocked), the bottom-right slot stays empty; PNG still downloads. No retry.
- **Auto-download blocked by browser**: Some browsers block programmatic downloads when triggered without a user gesture. We trigger the download via clicking a hidden `<a>` whose `href` is the data URL — this is widely allowed on initial load, but if blocked the file will not save. We accept this; the page also exposes a "Download PNG" button as a fallback the user can click manually if auto-download is suppressed.

  Note: the user chose option A (auto-download only), but a single hidden fallback button is cheap insurance and does not change behavior unless auto-download is blocked. The button is visible but discreet.

## Files touched

- `src/routes/pages.ts` — detect `?print` query in `/card/:id` and `/logo` handlers; branch to new renderer or pass option.
- `src/templates/logo-wall.ts` — accept `print` option, rewrite cell `href`.
- `src/templates/card-print.ts` — **new** — standalone print page renderer.

No DB/R2/migration changes. No new dependencies installed (everything via CDN, consistent with current project style).

## Testing

This project has `vitest` set up. A reasonable test surface:

- `card-print.ts` — render with a sample Card and assert presence of brand, owner, specialty, QR target URL, and that the document is a complete `<!doctype html>` page (i.e., not wrapped accidentally).
- `logo-wall.ts` — render with `{ print: true }` and assert every `href` includes `?print`.
- `pages.ts` route handling — integration-style if needed, but the route branching is trivial; covered by template tests is fine.

No browser-side test for the html2canvas/QR pipeline. That is verified manually by visiting `/card/:id?print` and confirming a PNG downloads with the correct content.

## Open assumptions (called out for review)

1. **QR target is `/card/:id` not `/card/:id?print`** — assumed; the QR is meant to send the holder to the live shareable page, not the print page. Confirm if wrong.
2. **Background is the b.png paper texture** — assumed; matches brand. Alternative is clean white for cleaner print. Confirm if wrong.
3. **Bottom-left text is the literal string `Bushcraft China Community`** on one or two lines, no decoration. Assumed.
4. **A fallback "Download PNG" button is visible** in case auto-download is blocked — slight deviation from "A only", justified by browser reality. Confirm OK.
