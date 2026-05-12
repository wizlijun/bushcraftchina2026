import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { Card } from "../types";
import { escapeHtml } from "../utils/escape";

export function renderEditForm(
  card: Card,
  key: string,
  isAdmin: boolean
): HtmlEscapedString | Promise<HtmlEscapedString> {
  const productImgs = card.products
    .map(
      (src) =>
        `<span class="image-tile">
           <img class="preview-img" src="${escapeHtml(src)}" />
           <button type="submit" name="action" value="del-product:${escapeHtml(src)}" class="ghost">×</button>
         </span>`
    )
    .join("");

  const linkRows = card.links
    .map(
      (l, i) =>
        `<div class="row">
           <input type="text" name="link_label_${i}" placeholder="标签" value="${escapeHtml(l.label)}" />
           <input type="url" name="link_url_${i}" placeholder="https://" value="${escapeHtml(l.url)}" />
         </div>`
    )
    .join("");

  const adminBack = isAdmin
    ? html`<a href="/edit?key=${key}">← 返回管理员列表</a>`
    : "";

  return html`<div class="edit-wrap">
  <h1>编辑卡片：${card.brand || card.id}</h1>
  <p style="font-size:12px;color:var(--muted)">${adminBack}</p>
  <form method="post" action="/edit/${encodeURIComponent(card.id)}?key=${encodeURIComponent(key)}" enctype="multipart/form-data">
    <label>品牌名</label>
    <input type="text" name="brand" value="${card.brand}" required />

    <label>主理人</label>
    <input type="text" name="owner" value="${card.owner}" />

    <label>擅长</label>
    <input type="text" name="specialty" value="${card.specialty}" />

    <label>产品特色</label>
    <textarea name="description">${card.description}</textarea>

    <label>Logo（jpg/png/webp，≤5MB）</label>
    ${card.logo ? html`<div><img class="preview-img" src="${card.logo}" /></div>` : ""}
    <input type="file" name="logo" accept="image/jpeg,image/png,image/webp" />

    <label>产品图</label>
    <div>${raw(productImgs)}</div>
    <input type="file" name="product" accept="image/jpeg,image/png,image/webp" multiple />

    <label>联系方式</label>
    <div class="row">
      <input type="text" name="wechat" placeholder="微信" value="${card.contact.wechat ?? ""}" />
      <input type="text" name="phone" placeholder="电话" value="${card.contact.phone ?? ""}" />
    </div>

    <label>外链</label>
    ${raw(linkRows)}
    <div class="row">
      <input type="text" name="link_label_new" placeholder="新标签" />
      <input type="url" name="link_url_new" placeholder="https://" />
    </div>

    <button class="primary" type="submit" name="action" value="save">保存</button>
    <a class="ghost" style="margin-left:8px" href="/card/${encodeURIComponent(card.id)}" target="_blank">预览</a>
  </form>
</div>`;
}
