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
          <div class="meta">id: ${escapeHtml(e.id)} · key: ${escapeHtml(keys.cards[e.id] ?? "")}</div>
        </div>
        <div>
          <a class="ghost" href="/edit/${encodeURIComponent(e.id)}?key=${encodeURIComponent(adminKey)}">编辑</a>
        </div>
      </li>`
    )
    .join("");

  return html`<div class="edit-wrap">
  <h1>管理员后台</h1>
  <p class="meta" style="font-size:12px;color:var(--muted)">共 ${index.length} 张卡片</p>

  <h2 style="font-size:15px;margin-top:24px">新建卡片</h2>
  <form method="post" action="/edit/_new?key=${encodeURIComponent(adminKey)}">
    <label>新卡片 id（英文小写、数字、连字符）</label>
    <input type="text" name="new_id" pattern="[a-z0-9-]+" required />
    <label>品牌名</label>
    <input type="text" name="new_brand" required />
    <button class="primary" type="submit">创建</button>
  </form>

  <h2 style="font-size:15px;margin-top:24px">卡片列表</h2>
  <ul class="admin-list">${raw(rows)}</ul>

  <h2 style="font-size:15px;margin-top:24px">危险操作</h2>
  <form method="post" action="/edit/_admin?key=${encodeURIComponent(adminKey)}" onsubmit="return confirm('确定？')">
    <label>删除卡片（输入 id）</label>
    <div class="row">
      <input type="text" name="del_id" />
      <button class="ghost" type="submit" name="action" value="delete">删除</button>
    </div>
    <label>重置卡片 key（输入 id）</label>
    <div class="row">
      <input type="text" name="reset_id" />
      <button class="ghost" type="submit" name="action" value="reset-key">重置</button>
    </div>
  </form>
</div>`;
}
