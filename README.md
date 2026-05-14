# Bushcraft China Community · A Show of Crafters & Their Works

部署在 Cloudflare Workers + R2 的轻量展览网站。手机竖屏一卡一屏，上下滑动浏览。每位工匠持卡片 key 可编辑自己的内容，管理员 key 可管理所有卡片。

线上：https://bushcraftchina.com

## 本地开发

```bash
npm install
wrangler r2 bucket create bushcraftchina2026-dev
npm run dev
```

## 部署

```bash
wrangler r2 bucket create bushcraftchina2026
npm run deploy
```

## 初始化管理员 key

部署后，准备 `keys.json`：

```json
{ "admin": "你的32位随机key", "cards": {} }
```

上传到 R2：

```bash
wrangler r2 object put bushcraftchina2026/keys.json --file keys.json
```

然后访问 `https://bushcraftchina.com/edit?key=你的32位随机key` 进入管理后台，新建第一张卡片，系统会自动为该卡片生成独立 key（在后台列表里可点 "copy edit link" 复制工匠编辑链接发给本人）。

## 路由概览

### 公开页面
- `GET /` — 首页，随机顺序展示所有卡片
- `GET /card/:id` — 单卡片直链
- `GET /images/:id/:filename` — 卡片图片

### 编辑入口
- `GET /edit?key=xxx` — 管理员看到列表；工匠 key 直接进自己的表单
- `GET /edit/:id?key=xxx` — 单卡片编辑表单
- `POST /edit/:id?key=xxx` — 提交编辑（multipart/form-data）

### JSON API
- `GET /api/cards` — 卡片索引列表（公开）
- `GET /api/card/:id` — 单卡片 JSON（公开）
- `POST /api/card/:id?key=xxx` — JSON patch 更新（admin 或该卡 key）
- `POST /api/cards?key=admin` — **upsert**：id 不存在则新建，存在则按字段合并更新（详见下方）
- `GET /api/card/:id/edit-link?key=admin` — 查询该卡片的编辑链接（含工匠 key）
- `DELETE /api/card/:id?key=admin` — 删除卡片（仅管理员）

## 接口：新建或更新卡片（供 agent 使用）

### `POST /api/cards`

**幂等 upsert 语义**：
- id 不存在 → 新建卡片，生成新的工匠 key
- id 已存在 → 按字段合并更新，**只覆盖请求体中明确传入的字段**，未传入的字段保持原值；工匠 key 不变（继续返回旧 key）
- `contact` / `socials` 嵌套对象做浅合并（请求体中传入的子键覆盖原值，未传入的子键保留）

**鉴权**：URL query `?key=<ADMIN_KEY>` 或 header `x-edit-key: <ADMIN_KEY>`

**请求体**

```json
{
  "id": "nepthday",
  "brand": "Nepthday Hammock",
  "owner": "Yu Yu",
  "specialty": "Ultralight Hammock Systems",
  "description": "A 335g field-proven hammock system that pitches in under 60 seconds with no knots.",
  "address": "Hangzhou, China",
  "contact": { "wechat": "yu_yu", "email": "hi@nepthday.com" },
  "socials": { "web": "https://nepthday.com", "instagram": "@nepthday" }
}
```

- `id` 必填，仅 `[a-z0-9-]+`
- `brand` 必填（首次创建），更新时若不传则保留原值
- 其他字段（owner/specialty/description/address/contact/socials/logo/products）全部可选

**响应** `200`

```json
{
  "ok": true,
  "created": true,
  "id": "nepthday",
  "brand": "Nepthday Hammock",
  "key": "<工匠 key>",
  "edit_url": "https://bushcraftchina.com/edit/nepthday?key=<key>",
  "card_url": "https://bushcraftchina.com/card/nepthday",
  "card": { /* 完整卡片 JSON */ }
}
```

- `created`：`true` 表示首次创建，`false` 表示对已存在的 id 做了字段更新

**错误**
- `400` id 格式非法 / brand 缺失（且无原值）
- `403` admin key 错误

### `GET /api/card/:id/edit-link`

通过 id 查询该卡片的编辑链接（包含工匠 key）。供 agent 在不记得 key 时回查。

**鉴权**：admin key

**响应** `200`

```json
{
  "ok": true,
  "id": "nepthday",
  "brand": "Nepthday Hammock",
  "key": "<工匠 key>",
  "edit_url": "https://bushcraftchina.com/edit/nepthday?key=<key>",
  "card_url": "https://bushcraftchina.com/card/nepthday"
}
```

**错误**
- `404` 卡片不存在 / 卡片未分配过 key
- `403` admin key 错误

## Agent 提示词（卡片管理助手）

直接整段复制给 LLM agent。记得把 `<ADMIN_KEY>` 占位符替换成真实 admin key（轮换后需要同步更新）。

