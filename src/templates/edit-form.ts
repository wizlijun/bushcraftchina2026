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
           <input type="text" name="link_label_${i}" placeholder="label" value="${escapeHtml(l.label)}" />
           <input type="url" name="link_url_${i}" placeholder="https://" value="${escapeHtml(l.url)}" />
         </div>`
    )
    .join("");

  const adminBack = isAdmin
    ? html`<a href="/edit?key=${key}">← back to the steward’s desk</a>`
    : "";

  return html`<div class="edit-wrap">
  <h1>tending to · ${card.brand || card.id}</h1>
  <p style="font-size:12px;color:var(--muted)">${adminBack}</p>
  <form method="post" action="/edit/${encodeURIComponent(card.id)}?key=${encodeURIComponent(key)}" enctype="multipart/form-data">
    <label>name of the workshop</label>
    <input type="text" name="brand" value="${card.brand}" required />

    <label>by the hand of</label>
    <input type="text" name="owner" value="${card.owner}" />

    <label>their craft</label>
    <input type="text" name="specialty" value="${card.specialty}" />

    <label>a few words about their work</label>
    <textarea name="description">${card.description}</textarea>

    <label>their mark (jpg, png or webp · up to 5MB)</label>
    ${card.logo ? html`<div><img class="preview-img" src="${card.logo}" /></div>` : ""}
    <input type="file" name="logo" accept="image/jpeg,image/png,image/webp" />

    <label>their works</label>
    <div>${raw(productImgs)}</div>
    <input type="file" name="product" accept="image/jpeg,image/png,image/webp" multiple />

    <label>to reach them</label>
    <div class="row">
      <input type="text" name="wechat" placeholder="WeChat" value="${card.contact.wechat ?? ""}" />
      <input type="text" name="phone" placeholder="telephone" value="${card.contact.phone ?? ""}" />
    </div>

    <label>find them online</label>
    <div class="row">
      <input type="url" name="social_web" placeholder="https://their-website.com" value="${card.socials?.web ?? ""}" />
    </div>
    <div class="row">
      <input type="text" name="social_instagram" placeholder="@instagram" value="${card.socials?.instagram ?? ""}" />
    </div>
    <div class="row">
      <input type="text" name="social_xiaohongshu" placeholder="@xiaohongshu" value="${card.socials?.xiaohongshu ?? ""}" />
    </div>

    <label>where to find them</label>
    <div class="row">
      <input type="text" name="address" placeholder="Hangzhou, China" value="${card.address ?? ""}" />
    </div>

    <label>elsewhere on the web</label>
    ${raw(linkRows)}
    <div class="row">
      <input type="text" name="link_label_new" placeholder="label" />
      <input type="url" name="link_url_new" placeholder="https://" />
    </div>

    <button class="primary" type="submit" name="action" value="save">save</button>
    <a class="ghost" style="margin-left:8px" href="/card/${encodeURIComponent(card.id)}" target="_blank">preview</a>
  </form>
</div>`;
}
