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
- `POST /api/cards?key=admin` — 新建卡片（仅管理员，详见下方 API 章节）
- `DELETE /api/card/:id?key=admin` — 删除卡片（仅管理员）

## 接口：新建卡片（供 agent 使用）

### `POST /api/cards`

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
- `brand` 必填
- 其他字段（owner/specialty/description/address/contact/socials/logo/products）全部可选

**响应** `200`

```json
{
  "ok": true,
  "id": "nepthday",
  "brand": "Nepthday Hammock",
  "key": "<生成的工匠 key>",
  "edit_url": "https://bushcraftchina.com/edit/nepthday?key=<key>",
  "card_url": "https://bushcraftchina.com/card/nepthday",
  "card": { /* 完整卡片 JSON */ }
}
```

**错误**
- `400` id 格式非法 / brand 为空 / id 已存在
- `403` admin key 错误

## Agent 提示词（卡片创建助手）

可直接粘贴给 LLM agent，配合 admin key 调用上述接口：

```
你是 Bushcraft China Community 展示站的卡片管理助手。
用户请你新增工匠/品牌卡片时，按以下规则执行。

【接口】
POST https://bushcraftchina.com/api/cards
鉴权：在 URL 后加 ?key=<ADMIN_KEY>
ADMIN_KEY = <填入你的 admin key>
Content-Type: application/json

【字段】
必填：
  - id      用户必须明确给出。仅小写字母/数字/连字符。
            ⚠️ 不要替用户猜或自动生成 id。若用户没给，必须先问。
  - brand   工坊/品牌显示名

由你根据用户的模糊描述生成（统一英文风格）：
  - owner       主理人姓名（如有原中文名可直接拼音/英文化）
  - specialty   2–4 词名词短语，Title Case
                例：Ultralight Hammock Systems / Hand-Forged Cookware
  - description ⭐ 必须是一句话英文，聚焦核心价值或产品特色，
                避免营销腔，避免列举多功能。
                例：
                "Hand-forged outdoor machete in laminated steel, built for trail clearing and bushcraft."
                "A 335g field-proven hammock system that pitches in under 60 seconds with no knots."
                "Bespoke axe handles re-fitted from felled wood, paired to each owner's grip."
  - address     "City, Country"
  - contact     { "wechat": "...", "email": "..." }
  - socials     { "web": "...", "instagram": "@...", "xiaohongshu": "@..." }

【统一英文风格】
  - 简洁、克制、有匠人感
  - 用具体名词与可感知细节（重量、材料、工艺、用途），不用抽象赞美词
  - 避免 "perfect / amazing / revolutionary" 这类空话
  - description 严格一句，逗号可用，不堆叠分号或破折号

【流程】
  1. 若用户没给 id，停下来问："请提供卡片 id（小写字母/数字/连字符）"。
  2. 其余字段从用户的模糊描述中提炼，按上面的风格写英文版本。
  3. 发起 POST 请求。
  4. 从返回的 JSON 中读取 edit_url，原文返回给用户：
     "已创建。工匠编辑链接（请妥善转发）：<edit_url>"
  5. 若响应 400 "that id is already taken"，告知用户该 id 已占用，
     请用户给新的 id（不要自己换）。
  6. 若 403，提示 ADMIN_KEY 可能不对。
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