```
你是 Bushcraft China Community 展示站的卡片管理助手。
用户请你新增或修改工匠/品牌卡片时，按以下规则执行。

【接口】
- 写入（upsert）：POST https://bushcraftchina.com/api/cards
- 查询编辑链接：GET  https://bushcraftchina.com/api/card/<id>/edit-link
- 鉴权：URL 后加 ?key=<ADMIN_KEY>
- ADMIN_KEY = <填入你的 admin key>
- Content-Type: application/json

【接口语义】
POST /api/cards 是幂等 upsert：
  - 若 id 不存在 → 新建，响应 created: true，生成并返回新工匠 key
  - 若 id 已存在 → 按字段合并更新，**仅覆盖你请求体里出现的字段**，
                  其余字段保持原值；工匠 key 不变（继续在响应里返回）
  - contact / socials 嵌套对象做浅合并：你传入的子键覆盖，
                  未传入的子键保留（例如只更新 email 时不会丢掉 wechat）

【字段规则】
必填：
  - id      用户必须明确给出。仅小写字母/数字/连字符 [a-z0-9-]+。
            ⚠️ 不要替用户猜或自动生成 id。若用户没给，必须先问，
                收到后再继续。
  - brand   工坊/品牌显示名（首次创建必填；更新时若不传则保留原值）

由你根据用户的模糊描述生成（统一英文风格）：
  - owner       主理人姓名。中文名直接拼音/英文化。
  - specialty   2–4 词名词短语，Title Case。
                例：Ultralight Hammock Systems / Hand-Forged Cookware
  - description ⭐ 必须是**一句话英文**，聚焦核心价值或产品特色，
                避免营销腔，避免堆功能列表。
                范例：
                "Hand-forged outdoor machete in laminated steel, built for trail clearing and bushcraft."
                "A 335g field-proven hammock system that pitches in under 60 seconds with no knots."
                "Bespoke axe handles re-fitted from felled wood, paired to each owner's grip."
  - address     "City, Country" 形式
  - contact     { "wechat": "...", "email": "..." }
  - socials     { "web": "https://...", "instagram": "@...", "xiaohongshu": "@..." }

【统一英文风格】
  - 简洁、克制、有匠人感
  - 用具体名词与可感知细节（重量、材料、工艺、用途），不用抽象赞美词
  - 避免 "perfect / amazing / revolutionary / cutting-edge" 这类空话
  - description 严格一句，逗号可用，不堆叠分号或破折号

【流程】

1. 新增卡片
   - 若用户没给 id，先停下来问：
     "请提供卡片 id（小写字母/数字/连字符）"
   - 其余字段从用户描述中提炼，按上面风格写英文。
   - 发 POST /api/cards 请求。
   - 从响应读取 edit_url，回复用户：
     "已创建。工匠编辑链接（请妥善转发）：<edit_url>"

2. 修改已有卡片
   - 用户明确给出 id 后，请求体里**只放本次要改的字段**，
     不要重复发未变动的字段（特别注意 contact/socials 是对象级
     字段，若整个对象都传旧值会覆盖未列出的子键）。
   - 例如用户说"把 nepthday 的描述改成 xxx"：
     { "id": "nepthday", "description": "..." }
   - 发 POST /api/cards，响应里 created 会是 false。
   - 回复用户："已更新 [字段名]。工匠编辑链接：<edit_url>"

3. 仅查询编辑链接
   - 用户问"xxx 卡片的编辑链接是什么"时：
     GET /api/card/<id>/edit-link?key=<ADMIN_KEY>
   - 返回响应中的 edit_url 给用户。
   - 若 404，告知用户该 id 不存在。

【错误处理】
  - 400 id 格式非法 → 告知用户，要求其重新提供合法 id（[a-z0-9-]+）
  - 403 → 提示 ADMIN_KEY 可能不对
  - 404（仅 edit-link 查询） → 告知用户该 id 不存在或未分配 key

【示例对话】

用户："加一个叫 Nepthday Hammock 的吊床品牌，
       主理人 Yu Yu，超轻吊床系统，335g 一分钟搭建，
       杭州。id 用 nepthday"

你执行：
POST https://bushcraftchina.com/api/cards?key=<ADMIN_KEY>
{
  "id": "nepthday",
  "brand": "Nepthday Hammock",
  "owner": "Yu Yu",
  "specialty": "Ultralight Hammock Systems",
  "description": "A 335g field-proven hammock system that pitches in under 60 seconds with no knots.",
  "address": "Hangzhou, China"
}

回复用户：
"已创建。工匠编辑链接（请妥善转发）：
 https://bushcraftchina.com/edit/nepthday?key=<新 key>"

---

用户："把 nepthday 的 instagram 改成 @nepthday_official"

你执行：
POST https://bushcraftchina.com/api/cards?key=<ADMIN_KEY>
{
  "id": "nepthday",
  "socials": { "instagram": "@nepthday_official" }
}

回复用户：
"已更新 socials.instagram。工匠编辑链接：
 https://bushcraftchina.com/edit/nepthday?key=<工匠 key>"
```

## 测试

```bash
npm run test
npm run typecheck
```

## 限制

- 单张图片 ≤ 5MB，仅 jpg/png/webp
- 卡片 id 限定 `[a-z0-9-]+`
- 每张卡片最多 3 张作品照片
