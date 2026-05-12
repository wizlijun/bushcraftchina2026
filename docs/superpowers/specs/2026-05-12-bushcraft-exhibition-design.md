# Bushcraft 工匠展览网站设计

## 概述

为中国 Bushcraft 社区工匠和品牌打造的展览网站。每位工匠一张卡片，手机竖屏全屏浏览，上下 snap 滚动切换。每张卡片持有独立 key 可编辑自身内容，管理员 key 可编辑所有内容。

## 技术栈

- **框架**：Hono（轻量 Web 框架，专为 CF Workers 设计）
- **运行环境**：Cloudflare Workers
- **存储**：Cloudflare R2（数据 JSON + 图片全部存 R2）
- **模板**：Hono 内置 html helper（tagged template literals）
- **样式**：内联 CSS，无框架依赖
- **运行时依赖**：仅 hono

## 项目结构

```
bushcraftchina2026/
├── src/
│   ├── index.ts              # Hono app 入口，绑定路由
│   ├── routes/
│   │   ├── pages.ts          # 前端页面路由（首页、卡片浏览）
│   │   ├── edit.ts           # 编辑页面路由
│   │   └── api.ts            # API 路由（CRUD 卡片、上传图片）
│   ├── middleware/
│   │   └── auth.ts           # key 验证中间件
│   ├── templates/
│   │   ├── layout.ts         # HTML 基础布局
│   │   ├── card.ts           # 卡片模板
│   │   └── edit-form.ts      # 编辑表单模板
│   └── utils/
│       └── r2.ts             # R2 读写封装
├── wrangler.toml
├── package.json
└── tsconfig.json
```

## R2 存储结构

```
bushcraft-exhibition/
├── cards/
│   ├── index.json            # 卡片列表和排序 [{id, brand, order}]
│   └── {id}.json             # 单个卡片完整数据
├── images/{id}/
│   ├── logo.png
│   └── product-*.jpg
└── keys.json                 # {admin: "xxx", cards: {id: "key", ...}}
```

## 卡片数据结构

```json
{
  "id": "shangwu",
  "brand": "晌午",
  "owner": "主理人名",
  "logo": "/images/shangwu/logo.png",
  "specialty": "手工刀匠",
  "description": "产品特色描述...",
  "contact": {
    "wechat": "xxx",
    "phone": ""
  },
  "products": [
    "/images/shangwu/product-1.jpg",
    "/images/shangwu/product-2.jpg"
  ],
  "links": [
    {"label": "小红书", "url": "https://..."},
    {"label": "淘宝", "url": "https://..."}
  ]
}
```

## 路由设计

### 页面路由（pages.ts）

| 路径 | 功能 |
|------|------|
| `GET /` | 首页，全屏卡片浏览，上下 snap 滚动 |
| `GET /card/:id` | 单个卡片直链（可分享） |
| `GET /images/:id/:filename` | 从 R2 读取图片返回 |

### 编辑路由（edit.ts）

| 路径 | 功能 |
|------|------|
| `GET /edit?key=xxx` | 验证 key，显示编辑表单或卡片列表（管理员） |
| `POST /edit/:id?key=xxx` | 表单提交（multipart/form-data，含文本字段和图片上传） |

编辑路由处理浏览器表单提交（含文件上传），API 路由提供 JSON 接口（供程序调用）。两者最终都写入 R2。

### API 路由（api.ts）

| 路径 | 功能 |
|------|------|
| `GET /api/cards` | 返回所有卡片列表（公开） |
| `GET /api/card/:id` | 返回单个卡片数据（公开） |
| `POST /api/card/:id` | 更新卡片（需 key） |
| `POST /api/card/:id/image` | 上传图片（需 key） |
| `DELETE /api/card/:id/image/:name` | 删除图片（需 key） |
| `POST /api/cards` | 新增卡片（仅管理员） |
| `DELETE /api/card/:id` | 删除卡片（仅管理员） |

## 认证机制

- key 通过 URL query 参数传递，不使用 cookie/session
- 从 R2 读取 `keys.json` 进行匹配
- 管理员 key：可操作所有卡片，可新增/删除卡片，可重置卡片 key
- 卡片 key：仅可操作对应卡片
- 无效 key：返回 403

## 视觉设计

### 色调

- 背景：米白 `#F5F2EB`
- 主文字：深炭 `#2C2C2C`
- 辅助文字：暖灰 `#6B6358`
- 点缀：深橄榄绿 `#4A5D3A`
- 分隔线：淡土色 `#D4C9B8`

### 字体

- 中文：`"PingFang SC", "Hiragino Sans GB", sans-serif`
- 英文/数字：`"Georgia", serif`

### 卡片布局（100vh 单屏）

从上到下依次：
1. Logo（圆角方形，轻微阴影）
2. 品牌名（大号）
3. 擅长（小字）
4. 主理人
5. 产品特色（引号包裹，斜体质感）
6. 产品图（横向滑动）
7. 外链按钮
8. 滑动提示

### 动效

- 卡片切换：CSS `scroll-snap-type: y mandatory`
- 进入动画：内容淡入 + 轻微上移（200ms）
- 整体克制，保持安静感

### 响应式

- 手机优先，竖屏一卡一屏
- 平板/桌面：卡片居中，最大宽度 480px，两侧留白

## 编辑页面

### 普通用户编辑表单

字段：品牌名、主理人、擅长、产品特色、Logo上传、产品图管理（添加/删除）、联系方式（微信/电话）、外链管理（添加/删除）

底部：保存按钮 + 预览按钮

### 管理员额外功能

- 卡片列表总览
- 新增卡片（生成 id + 分配 key）
- 删除卡片
- 调整卡片排序
- 重置卡片 key

## 安全

- 图片上传限制：单文件 5MB，仅允许 jpg/png/webp
- 输入内容 HTML 转义，防 XSS
- keys.json 不通过公开 API 暴露
- 管理员 key 建议 32 位随机字符串
- 错误页面不暴露内部细节

## 部署

### wrangler.toml

```toml
name = "bushcraft-exhibition"
main = "src/index.ts"
compatibility_date = "2024-12-01"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "bushcraft-exhibition"
```

### 命令

```bash
wrangler r2 bucket create bushcraft-exhibition   # 首次创建 bucket
npm install
wrangler dev                                      # 本地开发
wrangler deploy                                   # 部署
```

### 初始化

首次部署后上传初始 keys.json 到 R2：

```json
{
  "admin": "随机生成的32位key",
  "cards": {}
}
```

## 规模

设计目标 10-50 张卡片。首页一次加载所有卡片数据（JSON 体积小），图片懒加载。
