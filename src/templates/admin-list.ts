import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { CardIndexEntry, Keys } from "../types";
import { escapeHtml } from "../utils/escape";

export function renderAdminList(
  index: CardIndexEntry[],
  keys: Keys,
  adminKey: string
): HtmlEscapedString | Promise<HtmlEscapedString> {
  const sorted = [...index].sort((a, b) => a.order - b.order);
  const rows = sorted
    .map(
      (e) => `<li>
        <div>
          <strong>${escapeHtml(e.brand)}</strong>
          <div class="meta">id · ${escapeHtml(e.id)} &nbsp;·&nbsp; key · ${escapeHtml(keys.cards[e.id] ?? "")}</div>
        </div>
        <div>
          <a class="ghost" href="/edit/${encodeURIComponent(e.id)}?key=${encodeURIComponent(adminKey)}">tend to</a>
        </div>
      </li>`
    )
    .join("");

  return html`<div class="edit-wrap">
  <h1>the steward’s desk</h1>
  <p class="meta" style="font-size:12px;color:var(--muted)">${index.length} maker${index.length === 1 ? "" : "s"} gathered so far</p>

  <h2 style="font-size:15px;margin-top:24px">welcome a new maker</h2>
  <form method="post" action="/edit/_new?key=${encodeURIComponent(adminKey)}">
    <label>id (lowercase letters, numbers or hyphens)</label>
    <input type="text" name="new_id" pattern="[a-z0-9-]+" required />
    <label>name of the workshop</label>
    <input type="text" name="new_brand" required />
    <button class="primary" type="submit">add them in</button>
  </form>

  <h2 style="font-size:15px;margin-top:24px">the gathering</h2>
  <ul class="admin-list">${raw(rows)}</ul>

  <h2 style="font-size:15px;margin-top:24px">tread carefully</h2>
  <form method="post" action="/edit/_admin?key=${encodeURIComponent(adminKey)}" onsubmit="return confirm('are you certain?')">
    <label>see a maker out (by id)</label>
    <div class="row">
      <input type="text" name="del_id" />
      <button class="ghost" type="submit" name="action" value="delete">remove</button>
    </div>
    <label>reissue a maker’s key (by id)</label>
    <div class="row">
      <input type="text" name="reset_id" />
      <button class="ghost" type="submit" name="action" value="reset-key">reissue</button>
    </div>
  </form>
</div>`;
}
