# Bushcraft 工匠展览

部署在 Cloudflare Workers + R2 的轻量展览网站。手机竖屏一卡一屏，上下滑动浏览。每位工匠持卡片 key 可编辑自己的内容，管理员 key 可管理所有卡片。

## 本地开发

```bash
npm install
wrangler r2 bucket create bushcraft-exhibition-dev
npm run dev
```

## 部署

```bash
wrangler r2 bucket create bushcraft-exhibition
npm run deploy
```

## 初始化管理员 key

部署后，准备 `keys.json`：

```json
{ "admin": "你的32位随机key", "cards": {} }
```

上传到 R2：

```bash
wrangler r2 object put bushcraft-exhibition/keys.json --file keys.json
```

然后访问 `https://<your-worker>.workers.dev/edit?key=你的32位随机key` 进入管理后台，新建第一张卡片，系统会自动为该卡片生成一个独立的 key（在后台列表中可以看到），把那个 key 给到工匠本人，他即可访问 `/edit?key=他的key` 编辑自己的卡片。

## 测试

```bash
npm run test
npm run typecheck
```

## 路由概览

- `GET /` — 首页，所有卡片
- `GET /card/:id` — 单卡片直链
- `GET /images/:id/:filename` — 卡片图片
- `GET /edit?key=xxx` — 编辑入口（管理员看到列表，普通 key 直接进表单）
- `GET /edit/:id?key=xxx` — 单卡片编辑表单
- `POST /edit/:id?key=xxx` — 提交编辑（multipart/form-data）
- `GET /api/cards`、`GET /api/card/:id` — JSON 公开接口
- `POST /api/card/:id?key=xxx` — JSON 更新（需 key）
- `POST /api/cards?key=admin` — 新建卡片（仅管理员）
- `DELETE /api/card/:id?key=admin` — 删除卡片（仅管理员）

## 限制

- 单张图片 ≤ 5MB，仅 jpg/png/webp
- 卡片 id 限定 `[a-z0-9-]+`
