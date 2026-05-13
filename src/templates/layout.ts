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
  background: var(--bg);
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
  padding: 6vh 24px 4vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  animation: fadeUp 350ms ease-out;
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.card .logo {
  width: 96px; height: 96px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(74, 93, 58, 0.12);
  object-fit: cover;
  margin-bottom: 28px;
}
.card .brand {
  font-size: 32px;
  font-weight: 600;
  letter-spacing: 4px;
  margin-bottom: 6px;
}
.card .specialty {
  font-size: 14px;
  color: var(--muted);
  letter-spacing: 2px;
  margin-bottom: 24px;
}
.card .owner {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 20px;
}
.card .desc {
  font-style: italic;
  font-size: 15px;
  line-height: 1.8;
  color: var(--fg);
  max-width: 340px;
  margin-bottom: 28px;
  white-space: pre-wrap;
}
.card .desc::before { content: "\u201C"; color: var(--line); margin-right: 4px; }
.card .desc::after { content: "\u201D"; color: var(--line); margin-left: 4px; }
.card .products {
  display: flex; gap: 10px;
  overflow-x: auto;
  width: 100%;
  padding: 4px 4px 12px;
  scrollbar-width: none;
  margin-bottom: 20px;
}
.card .products::-webkit-scrollbar { display: none; }
.card .products img {
  width: 120px; height: 120px;
  object-fit: cover;
  border-radius: 10px;
  flex: 0 0 auto;
  background: #fff;
}
.card .links {
  display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;
  margin-bottom: 16px;
}
.card .links a {
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 13px;
  color: var(--accent);
}
.card .contact {
  font-size: 12px; color: var(--muted);
  letter-spacing: 1px;
  margin-bottom: 12px;
}
.card .hint {
  margin-top: auto;
  font-size: 11px;
  color: var(--line);
  letter-spacing: 4px;
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
</body>
</html>`;
}
