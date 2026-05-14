import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { CardIndexEntry, Keys } from "../types";
import { escapeHtml } from "../utils/escape";

export function renderAdminList(
  index: CardIndexEntry[],
  keys: Keys,
  adminKey: string,
  voiceCounts: Record<string, number> = {}
): HtmlEscapedString | Promise<HtmlEscapedString> {
  const sorted = [...index].sort((a, b) => a.order - b.order);
  const rows = sorted
    .map((e) => {
      const cardKey = keys.cards[e.id] ?? "";
      const shareUrl = `/edit/${encodeURIComponent(e.id)}?key=${encodeURIComponent(cardKey)}`;
      const vc = voiceCounts[e.id] ?? 0;
      const voicePill = vc > 0
        ? `<span class="voice-pill voice-pill-on">🎤 ${vc}</span>`
        : `<span class="voice-pill">🎤 0</span>`;
      return `<li>
        <div>
          <strong>${escapeHtml(e.brand)}</strong>
          <div class="meta">id · ${escapeHtml(e.id)} &nbsp;·&nbsp; key · ${escapeHtml(cardKey)}</div>
        </div>
        <div class="row" style="gap:6px;flex-wrap:wrap;justify-content:flex-end">
          ${voicePill}
          <button type="button" class="ghost" onclick="copyShareLink(this,'${escapeHtml(shareUrl)}')">Copy Link（复制给工匠）</button>
          <a class="ghost" href="/edit/${encodeURIComponent(e.id)}?key=${encodeURIComponent(adminKey)}">Admin Edit（管理员编辑）</a>
        </div>
      </li>`;
    })
    .join("");

  return html`<div class="edit-wrap">
  <h1>Admin Desk（管理后台）</h1>
  <p style="font-size:12px;color:var(--muted);margin-bottom:8px">${index.length} maker${index.length === 1 ? "" : "s"} gathered so far（已收录的工匠数）</p>

  <h2>welcome a new maker（新增工匠）</h2>
  <form method="post" action="/edit/_new?key=${encodeURIComponent(adminKey)}">
    <label>id（仅小写字母、数字或连字符）</label>
    <input type="text" name="new_id" pattern="[a-z0-9-]+" required />
    <label>name of the workshop（工坊名称）</label>
    <input type="text" name="new_brand" required />
    <button class="primary" type="submit">add them in（添加）</button>
  </form>

  <h2>the gathering（工匠列表）</h2>
  <ul class="admin-list">${raw(rows)}</ul>

  <h2>tread carefully（危险操作）</h2>
  <form method="post" action="/edit/_admin?key=${encodeURIComponent(adminKey)}" onsubmit="return confirm('are you certain?（确定吗？）')">
    <label>see a maker out（按 id 删除工匠）</label>
    <div class="row">
      <input type="text" name="del_id" />
      <button class="ghost" type="submit" name="action" value="delete">remove（删除）</button>
    </div>
    <label>reissue a maker’s key（按 id 重置 key）</label>
    <div class="row">
      <input type="text" name="reset_id" />
      <button class="ghost" type="submit" name="action" value="reset-key">reissue（重置）</button>
    </div>
  </form>
</div>
<script>
function copyShareLink(btn, path){
  var url = location.origin + path;
  var done = function(){var t = btn.textContent; btn.textContent = 'copied! 已复制'; btn.disabled = true; setTimeout(function(){btn.textContent = t; btn.disabled = false}, 1500)};
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(done, function(){ window.prompt('copy this link 手动复制', url) });
  } else {
    window.prompt('copy this link 手动复制', url);
  }
}
</script>`;
}
