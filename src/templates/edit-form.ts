import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { Card, VoiceMessage } from "../types";
import { escapeHtml } from "../utils/escape";

function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  return `${y}-${mo}-${da} ${h}:${mi}`;
}

function renderVoiceItems(cardId: string, voices: VoiceMessage[], key: string): string {
  if (!voices.length) {
    return `<div class="voice-item-empty">no voice notes yet（暂无语音留言）</div>`;
  }
  const sorted = [...voices].sort((a, b) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0
  );
  return (
    `<div class="voice-list">` +
    sorted
      .map((v) => {
        const meta = [fmtWhen(v.created_at), v.country || "—", fmtDuration(v.duration_ms)].join(" · ");
        const audioSrc = `/voices/${encodeURIComponent(cardId)}/${encodeURIComponent(v.id)}.${encodeURIComponent(v.ext)}`;
        return `<div class="voice-item" data-voice="${escapeHtml(v.id)}">
          <div class="voice-item-meta">${meta}</div>
          <div class="voice-item-row">
            <audio controls preload="none" src="${audioSrc}"></audio>
            <button type="button" class="ghost" onclick="deleteVoice(this,'${escapeHtml(cardId)}','${escapeHtml(v.id)}','${escapeHtml(key)}')">delete</button>
          </div>
        </div>`;
      })
      .join("") +
    `</div>`
  );
}

export function renderEditForm(
  card: Card,
  key: string,
  isAdmin: boolean,
  voices: VoiceMessage[] = []
): HtmlEscapedString | Promise<HtmlEscapedString> {
  const productSlots = [0, 1, 2]
    .map((i) => {
      const existing = card.products[i];
      const preview = existing
        ? `<div style="margin-bottom:10px"><img class="preview-img" src="${escapeHtml(existing)}" /></div>
           <label style="margin:0 0 12px;color:var(--muted);font-size:12px;text-transform:none;letter-spacing:0.2px;font-weight:400">
             <input type="checkbox" name="remove_product_${i}" value="1" /> remove this one（删除这张）
           </label>`
        : "";
      return `<div class="product-slot">
        <div>slot ${i + 1}（第 ${i + 1} 张）</div>
        ${preview}
        <input type="file" name="product_${i}" accept="image/jpeg,image/png,image/webp" />
      </div>`;
    })
    .join("");

  const adminBack = isAdmin
    ? html`<a href="/edit?key=${key}">← back to Admin Desk（返回管理后台）</a>`
    : "";

  return html`<div class="edit-wrap">
  <h1>Edit · ${card.brand || card.id}</h1>
  <p style="font-size:12px;color:var(--muted);margin-bottom:16px">${adminBack}</p>
  <form method="post" action="/edit/${encodeURIComponent(card.id)}?key=${encodeURIComponent(key)}" enctype="multipart/form-data">
    <h2>the basics（基本信息）</h2>

    <label>name of the workshop（工坊名称）</label>
    <input type="text" name="brand" value="${card.brand}" required />

    <label>by the hand of（主理人）</label>
    <input type="text" name="owner" value="${card.owner}" />

    <label>their craft（专长 / 短副标题）</label>
    <input type="text" name="specialty" value="${card.specialty}" />

    <label>a few words about their work（作品简介，一句话）</label>
    <textarea name="description">${card.description}</textarea>

    <h2>visuals（图片）</h2>

    <label>their mark（品牌 logo，jpg/png/webp，5MB 以内）</label>
    ${card.logo ? html`<div style="margin-bottom:10px"><img class="preview-img" src="${card.logo}" /></div>` : ""}
    <input type="file" name="logo" accept="image/jpeg,image/png,image/webp" />

    <label>their works（作品照片，最多 3 张，可选）</label>
    ${raw(productSlots)}

    <h2>contact & online（联系方式）</h2>

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

    <div style="display:flex;gap:10px;align-items:center;margin-top:8px;flex-wrap:wrap">
      <button class="primary" type="submit" name="action" value="save">save（保存）</button>
      <a class="ghost ghost-lg" href="/card/${encodeURIComponent(card.id)}" target="_blank" id="cardPageLink">Card（专属页面）</a>
    </div>

    <div class="card-share" id="cardShare" data-path="/card/${encodeURIComponent(card.id)}">
      <div id="cardQr"></div>
      <div class="card-share-body">
        <div class="card-share-label">scan or share（扫码或分享）</div>
        <div class="card-share-url" id="cardShareUrl">—</div>
        <button type="button" class="ghost" id="cardShareCopy">copy URL（复制链接）</button>
      </div>
    </div>
  </form>

  <h2>voice notes from visitors（访客语音留言）</h2>
  ${raw(renderVoiceItems(card.id, voices, key))}
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script>
(function(){
  var share = document.getElementById('cardShare');
  if(!share) return;
  var path = share.getAttribute('data-path') || '/';
  var url = window.location.origin + path;
  var urlEl = document.getElementById('cardShareUrl');
  var copyBtn = document.getElementById('cardShareCopy');
  var pageLink = document.getElementById('cardPageLink');
  if(urlEl) urlEl.textContent = url;
  if(pageLink) pageLink.href = url;
  var qrEl = document.getElementById('cardQr');
  if(qrEl && typeof QRCode !== 'undefined'){
    qrEl.innerHTML = '';
    new QRCode(qrEl, {
      text: url,
      width: 120,
      height: 120,
      colorDark: '#2C2C2C',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  }
  if(copyBtn){
    copyBtn.addEventListener('click', function(){
      function done(){
        var t = copyBtn.textContent;
        copyBtn.textContent = 'copied 已复制';
        copyBtn.disabled = true;
        setTimeout(function(){ copyBtn.textContent = t; copyBtn.disabled = false; }, 1500);
      }
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(url).then(done, function(){ window.prompt('copy this URL（手动复制）', url); });
      } else {
        window.prompt('copy this URL（手动复制）', url);
      }
    });
  }
})();
async function deleteVoice(btn, cardId, voiceId, key){
  if(!confirm('Delete this voice note?')) return;
  btn.disabled = true;
  try{
    var res = await fetch('/api/voice/'+encodeURIComponent(cardId)+'/'+encodeURIComponent(voiceId)+'?key='+encodeURIComponent(key), { method: 'DELETE' });
    if(!res.ok){ alert('Delete failed ('+res.status+')'); btn.disabled = false; return; }
    var item = btn.closest('.voice-item');
    if(item) item.remove();
    var list = document.querySelector('.voice-list');
    if(list && !list.querySelector('.voice-item')){
      var empty = document.createElement('div');
      empty.className = 'voice-item-empty';
      empty.textContent = 'no voice notes yet（暂无语音留言）';
      list.parentNode.replaceChild(empty, list);
    }
  }catch(err){
    alert('Network error');
    btn.disabled = false;
  }
}
</script>`;
}
