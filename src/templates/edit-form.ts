import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { Card } from "../types";
import { escapeHtml } from "../utils/escape";

export function renderEditForm(
  card: Card,
  key: string,
  isAdmin: boolean
): HtmlEscapedString | Promise<HtmlEscapedString> {
  const productSlots = [0, 1, 2]
    .map((i) => {
      const existing = card.products[i];
      const preview = existing
        ? `<div><img class="preview-img" src="${escapeHtml(existing)}" /></div>
           <label style="font-size:12px;color:var(--muted);display:block;margin:4px 0 8px">
             <input type="checkbox" name="remove_product_${i}" value="1" /> remove this one（删除这张）
           </label>`
        : "";
      return `<div class="product-slot" style="margin-bottom:14px">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px">slot ${i + 1}（第 ${i + 1} 张）</div>
        ${preview}
        <input type="file" name="product_${i}" accept="image/jpeg,image/png,image/webp" />
      </div>`;
    })
    .join("");

  const adminBack = isAdmin
    ? html`<a href="/edit?key=${key}">← back to the steward’s desk（返回管理后台）</a>`
    : "";

  return html`<div class="edit-wrap">
  <h1>tending to · ${card.brand || card.id}</h1>
  <p style="font-size:12px;color:var(--muted)">${adminBack}</p>
  <form method="post" action="/edit/${encodeURIComponent(card.id)}?key=${encodeURIComponent(key)}" enctype="multipart/form-data">
    <label>name of the workshop（工坊名称）</label>
    <input type="text" name="brand" value="${card.brand}" required />

    <label>by the hand of（主理人）</label>
    <input type="text" name="owner" value="${card.owner}" />

    <label>their craft（专长 / 短副标题）</label>
    <input type="text" name="specialty" value="${card.specialty}" />

    <label>a few words about their work（作品简介）</label>
    <textarea name="description">${card.description}</textarea>

    <label>their mark（品牌 logo，jpg/png/webp，5MB 以内）</label>
    ${card.logo ? html`<div><img class="preview-img" src="${card.logo}" /></div>` : ""}
    <input type="file" name="logo" accept="image/jpeg,image/png,image/webp" />

    <label>their works（作品照片，最多 3 张，可选）</label>
    ${raw(productSlots)}

    <label>to reach them（联系方式）</label>
    <div class="row">
      <input type="text" name="wechat" placeholder="WeChat（微信号）" value="${card.contact.wechat ?? ""}" />
      <input type="email" name="email" placeholder="email（邮箱）" value="${card.contact.email ?? ""}" />
    </div>

    <label>find them online（线上平台）</label>
    <div class="row">
      <input type="url" name="social_web" placeholder="https://their-website.com（个人网站）" value="${card.socials?.web ?? ""}" />
    </div>
    <div class="row">
      <input type="text" name="social_instagram" placeholder="@instagram（Instagram）" value="${card.socials?.instagram ?? ""}" />
    </div>
    <div class="row">
      <input type="text" name="social_xiaohongshu" placeholder="@xiaohongshu（小红书）" value="${card.socials?.xiaohongshu ?? ""}" />
    </div>

    <label>where to find them（所在地）</label>
    <div class="row">
      <input type="text" name="address" placeholder="Hangzhou, China（城市，国家）" value="${card.address ?? ""}" />
    </div>

    <button class="primary" type="submit" name="action" value="save">save（保存）</button>
    <a class="ghost" style="margin-left:8px" href="/card/${encodeURIComponent(card.id)}" target="_blank">preview（预览）</a>
  </form>
</div>`;
}
