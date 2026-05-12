# Bushcraft 工匠展览网站实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现一个部署在 Cloudflare Workers 上、使用 R2 作为存储的 Bushcraft 工匠展览网站，支持基于 key 的内容编辑。

**Architecture:** Hono 框架组织路由和中间件，所有数据（卡片 JSON、图片、keys）存于 R2。SSR 渲染 HTML，前端用纯 CSS scroll-snap 实现手机竖屏一屏一卡浏览。编辑通过 `/edit?key=xxx` 进入，普通 key 编辑自己的卡片，管理员 key 可管理所有卡片。

**Tech Stack:** TypeScript + Hono + Cloudflare Workers + R2 + Vitest（含 @cloudflare/vitest-pool-workers）

---

## File Structure

| 文件 | 职责 |
|------|------|
| `package.json` | 依赖与脚本 |
| `tsconfig.json` | TypeScript 配置 |
| `wrangler.toml` | Workers 配置，R2 绑定 |
| `vitest.config.ts` | Vitest + workers pool 配置 |
| `src/index.ts` | Hono app 入口，挂载所有路由 |
| `src/types.ts` | 共享类型定义（Card、Keys、Env） |
| `src/utils/r2.ts` | R2 读写封装（getJSON/putJSON/getImage/putImage/listImages） |
| `src/utils/keys.ts` | key 验证、生成 |
| `src/utils/escape.ts` | HTML 转义 |
| `src/middleware/auth.ts` | 认证中间件（注入 role + cardId） |
| `src/templates/layout.ts` | HTML 文档外壳 + 全局 CSS |
| `src/templates/card.ts` | 单卡片片段 |
| `src/templates/edit-form.ts` | 编辑表单 |
| `src/templates/admin-list.ts` | 管理员卡片列表 |
| `src/routes/pages.ts` | `/`, `/card/:id`, `/images/:id/:filename` |
| `src/routes/edit.ts` | `/edit`, `POST /edit/:id` |
| `src/routes/api.ts` | `/api/*` JSON 路由 |
| `test/*.test.ts` | 各模块单元测试 |

---

## Task 1: 项目初始化与依赖

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `wrangler.toml`
- Create: `.gitignore`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "bushcraft-exhibition",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "hono": "^4.6.0"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.5.0",
    "@cloudflare/workers-types": "^4.20240620.0",
    "typescript": "^5.5.0",
    "vitest": "1.5.0",
    "wrangler": "^3.78.0"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "lib": ["ESNext"],
    "types": ["@cloudflare/workers-types", "@cloudflare/vitest-pool-workers"],
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx"
  },
  "include": ["src/**/*", "test/**/*"]
}
```

- [ ] **Step 3: 创建 wrangler.toml**

```toml
name = "bushcraft-exhibition"
main = "src/index.ts"
compatibility_date = "2024-12-01"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "bushcraft-exhibition"
preview_bucket_name = "bushcraft-exhibition-dev"
```

- [ ] **Step 4: 创建 .gitignore**

```
node_modules/
.wrangler/
.dev.vars
dist/
*.log
.DS_Store
```

- [ ] **Step 5: 安装依赖**

Run: `npm install`
Expected: 成功安装，无 error。

- [ ] **Step 6: 运行 typecheck**

Run: `npm run typecheck`
Expected: 退出码 0（此时无源码，应通过）。

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json wrangler.toml .gitignore
git commit -m "chore: init project scaffolding"
```

---

## Task 2: 类型定义

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: 写类型定义**

```typescript
// src/types.ts
export interface Card {
  id: string;
  brand: string;
  owner: string;
  logo: string;
  specialty: string;
  description: string;
  contact: {
    wechat?: string;
    phone?: string;
  };
  products: string[];
  links: Array<{ label: string; url: string }>;
}

export interface CardIndexEntry {
  id: string;
  brand: string;
  order: number;
}

export interface Keys {
  admin: string;
  cards: Record<string, string>;
}

export interface Env {
  BUCKET: R2Bucket;
}

export type Role = "admin" | "card";

export interface AuthContext {
  role: Role;
  cardId?: string;
}
```

- [ ] **Step 2: 运行 typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add shared type definitions"
```

---

## Task 3: vitest 配置

**Files:**
- Create: `vitest.config.ts`

- [ ] **Step 1: 创建 vitest.config.ts**

```typescript
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          r2Buckets: ["BUCKET"],
        },
      },
    },
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add vitest.config.ts
git commit -m "chore: add vitest config for workers pool"
```

---

## Task 4: HTML 转义工具（TDD）

**Files:**
- Create: `src/utils/escape.ts`
- Create: `test/escape.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// test/escape.test.ts
import { describe, it, expect } from "vitest";
import { escapeHtml } from "../src/utils/escape";

describe("escapeHtml", () => {
  it("escapes &, <, >, \", '", () => {
    expect(escapeHtml(`<script>alert("x")</script>`))
      .toBe("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  });

  it("escapes ampersand first", () => {
    expect(escapeHtml("a&b<c")).toBe("a&amp;b&lt;c");
  });

  it("handles empty string", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("handles undefined/null safely", () => {
    expect(escapeHtml(undefined as any)).toBe("");
    expect(escapeHtml(null as any)).toBe("");
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm run test -- escape`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 写实现**

```typescript
// src/utils/escape.ts
export function escapeHtml(s: string | undefined | null): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm run test -- escape`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/escape.ts test/escape.test.ts
git commit -m "feat: add HTML escape utility"
```

---

## Task 5: R2 工具封装（TDD）

**Files:**
- Create: `src/utils/r2.ts`
- Create: `test/r2.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// test/r2.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { getJSON, putJSON, deleteObject, listPrefix } from "../src/utils/r2";

describe("r2 utils", () => {
  beforeEach(async () => {
    const list = await env.BUCKET.list();
    for (const obj of list.objects) {
      await env.BUCKET.delete(obj.key);
    }
  });

  it("putJSON then getJSON returns same object", async () => {
    await putJSON(env.BUCKET, "cards/test.json", { id: "test", brand: "测试" });
    const data = await getJSON<{ id: string; brand: string }>(env.BUCKET, "cards/test.json");
    expect(data).toEqual({ id: "test", brand: "测试" });
  });

  it("getJSON returns null when key missing", async () => {
    const data = await getJSON(env.BUCKET, "cards/missing.json");
    expect(data).toBeNull();
  });

  it("deleteObject removes key", async () => {
    await putJSON(env.BUCKET, "x.json", { a: 1 });
    await deleteObject(env.BUCKET, "x.json");
    expect(await getJSON(env.BUCKET, "x.json")).toBeNull();
  });

  it("listPrefix returns keys with prefix", async () => {
    await putJSON(env.BUCKET, "images/a/1.json", {});
    await putJSON(env.BUCKET, "images/a/2.json", {});
    await putJSON(env.BUCKET, "images/b/3.json", {});
    const keys = await listPrefix(env.BUCKET, "images/a/");
    expect(keys.sort()).toEqual(["images/a/1.json", "images/a/2.json"]);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm run test -- r2`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 写实现**

```typescript
// src/utils/r2.ts
export async function getJSON<T>(bucket: R2Bucket, key: string): Promise<T | null> {
  const obj = await bucket.get(key);
  if (!obj) return null;
  return await obj.json<T>();
}

export async function putJSON(bucket: R2Bucket, key: string, value: unknown): Promise<void> {
  await bucket.put(key, JSON.stringify(value), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
}

export async function putImage(
  bucket: R2Bucket,
  key: string,
  body: ArrayBuffer | ReadableStream,
  contentType: string
): Promise<void> {
  await bucket.put(key, body, {
    httpMetadata: { contentType, cacheControl: "public, max-age=86400" },
  });
}

export async function getImage(bucket: R2Bucket, key: string): Promise<R2ObjectBody | null> {
  return await bucket.get(key);
}

export async function deleteObject(bucket: R2Bucket, key: string): Promise<void> {
  await bucket.delete(key);
}

export async function listPrefix(bucket: R2Bucket, prefix: string): Promise<string[]> {
  const results: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix, cursor });
    for (const obj of page.objects) results.push(obj.key);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return results;
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm run test -- r2`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/r2.ts test/r2.test.ts
git commit -m "feat: add R2 storage utilities"
```

---

## Task 6: keys 工具（TDD）

**Files:**
- Create: `src/utils/keys.ts`
- Create: `test/keys.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// test/keys.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { generateKey, loadKeys, saveKeys, verifyKey } from "../src/utils/keys";

describe("keys utils", () => {
  beforeEach(async () => {
    const list = await env.BUCKET.list();
    for (const obj of list.objects) await env.BUCKET.delete(obj.key);
  });

  it("generateKey produces 32-char hex string", () => {
    const k = generateKey();
    expect(k).toMatch(/^[a-f0-9]{32}$/);
    expect(generateKey()).not.toBe(k);
  });

  it("loadKeys returns default when missing", async () => {
    const keys = await loadKeys(env.BUCKET);
    expect(keys).toEqual({ admin: "", cards: {} });
  });

  it("saveKeys then loadKeys roundtrips", async () => {
    await saveKeys(env.BUCKET, { admin: "A", cards: { x: "K" } });
    expect(await loadKeys(env.BUCKET)).toEqual({ admin: "A", cards: { x: "K" } });
  });

  it("verifyKey identifies admin", async () => {
    await saveKeys(env.BUCKET, { admin: "ADMIN", cards: { x: "K" } });
    expect(await verifyKey(env.BUCKET, "ADMIN")).toEqual({ role: "admin" });
  });

  it("verifyKey identifies card key", async () => {
    await saveKeys(env.BUCKET, { admin: "ADMIN", cards: { x: "K", y: "Q" } });
    expect(await verifyKey(env.BUCKET, "Q")).toEqual({ role: "card", cardId: "y" });
  });

  it("verifyKey returns null on invalid", async () => {
    await saveKeys(env.BUCKET, { admin: "ADMIN", cards: {} });
    expect(await verifyKey(env.BUCKET, "nope")).toBeNull();
  });

  it("verifyKey rejects empty key", async () => {
    await saveKeys(env.BUCKET, { admin: "", cards: { x: "" } });
    expect(await verifyKey(env.BUCKET, "")).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm run test -- keys`
Expected: FAIL

- [ ] **Step 3: 写实现**

```typescript
// src/utils/keys.ts
import type { Keys, AuthContext } from "../types";
import { getJSON, putJSON } from "./r2";

const KEYS_PATH = "keys.json";

export function generateKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function loadKeys(bucket: R2Bucket): Promise<Keys> {
  const k = await getJSON<Keys>(bucket, KEYS_PATH);
  return k ?? { admin: "", cards: {} };
}

export async function saveKeys(bucket: R2Bucket, keys: Keys): Promise<void> {
  await putJSON(bucket, KEYS_PATH, keys);
}

export async function verifyKey(bucket: R2Bucket, key: string): Promise<AuthContext | null> {
  if (!key) return null;
  const keys = await loadKeys(bucket);
  if (keys.admin && key === keys.admin) return { role: "admin" };
  for (const [cardId, cardKey] of Object.entries(keys.cards)) {
    if (cardKey && key === cardKey) return { role: "card", cardId };
  }
  return null;
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm run test -- keys`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/keys.ts test/keys.test.ts
git commit -m "feat: add key generation and verification"
```

---

## Task 7: 认证中间件（TDD）

**Files:**
- Create: `src/middleware/auth.ts`
- Create: `test/auth.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// test/auth.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { Hono } from "hono";
import { requireAuth, requireAdmin } from "../src/middleware/auth";
import { saveKeys } from "../src/utils/keys";
import type { Env, AuthContext } from "../src/types";

type Vars = { auth: AuthContext };

function buildApp() {
  const app = new Hono<{ Bindings: Env; Variables: Vars }>();
  app.get("/private", requireAuth, (c) => c.json(c.get("auth")));
  app.get("/admin", requireAuth, requireAdmin, (c) => c.text("ok"));
  return app;
}

describe("auth middleware", () => {
  beforeEach(async () => {
    const list = await env.BUCKET.list();
    for (const o of list.objects) await env.BUCKET.delete(o.key);
    await saveKeys(env.BUCKET, { admin: "ADMIN", cards: { shangwu: "KSHANGWU" } });
  });

  it("rejects missing key", async () => {
    const res = await buildApp().request("/private", {}, env);
    expect(res.status).toBe(403);
  });

  it("accepts admin key", async () => {
    const res = await buildApp().request("/private?key=ADMIN", {}, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ role: "admin" });
  });

  it("accepts card key", async () => {
    const res = await buildApp().request("/private?key=KSHANGWU", {}, env);
    expect(await res.json()).toEqual({ role: "card", cardId: "shangwu" });
  });

  it("requireAdmin rejects card key", async () => {
    const res = await buildApp().request("/admin?key=KSHANGWU", {}, env);
    expect(res.status).toBe(403);
  });

  it("requireAdmin accepts admin", async () => {
    const res = await buildApp().request("/admin?key=ADMIN", {}, env);
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm run test -- auth`
Expected: FAIL

- [ ] **Step 3: 写实现**

```typescript
// src/middleware/auth.ts
import type { MiddlewareHandler } from "hono";
import type { Env, AuthContext } from "../types";
import { verifyKey } from "../utils/keys";

type Vars = { auth: AuthContext };

export const requireAuth: MiddlewareHandler<{ Bindings: Env; Variables: Vars }> = async (c, next) => {
  const key = c.req.query("key") ?? c.req.header("x-edit-key") ?? "";
  const auth = await verifyKey(c.env.BUCKET, key);
  if (!auth) return c.text("无权限", 403);
  c.set("auth", auth);
  await next();
};

export const requireAdmin: MiddlewareHandler<{ Bindings: Env; Variables: Vars }> = async (c, next) => {
  const auth = c.get("auth");
  if (!auth || auth.role !== "admin") return c.text("仅管理员可操作", 403);
  await next();
};

export function canEditCard(auth: AuthContext, cardId: string): boolean {
  return auth.role === "admin" || auth.cardId === cardId;
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm run test -- auth`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/middleware/auth.ts test/auth.test.ts
git commit -m "feat: add auth middleware"
```

---

## Task 8: HTML layout 模板

**Files:**
- Create: `src/templates/layout.ts`

- [ ] **Step 1: 写 layout 模板**

```typescript
// src/templates/layout.ts
import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";

const GLOBAL_CSS = `
:root {
  --bg: #F5F2EB;
  --fg: #2C2C2C;
  --muted: #6B6358;
  --accent: #4A5D3A;
  --line: #D4C9B8;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  background: var(--bg);
  color: var(--fg);
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  -webkit-font-smoothing: antialiased;
}
body { min-height: 100vh; }
a { color: var(--accent); text-decoration: none; }
button, input, textarea, select {
  font: inherit; color: inherit;
}
.serif { font-family: "Georgia", "Songti SC", serif; }
.feed {
  height: 100vh;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
}
.card {
  scroll-snap-align: start;
  height: 100vh;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  padding: 6vh 24px 4vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  animation: fadeUp 350ms ease-out;
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.card .logo {
  width: 96px; height: 96px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(74, 93, 58, 0.12);
  object-fit: cover;
  margin-bottom: 28px;
}
.card .brand {
  font-size: 32px;
  font-weight: 600;
  letter-spacing: 4px;
  margin-bottom: 6px;
}
.card .specialty {
  font-size: 14px;
  color: var(--muted);
  letter-spacing: 2px;
  margin-bottom: 24px;
}
.card .owner {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 20px;
}
.card .desc {
  font-style: italic;
  font-size: 15px;
  line-height: 1.8;
  color: var(--fg);
  max-width: 340px;
  margin-bottom: 28px;
  white-space: pre-wrap;
}
.card .desc::before { content: "“"; color: var(--line); margin-right: 4px; }
.card .desc::after { content: "”"; color: var(--line); margin-left: 4px; }
.card .products {
  display: flex; gap: 10px;
  overflow-x: auto;
  width: 100%;
  padding: 4px 4px 12px;
  scrollbar-width: none;
  margin-bottom: 20px;
}
.card .products::-webkit-scrollbar { display: none; }
.card .products img {
  width: 120px; height: 120px;
  object-fit: cover;
  border-radius: 10px;
  flex: 0 0 auto;
  background: #fff;
}
.card .links {
  display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;
  margin-bottom: 16px;
}
.card .links a {
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 13px;
  color: var(--accent);
}
.card .contact {
  font-size: 12px; color: var(--muted);
  letter-spacing: 1px;
  margin-bottom: 12px;
}
.card .hint {
  margin-top: auto;
  font-size: 11px;
  color: var(--line);
  letter-spacing: 4px;
}
.empty {
  height: 100vh; display: flex; align-items: center; justify-content: center;
  color: var(--muted);
}
.edit-wrap {
  max-width: 480px;
  margin: 0 auto;
  padding: 24px;
}
.edit-wrap h1 { font-size: 20px; margin-bottom: 18px; }
.edit-wrap label {
  display: block;
  font-size: 13px;
  color: var(--muted);
  margin: 14px 0 6px;
}
.edit-wrap input[type=text],
.edit-wrap input[type=url],
.edit-wrap textarea {
  width: 100%;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
}
.edit-wrap textarea { min-height: 100px; resize: vertical; }
.edit-wrap .row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.edit-wrap .row input { flex: 1; }
.edit-wrap button.primary {
  background: var(--accent);
  color: #fff;
  border: none;
  padding: 12px 18px;
  border-radius: 8px;
  font-size: 15px;
  margin-top: 22px;
  cursor: pointer;
}
.edit-wrap button.ghost {
  background: transparent;
  border: 1px solid var(--line);
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
.edit-wrap .preview-img {
  width: 80px; height: 80px; object-fit: cover; border-radius: 8px;
}
.edit-wrap .image-tile {
  display: inline-block; position: relative; margin: 4px;
}
.admin-list { list-style: none; }
.admin-list li {
  border-bottom: 1px solid var(--line);
  padding: 12px 0;
  display: flex; justify-content: space-between; align-items: center;
}
.admin-list .meta { font-size: 12px; color: var(--muted); }
`;

export function layout(title: string, body: HtmlEscapedString | string): HtmlEscapedString {
  return html`<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${title}</title>
<style>${raw(GLOBAL_CSS)}</style>
</head>
<body>
${body}
</body>
</html>`;
}
```

- [ ] **Step 2: 运行 typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/templates/layout.ts
git commit -m "feat: add HTML layout with natural-style CSS"
```

---

## Task 9: 卡片模板（TDD）

**Files:**
- Create: `src/templates/card.ts`
- Create: `test/card-template.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// test/card-template.test.ts
import { describe, it, expect } from "vitest";
import { renderCard } from "../src/templates/card";
import type { Card } from "../src/types";

const sample: Card = {
  id: "shangwu",
  brand: "晌午",
  owner: "张三",
  logo: "/images/shangwu/logo.png",
  specialty: "手工刀匠",
  description: "每一把刀都是与木头的一次对话",
  contact: { wechat: "wx", phone: "" },
  products: ["/images/shangwu/p1.jpg"],
  links: [{ label: "小红书", url: "https://xhs.com/x" }],
};

describe("renderCard", () => {
  it("includes brand and specialty", () => {
    const out = renderCard(sample).toString();
    expect(out).toContain("晌午");
    expect(out).toContain("手工刀匠");
    expect(out).toContain("张三");
  });

  it("includes product image", () => {
    expect(renderCard(sample).toString()).toContain("/images/shangwu/p1.jpg");
  });

  it("includes link", () => {
    const out = renderCard(sample).toString();
    expect(out).toContain("https://xhs.com/x");
    expect(out).toContain("小红书");
  });

  it("escapes XSS in brand", () => {
    const bad: Card = { ...sample, brand: "<script>x</script>" };
    const out = renderCard(bad).toString();
    expect(out).not.toContain("<script>x</script>");
    expect(out).toContain("&lt;script&gt;");
  });

  it("hides empty contact section", () => {
    const c: Card = { ...sample, contact: { wechat: "", phone: "" } };
    expect(renderCard(c).toString()).not.toContain("微信");
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm run test -- card-template`
Expected: FAIL

- [ ] **Step 3: 写实现**

```typescript
// src/templates/card.ts
import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { Card } from "../types";
import { escapeHtml } from "../utils/escape";

function renderProducts(products: string[]): HtmlEscapedString | string {
  if (!products.length) return "";
  const imgs = products
    .map((src) => `<img loading="lazy" src="${escapeHtml(src)}" alt="" />`)
    .join("");
  return html`<div class="products">${raw(imgs)}</div>`;
}

function renderLinks(links: Card["links"]): HtmlEscapedString | string {
  if (!links.length) return "";
  const items = links
    .map(
      (l) =>
        `<a href="${escapeHtml(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.label)}</a>`
    )
    .join("");
  return html`<div class="links">${raw(items)}</div>`;
}

function renderContact(contact: Card["contact"]): HtmlEscapedString | string {
  const parts: string[] = [];
  if (contact.wechat) parts.push(`微信：${escapeHtml(contact.wechat)}`);
  if (contact.phone) parts.push(`电话：${escapeHtml(contact.phone)}`);
  if (!parts.length) return "";
  return html`<div class="contact">${raw(parts.join("　·　"))}</div>`;
}

export function renderCard(card: Card): HtmlEscapedString {
  return html`<section class="card" data-id="${card.id}">
  <img class="logo" src="${card.logo || "/images/_placeholder/logo.png"}" alt="${escapeHtml(card.brand)} logo" />
  <h2 class="brand serif">${escapeHtml(card.brand)}</h2>
  <div class="specialty">${escapeHtml(card.specialty)}</div>
  ${card.owner ? html`<div class="owner">主理人 · ${escapeHtml(card.owner)}</div>` : ""}
  ${card.description ? html`<p class="desc">${escapeHtml(card.description)}</p>` : ""}
  ${renderProducts(card.products)}
  ${renderLinks(card.links)}
  ${renderContact(card.contact)}
  <div class="hint">向上滑动 · · ·</div>
</section>`;
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm run test -- card-template`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/templates/card.ts test/card-template.test.ts
git commit -m "feat: add card template with XSS-safe rendering"
```

---

## Task 10: 编辑表单模板

**Files:**
- Create: `src/templates/edit-form.ts`

- [ ] **Step 1: 写实现**

```typescript
// src/templates/edit-form.ts
import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { Card } from "../types";
import { escapeHtml } from "../utils/escape";

export function renderEditForm(card: Card, key: string, isAdmin: boolean): HtmlEscapedString {
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

  return html`<div class="edit-wrap">
  <h1>编辑卡片：${escapeHtml(card.brand || card.id)}</h1>
  <p style="font-size:12px;color:var(--muted)">
    ${isAdmin ? html`<a href="/edit?key=${escapeHtml(key)}">← 返回管理员列表</a>` : ""}
  </p>
  <form method="post" action="/edit/${encodeURIComponent(card.id)}?key=${encodeURIComponent(key)}" enctype="multipart/form-data">
    <label>品牌名</label>
    <input type="text" name="brand" value="${escapeHtml(card.brand)}" required />

    <label>主理人</label>
    <input type="text" name="owner" value="${escapeHtml(card.owner)}" />

    <label>擅长</label>
    <input type="text" name="specialty" value="${escapeHtml(card.specialty)}" />

    <label>产品特色</label>
    <textarea name="description">${escapeHtml(card.description)}</textarea>

    <label>Logo（jpg/png/webp，≤5MB）</label>
    ${card.logo ? html`<div><img class="preview-img" src="${card.logo}" /></div>` : ""}
    <input type="file" name="logo" accept="image/jpeg,image/png,image/webp" />

    <label>产品图</label>
    <div>${raw(productImgs)}</div>
    <input type="file" name="product" accept="image/jpeg,image/png,image/webp" multiple />

    <label>联系方式</label>
    <div class="row">
      <input type="text" name="wechat" placeholder="微信" value="${escapeHtml(card.contact.wechat ?? "")}" />
      <input type="text" name="phone" placeholder="电话" value="${escapeHtml(card.contact.phone ?? "")}" />
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
```

- [ ] **Step 2: 运行 typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/templates/edit-form.ts
git commit -m "feat: add edit form template"
```

---

## Task 11: 管理员列表模板

**Files:**
- Create: `src/templates/admin-list.ts`

- [ ] **Step 1: 写实现**

```typescript
// src/templates/admin-list.ts
import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { CardIndexEntry, Keys } from "../types";
import { escapeHtml } from "../utils/escape";

export function renderAdminList(
  index: CardIndexEntry[],
  keys: Keys,
  adminKey: string
): HtmlEscapedString {
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
```

- [ ] **Step 2: 运行 typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/templates/admin-list.ts
git commit -m "feat: add admin list template"
```

---

## Task 12: 卡片数据访问层（TDD）

**Files:**
- Create: `src/utils/cards.ts`
- Create: `test/cards.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// test/cards.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import {
  listIndex, getCard, putCard, deleteCard, upsertIndexEntry, removeIndexEntry,
} from "../src/utils/cards";
import type { Card } from "../src/types";

const blank: Card = {
  id: "x", brand: "X", owner: "", logo: "", specialty: "", description: "",
  contact: {}, products: [], links: [],
};

describe("cards data layer", () => {
  beforeEach(async () => {
    const list = await env.BUCKET.list();
    for (const o of list.objects) await env.BUCKET.delete(o.key);
  });

  it("listIndex returns empty when missing", async () => {
    expect(await listIndex(env.BUCKET)).toEqual([]);
  });

  it("putCard and getCard roundtrip", async () => {
    await putCard(env.BUCKET, { ...blank, id: "a", brand: "A" });
    const c = await getCard(env.BUCKET, "a");
    expect(c?.brand).toBe("A");
  });

  it("upsertIndexEntry adds and updates", async () => {
    await upsertIndexEntry(env.BUCKET, { id: "a", brand: "A", order: 1 });
    await upsertIndexEntry(env.BUCKET, { id: "b", brand: "B", order: 2 });
    await upsertIndexEntry(env.BUCKET, { id: "a", brand: "A2", order: 1 });
    const idx = await listIndex(env.BUCKET);
    expect(idx).toHaveLength(2);
    expect(idx.find((e) => e.id === "a")?.brand).toBe("A2");
  });

  it("removeIndexEntry drops the id", async () => {
    await upsertIndexEntry(env.BUCKET, { id: "a", brand: "A", order: 1 });
    await removeIndexEntry(env.BUCKET, "a");
    expect(await listIndex(env.BUCKET)).toEqual([]);
  });

  it("deleteCard removes card and index entry", async () => {
    await putCard(env.BUCKET, { ...blank, id: "a", brand: "A" });
    await upsertIndexEntry(env.BUCKET, { id: "a", brand: "A", order: 1 });
    await deleteCard(env.BUCKET, "a");
    expect(await getCard(env.BUCKET, "a")).toBeNull();
    expect(await listIndex(env.BUCKET)).toEqual([]);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm run test -- cards`
Expected: FAIL

- [ ] **Step 3: 写实现**

```typescript
// src/utils/cards.ts
import type { Card, CardIndexEntry } from "../types";
import { getJSON, putJSON, deleteObject, listPrefix } from "./r2";

const INDEX_PATH = "cards/index.json";
const cardPath = (id: string) => `cards/${id}.json`;

export async function listIndex(bucket: R2Bucket): Promise<CardIndexEntry[]> {
  return (await getJSON<CardIndexEntry[]>(bucket, INDEX_PATH)) ?? [];
}

export async function saveIndex(bucket: R2Bucket, entries: CardIndexEntry[]): Promise<void> {
  await putJSON(bucket, INDEX_PATH, entries);
}

export async function upsertIndexEntry(bucket: R2Bucket, entry: CardIndexEntry): Promise<void> {
  const idx = await listIndex(bucket);
  const i = idx.findIndex((e) => e.id === entry.id);
  if (i >= 0) idx[i] = entry;
  else idx.push(entry);
  await saveIndex(bucket, idx);
}

export async function removeIndexEntry(bucket: R2Bucket, id: string): Promise<void> {
  const idx = await listIndex(bucket);
  await saveIndex(bucket, idx.filter((e) => e.id !== id));
}

export async function getCard(bucket: R2Bucket, id: string): Promise<Card | null> {
  return await getJSON<Card>(bucket, cardPath(id));
}

export async function putCard(bucket: R2Bucket, card: Card): Promise<void> {
  await putJSON(bucket, cardPath(card.id), card);
}

export async function deleteCard(bucket: R2Bucket, id: string): Promise<void> {
  await deleteObject(bucket, cardPath(id));
  await removeIndexEntry(bucket, id);
  const imgs = await listPrefix(bucket, `images/${id}/`);
  for (const k of imgs) await deleteObject(bucket, k);
}

export async function loadAllCards(bucket: R2Bucket): Promise<Card[]> {
  const idx = await listIndex(bucket);
  const sorted = [...idx].sort((a, b) => a.order - b.order);
  const cards: Card[] = [];
  for (const e of sorted) {
    const c = await getCard(bucket, e.id);
    if (c) cards.push(c);
  }
  return cards;
}

export function emptyCard(id: string, brand: string): Card {
  return {
    id, brand, owner: "", logo: "", specialty: "", description: "",
    contact: {}, products: [], links: [],
  };
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm run test -- cards`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/cards.ts test/cards.test.ts
git commit -m "feat: add card data access layer"
```

---

## Task 13: pages 路由（前端展示）

**Files:**
- Create: `src/routes/pages.ts`
- Create: `test/pages.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// test/pages.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { Hono } from "hono";
import { mountPages } from "../src/routes/pages";
import { putCard, upsertIndexEntry } from "../src/utils/cards";
import { putImage } from "../src/utils/r2";
import type { Env } from "../src/types";

function buildApp() {
  const app = new Hono<{ Bindings: Env }>();
  mountPages(app);
  return app;
}

describe("pages routes", () => {
  beforeEach(async () => {
    const list = await env.BUCKET.list();
    for (const o of list.objects) await env.BUCKET.delete(o.key);
  });

  it("GET / returns empty state when no cards", async () => {
    const res = await buildApp().request("/", {}, env);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("还没有卡片");
  });

  it("GET / lists cards by order", async () => {
    await putCard(env.BUCKET, {
      id: "a", brand: "A", owner: "", logo: "", specialty: "S",
      description: "", contact: {}, products: [], links: [],
    });
    await upsertIndexEntry(env.BUCKET, { id: "a", brand: "A", order: 1 });
    const res = await buildApp().request("/", {}, env);
    const body = await res.text();
    expect(body).toContain("A");
    expect(body).toContain("S");
  });

  it("GET /card/:id returns single card page", async () => {
    await putCard(env.BUCKET, {
      id: "shangwu", brand: "晌午", owner: "", logo: "", specialty: "刀匠",
      description: "", contact: {}, products: [], links: [],
    });
    await upsertIndexEntry(env.BUCKET, { id: "shangwu", brand: "晌午", order: 1 });
    const res = await buildApp().request("/card/shangwu", {}, env);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("晌午");
  });

  it("GET /card/:id returns 404 for unknown", async () => {
    const res = await buildApp().request("/card/none", {}, env);
    expect(res.status).toBe(404);
  });

  it("GET /images/:id/:filename returns binary", async () => {
    const data = new Uint8Array([1, 2, 3, 4]);
    await putImage(env.BUCKET, "images/x/y.png", data.buffer, "image/png");
    const res = await buildApp().request("/images/x/y.png", {}, env);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("image/png");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(data);
  });

  it("GET /images/:id/:filename 404 when missing", async () => {
    const res = await buildApp().request("/images/x/none.png", {}, env);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm run test -- pages`
Expected: FAIL

- [ ] **Step 3: 写实现**

```typescript
// src/routes/pages.ts
import { Hono } from "hono";
import { html, raw } from "hono/html";
import type { Env } from "../types";
import { layout } from "../templates/layout";
import { renderCard } from "../templates/card";
import { getCard, loadAllCards } from "../utils/cards";
import { getImage } from "../utils/r2";

export function mountPages(app: Hono<{ Bindings: Env }>): void {
  app.get("/", async (c) => {
    const cards = await loadAllCards(c.env.BUCKET);
    const body =
      cards.length === 0
        ? html`<div class="empty">还没有卡片</div>`
        : html`<main class="feed">${raw(cards.map((c) => renderCard(c).toString()).join(""))}</main>`;
    return c.html(layout("中国 Bushcraft 工匠展", body));
  });

  app.get("/card/:id", async (c) => {
    const card = await getCard(c.env.BUCKET, c.req.param("id"));
    if (!card) return c.text("卡片不存在", 404);
    const body = html`<main class="feed">${renderCard(card)}</main>`;
    return c.html(layout(`${card.brand} · Bushcraft`, body));
  });

  app.get("/images/:id/:filename", async (c) => {
    const id = c.req.param("id");
    const filename = c.req.param("filename");
    const obj = await getImage(c.env.BUCKET, `images/${id}/${filename}`);
    if (!obj) return c.text("not found", 404);
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set("etag", obj.httpEtag);
    if (!headers.has("cache-control")) headers.set("cache-control", "public, max-age=86400");
    return new Response(obj.body, { headers });
  });
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm run test -- pages`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/routes/pages.ts test/pages.test.ts
git commit -m "feat: add public pages routes"
```

---

## Task 14: edit 路由 GET（显示表单与管理员列表）

**Files:**
- Create: `src/routes/edit.ts`
- Create: `test/edit-get.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// test/edit-get.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { Hono } from "hono";
import { mountEdit } from "../src/routes/edit";
import { putCard, upsertIndexEntry } from "../src/utils/cards";
import { saveKeys } from "../src/utils/keys";
import type { Env, AuthContext } from "../src/types";

type Vars = { auth: AuthContext };

function app() {
  const a = new Hono<{ Bindings: Env; Variables: Vars }>();
  mountEdit(a);
  return a;
}

describe("edit GET", () => {
  beforeEach(async () => {
    const list = await env.BUCKET.list();
    for (const o of list.objects) await env.BUCKET.delete(o.key);
    await saveKeys(env.BUCKET, { admin: "ADMIN", cards: { shangwu: "KSHANGWU" } });
    await putCard(env.BUCKET, {
      id: "shangwu", brand: "晌午", owner: "", logo: "", specialty: "刀匠",
      description: "", contact: {}, products: [], links: [],
    });
    await upsertIndexEntry(env.BUCKET, { id: "shangwu", brand: "晌午", order: 1 });
  });

  it("/edit without key returns 403", async () => {
    const res = await app().request("/edit", {}, env);
    expect(res.status).toBe(403);
  });

  it("/edit?key=ADMIN shows admin list", async () => {
    const res = await app().request("/edit?key=ADMIN", {}, env);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("管理员后台");
    expect(body).toContain("晌午");
  });

  it("/edit?key=KSHANGWU redirects to that card's edit form", async () => {
    const res = await app().request("/edit?key=KSHANGWU", {}, env);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("编辑卡片");
  });

  it("/edit/shangwu?key=KSHANGWU shows form", async () => {
    const res = await app().request("/edit/shangwu?key=KSHANGWU", {}, env);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("品牌名");
  });

  it("/edit/other?key=KSHANGWU returns 403", async () => {
    await putCard(env.BUCKET, {
      id: "other", brand: "O", owner: "", logo: "", specialty: "",
      description: "", contact: {}, products: [], links: [],
    });
    const res = await app().request("/edit/other?key=KSHANGWU", {}, env);
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm run test -- edit-get`
Expected: FAIL

- [ ] **Step 3: 写 edit 路由 GET 部分**

```typescript
// src/routes/edit.ts
import { Hono } from "hono";
import type { Env, AuthContext } from "../types";
import { requireAuth, canEditCard } from "../middleware/auth";
import { layout } from "../templates/layout";
import { renderEditForm } from "../templates/edit-form";
import { renderAdminList } from "../templates/admin-list";
import { getCard, listIndex, emptyCard } from "../utils/cards";
import { loadKeys } from "../utils/keys";

type Vars = { auth: AuthContext };

export function mountEdit(app: Hono<{ Bindings: Env; Variables: Vars }>): void {
  app.get("/edit", requireAuth, async (c) => {
    const auth = c.get("auth");
    const key = c.req.query("key") ?? "";
    if (auth.role === "admin") {
      const idx = await listIndex(c.env.BUCKET);
      const keys = await loadKeys(c.env.BUCKET);
      return c.html(layout("管理员后台", renderAdminList(idx, keys, key)));
    }
    const card = await getCard(c.env.BUCKET, auth.cardId!);
    if (!card) return c.text("卡片不存在", 404);
    return c.html(layout(`编辑：${card.brand}`, renderEditForm(card, key, false)));
  });

  app.get("/edit/:id", requireAuth, async (c) => {
    const auth = c.get("auth");
    const id = c.req.param("id");
    const key = c.req.query("key") ?? "";
    if (!canEditCard(auth, id)) return c.text("无权限", 403);
    let card = await getCard(c.env.BUCKET, id);
    if (!card) card = emptyCard(id, "");
    return c.html(layout(`编辑：${card.brand || id}`, renderEditForm(card, key, auth.role === "admin")));
  });

  // POST handlers added in Task 15
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm run test -- edit-get`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/routes/edit.ts test/edit-get.test.ts
git commit -m "feat: add edit GET routes"
```

---

## Task 15: edit 路由 POST（保存表单 + 图片上传）

**Files:**
- Modify: `src/routes/edit.ts`
- Create: `test/edit-post.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// test/edit-post.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { Hono } from "hono";
import { mountEdit } from "../src/routes/edit";
import { putCard, upsertIndexEntry, getCard } from "../src/utils/cards";
import { saveKeys } from "../src/utils/keys";
import type { Env, AuthContext } from "../src/types";

type Vars = { auth: AuthContext };

function app() {
  const a = new Hono<{ Bindings: Env; Variables: Vars }>();
  mountEdit(a);
  return a;
}

function formData(fields: Record<string, string | Blob | undefined>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    fd.append(k, v as any);
  }
  return fd;
}

describe("edit POST", () => {
  beforeEach(async () => {
    const list = await env.BUCKET.list();
    for (const o of list.objects) await env.BUCKET.delete(o.key);
    await saveKeys(env.BUCKET, { admin: "ADMIN", cards: { shangwu: "KSHANGWU" } });
    await putCard(env.BUCKET, {
      id: "shangwu", brand: "晌午", owner: "", logo: "", specialty: "刀匠",
      description: "", contact: {}, products: [], links: [],
    });
    await upsertIndexEntry(env.BUCKET, { id: "shangwu", brand: "晌午", order: 1 });
  });

  it("saves text fields", async () => {
    const fd = formData({
      action: "save",
      brand: "晌午v2",
      owner: "张三",
      specialty: "刀匠",
      description: "描述",
      wechat: "wxid",
      phone: "",
      link_label_new: "小红书",
      link_url_new: "https://xhs.com/x",
    });
    const res = await app().request(
      "/edit/shangwu?key=KSHANGWU",
      { method: "POST", body: fd },
      env
    );
    expect(res.status).toBe(303);
    const card = await getCard(env.BUCKET, "shangwu");
    expect(card?.brand).toBe("晌午v2");
    expect(card?.owner).toBe("张三");
    expect(card?.contact.wechat).toBe("wxid");
    expect(card?.links).toEqual([{ label: "小红书", url: "https://xhs.com/x" }]);
  });

  it("uploads logo image", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const file = new File([png], "logo.png", { type: "image/png" });
    const fd = formData({ action: "save", brand: "晌午", logo: file });
    const res = await app().request(
      "/edit/shangwu?key=KSHANGWU",
      { method: "POST", body: fd },
      env
    );
    expect(res.status).toBe(303);
    const card = await getCard(env.BUCKET, "shangwu");
    expect(card?.logo).toMatch(/^\/images\/shangwu\/logo\./);
    const stored = await env.BUCKET.get(card!.logo.slice(1));
    expect(stored).not.toBeNull();
  });

  it("rejects oversized image", async () => {
    const big = new Uint8Array(6 * 1024 * 1024);
    const file = new File([big], "x.png", { type: "image/png" });
    const fd = formData({ action: "save", brand: "晌午", logo: file });
    const res = await app().request(
      "/edit/shangwu?key=KSHANGWU",
      { method: "POST", body: fd },
      env
    );
    expect(res.status).toBe(400);
  });

  it("rejects non-image upload", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "x.exe", { type: "application/octet-stream" });
    const fd = formData({ action: "save", brand: "晌午", logo: file });
    const res = await app().request(
      "/edit/shangwu?key=KSHANGWU",
      { method: "POST", body: fd },
      env
    );
    expect(res.status).toBe(400);
  });

  it("rejects POST from foreign card key", async () => {
    await putCard(env.BUCKET, {
      id: "other", brand: "O", owner: "", logo: "", specialty: "",
      description: "", contact: {}, products: [], links: [],
    });
    const fd = formData({ action: "save", brand: "hack" });
    const res = await app().request("/edit/other?key=KSHANGWU", { method: "POST", body: fd }, env);
    expect(res.status).toBe(403);
  });

  it("deletes a product via del-product action", async () => {
    const card = await getCard(env.BUCKET, "shangwu");
    card!.products = ["/images/shangwu/p1.jpg"];
    await putCard(env.BUCKET, card!);
    await env.BUCKET.put("images/shangwu/p1.jpg", new Uint8Array([1]));
    const fd = formData({ action: "del-product:/images/shangwu/p1.jpg", brand: "晌午" });
    const res = await app().request("/edit/shangwu?key=KSHANGWU", { method: "POST", body: fd }, env);
    expect(res.status).toBe(303);
    const updated = await getCard(env.BUCKET, "shangwu");
    expect(updated?.products).toEqual([]);
    expect(await env.BUCKET.get("images/shangwu/p1.jpg")).toBeNull();
  });

  it("admin can create new card via /edit/_new", async () => {
    const fd = formData({ new_id: "newone", new_brand: "新品" });
    const res = await app().request("/edit/_new?key=ADMIN", { method: "POST", body: fd }, env);
    expect(res.status).toBe(303);
    const card = await getCard(env.BUCKET, "newone");
    expect(card?.brand).toBe("新品");
  });

  it("non-admin cannot use /edit/_new", async () => {
    const fd = formData({ new_id: "x", new_brand: "y" });
    const res = await app().request("/edit/_new?key=KSHANGWU", { method: "POST", body: fd }, env);
    expect(res.status).toBe(403);
  });

  it("admin can delete and reset via /edit/_admin", async () => {
    let res = await app().request(
      "/edit/_admin?key=ADMIN",
      { method: "POST", body: formData({ action: "reset-key", reset_id: "shangwu" }) },
      env
    );
    expect(res.status).toBe(303);
    res = await app().request(
      "/edit/_admin?key=ADMIN",
      { method: "POST", body: formData({ action: "delete", del_id: "shangwu" }) },
      env
    );
    expect(res.status).toBe(303);
    expect(await getCard(env.BUCKET, "shangwu")).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm run test -- edit-post`
Expected: FAIL

- [ ] **Step 3: 扩展 edit.ts，添加 POST 处理**

```typescript
// 追加到 src/routes/edit.ts 末尾（mountEdit 内部）
// 完整文件覆盖如下：

import { Hono } from "hono";
import type { Env, AuthContext, Card } from "../types";
import { requireAuth, requireAdmin, canEditCard } from "../middleware/auth";
import { layout } from "../templates/layout";
import { renderEditForm } from "../templates/edit-form";
import { renderAdminList } from "../templates/admin-list";
import {
  getCard, listIndex, emptyCard, putCard, deleteCard, upsertIndexEntry,
} from "../utils/cards";
import { loadKeys, saveKeys, generateKey } from "../utils/keys";
import { putImage, deleteObject } from "../utils/r2";

type Vars = { auth: AuthContext };

const ALLOWED_IMG_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMG_BYTES = 5 * 1024 * 1024;

function extFromType(type: string): string {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "bin";
}

async function processImage(
  bucket: R2Bucket,
  cardId: string,
  field: FormDataEntryValue | null,
  baseName: string
): Promise<string | null> {
  if (!(field instanceof File) || field.size === 0) return null;
  if (!ALLOWED_IMG_TYPES.has(field.type)) {
    throw new HttpError(400, "不支持的图片格式");
  }
  if (field.size > MAX_IMG_BYTES) {
    throw new HttpError(400, "图片大于 5MB");
  }
  const ext = extFromType(field.type);
  const key = `images/${cardId}/${baseName}-${Date.now()}.${ext}`;
  await putImage(bucket, key, await field.arrayBuffer(), field.type);
  return `/${key}`;
}

class HttpError extends Error {
  constructor(public status: number, msg: string) {
    super(msg);
  }
}

export function mountEdit(app: Hono<{ Bindings: Env; Variables: Vars }>): void {
  app.get("/edit", requireAuth, async (c) => {
    const auth = c.get("auth");
    const key = c.req.query("key") ?? "";
    if (auth.role === "admin") {
      const idx = await listIndex(c.env.BUCKET);
      const keys = await loadKeys(c.env.BUCKET);
      return c.html(layout("管理员后台", renderAdminList(idx, keys, key)));
    }
    const card = await getCard(c.env.BUCKET, auth.cardId!);
    if (!card) return c.text("卡片不存在", 404);
    return c.html(layout(`编辑：${card.brand}`, renderEditForm(card, key, false)));
  });

  app.get("/edit/:id", requireAuth, async (c) => {
    const auth = c.get("auth");
    const id = c.req.param("id");
    const key = c.req.query("key") ?? "";
    if (!canEditCard(auth, id)) return c.text("无权限", 403);
    let card = await getCard(c.env.BUCKET, id);
    if (!card) card = emptyCard(id, "");
    return c.html(layout(`编辑：${card.brand || id}`, renderEditForm(card, key, auth.role === "admin")));
  });

  app.post("/edit/_new", requireAuth, requireAdmin, async (c) => {
    const fd = await c.req.formData();
    const newId = String(fd.get("new_id") ?? "").trim();
    const newBrand = String(fd.get("new_brand") ?? "").trim();
    const key = c.req.query("key") ?? "";
    if (!/^[a-z0-9-]+$/.test(newId)) return c.text("非法 id", 400);
    if (!newBrand) return c.text("品牌名必填", 400);
    if (await getCard(c.env.BUCKET, newId)) return c.text("id 已存在", 400);
    const card = emptyCard(newId, newBrand);
    await putCard(c.env.BUCKET, card);
    const idx = await listIndex(c.env.BUCKET);
    const order = idx.length + 1;
    await upsertIndexEntry(c.env.BUCKET, { id: newId, brand: newBrand, order });
    const keys = await loadKeys(c.env.BUCKET);
    keys.cards[newId] = generateKey();
    await saveKeys(c.env.BUCKET, keys);
    return c.redirect(`/edit?key=${encodeURIComponent(key)}`, 303);
  });

  app.post("/edit/_admin", requireAuth, requireAdmin, async (c) => {
    const fd = await c.req.formData();
    const action = String(fd.get("action") ?? "");
    const key = c.req.query("key") ?? "";
    if (action === "delete") {
      const id = String(fd.get("del_id") ?? "").trim();
      if (id) {
        await deleteCard(c.env.BUCKET, id);
        const keys = await loadKeys(c.env.BUCKET);
        delete keys.cards[id];
        await saveKeys(c.env.BUCKET, keys);
      }
    } else if (action === "reset-key") {
      const id = String(fd.get("reset_id") ?? "").trim();
      if (id && (await getCard(c.env.BUCKET, id))) {
        const keys = await loadKeys(c.env.BUCKET);
        keys.cards[id] = generateKey();
        await saveKeys(c.env.BUCKET, keys);
      }
    }
    return c.redirect(`/edit?key=${encodeURIComponent(key)}`, 303);
  });

  app.post("/edit/:id", requireAuth, async (c) => {
    const auth = c.get("auth");
    const id = c.req.param("id");
    const key = c.req.query("key") ?? "";
    if (!canEditCard(auth, id)) return c.text("无权限", 403);

    let card = await getCard(c.env.BUCKET, id);
    if (!card) card = emptyCard(id, "");

    const fd = await c.req.formData();
    const action = String(fd.get("action") ?? "save");

    if (action.startsWith("del-product:")) {
      const target = action.slice("del-product:".length);
      card.products = card.products.filter((p) => p !== target);
      if (target.startsWith("/")) {
        await deleteObject(c.env.BUCKET, target.slice(1));
      }
      await putCard(c.env.BUCKET, card);
      return c.redirect(`/edit/${encodeURIComponent(id)}?key=${encodeURIComponent(key)}`, 303);
    }

    card.brand = String(fd.get("brand") ?? card.brand).trim();
    card.owner = String(fd.get("owner") ?? "").trim();
    card.specialty = String(fd.get("specialty") ?? "").trim();
    card.description = String(fd.get("description") ?? "").trim();
    card.contact = {
      wechat: String(fd.get("wechat") ?? "").trim() || undefined,
      phone: String(fd.get("phone") ?? "").trim() || undefined,
    };

    const links: Card["links"] = [];
    for (const [k, v] of fd.entries()) {
      const m = k.match(/^link_label_(.+)$/);
      if (!m) continue;
      const suffix = m[1];
      const label = String(v).trim();
      const url = String(fd.get(`link_url_${suffix}`) ?? "").trim();
      if (label && url) links.push({ label, url });
    }
    card.links = links;

    try {
      const logoPath = await processImage(c.env.BUCKET, id, fd.get("logo"), "logo");
      if (logoPath) {
        if (card.logo && card.logo.startsWith("/images/")) {
          await deleteObject(c.env.BUCKET, card.logo.slice(1));
        }
        card.logo = logoPath;
      }
      const productFiles = fd.getAll("product");
      let i = 0;
      for (const f of productFiles) {
        const path = await processImage(c.env.BUCKET, id, f, `product-${i++}`);
        if (path) card.products.push(path);
      }
    } catch (err) {
      if (err instanceof HttpError) return c.text(err.message, err.status);
      throw err;
    }

    await putCard(c.env.BUCKET, card);
    const idx = await listIndex(c.env.BUCKET);
    const existing = idx.find((e) => e.id === id);
    await upsertIndexEntry(c.env.BUCKET, {
      id, brand: card.brand,
      order: existing?.order ?? idx.length + 1,
    });

    return c.redirect(`/edit/${encodeURIComponent(id)}?key=${encodeURIComponent(key)}`, 303);
  });
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm run test -- edit-post`
Expected: PASS

- [ ] **Step 5: 运行 typecheck 与全部测试**

Run: `npm run typecheck && npm run test`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add src/routes/edit.ts test/edit-post.test.ts
git commit -m "feat: add edit POST handlers with image upload"
```

---

## Task 16: JSON API 路由

**Files:**
- Create: `src/routes/api.ts`
- Create: `test/api.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// test/api.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { Hono } from "hono";
import { mountApi } from "../src/routes/api";
import { putCard, upsertIndexEntry, getCard } from "../src/utils/cards";
import { saveKeys } from "../src/utils/keys";
import type { Env, AuthContext } from "../src/types";

type Vars = { auth: AuthContext };

function app() {
  const a = new Hono<{ Bindings: Env; Variables: Vars }>();
  mountApi(a);
  return a;
}

describe("api routes", () => {
  beforeEach(async () => {
    const list = await env.BUCKET.list();
    for (const o of list.objects) await env.BUCKET.delete(o.key);
    await saveKeys(env.BUCKET, { admin: "ADMIN", cards: { shangwu: "KSHANGWU" } });
    await putCard(env.BUCKET, {
      id: "shangwu", brand: "晌午", owner: "", logo: "", specialty: "刀匠",
      description: "", contact: {}, products: [], links: [],
    });
    await upsertIndexEntry(env.BUCKET, { id: "shangwu", brand: "晌午", order: 1 });
  });

  it("GET /api/cards returns index publicly", async () => {
    const res = await app().request("/api/cards", {}, env);
    expect(res.status).toBe(200);
    const body = await res.json<any>();
    expect(body).toEqual([{ id: "shangwu", brand: "晌午", order: 1 }]);
  });

  it("GET /api/card/:id returns card", async () => {
    const res = await app().request("/api/card/shangwu", {}, env);
    expect(res.status).toBe(200);
    expect((await res.json<any>()).brand).toBe("晌午");
  });

  it("POST /api/card/:id without key fails", async () => {
    const res = await app().request("/api/card/shangwu", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ brand: "hacked" }),
    }, env);
    expect(res.status).toBe(403);
  });

  it("POST /api/card/:id with card key updates", async () => {
    const res = await app().request("/api/card/shangwu?key=KSHANGWU", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ brand: "晌午v3", specialty: "x" }),
    }, env);
    expect(res.status).toBe(200);
    expect((await getCard(env.BUCKET, "shangwu"))?.brand).toBe("晌午v3");
  });

  it("POST /api/cards admin-only creates card", async () => {
    const res = await app().request("/api/cards?key=ADMIN", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "newone", brand: "新" }),
    }, env);
    expect(res.status).toBe(200);
    const body = await res.json<any>();
    expect(body.key).toMatch(/^[a-f0-9]{32}$/);
  });

  it("DELETE /api/card/:id admin-only", async () => {
    const res = await app().request("/api/card/shangwu?key=KSHANGWU", { method: "DELETE" }, env);
    expect(res.status).toBe(403);
    const res2 = await app().request("/api/card/shangwu?key=ADMIN", { method: "DELETE" }, env);
    expect(res2.status).toBe(200);
    expect(await getCard(env.BUCKET, "shangwu")).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm run test -- api`
Expected: FAIL

- [ ] **Step 3: 写实现**

```typescript
// src/routes/api.ts
import { Hono } from "hono";
import type { Env, AuthContext, Card } from "../types";
import { requireAuth, requireAdmin, canEditCard } from "../middleware/auth";
import {
  listIndex, getCard, putCard, deleteCard, upsertIndexEntry, emptyCard,
} from "../utils/cards";
import { loadKeys, saveKeys, generateKey } from "../utils/keys";

type Vars = { auth: AuthContext };

export function mountApi(app: Hono<{ Bindings: Env; Variables: Vars }>): void {
  app.get("/api/cards", async (c) => c.json(await listIndex(c.env.BUCKET)));

  app.get("/api/card/:id", async (c) => {
    const card = await getCard(c.env.BUCKET, c.req.param("id"));
    if (!card) return c.text("not found", 404);
    return c.json(card);
  });

  app.post("/api/card/:id", requireAuth, async (c) => {
    const id = c.req.param("id");
    if (!canEditCard(c.get("auth"), id)) return c.text("无权限", 403);
    const patch = (await c.req.json()) as Partial<Card>;
    const current = (await getCard(c.env.BUCKET, id)) ?? emptyCard(id, patch.brand ?? "");
    const merged: Card = { ...current, ...patch, id };
    await putCard(c.env.BUCKET, merged);
    const idx = await listIndex(c.env.BUCKET);
    const existing = idx.find((e) => e.id === id);
    await upsertIndexEntry(c.env.BUCKET, {
      id, brand: merged.brand,
      order: existing?.order ?? idx.length + 1,
    });
    return c.json(merged);
  });

  app.post("/api/cards", requireAuth, requireAdmin, async (c) => {
    const body = (await c.req.json()) as { id?: string; brand?: string };
    const id = (body.id ?? "").trim();
    const brand = (body.brand ?? "").trim();
    if (!/^[a-z0-9-]+$/.test(id)) return c.text("非法 id", 400);
    if (!brand) return c.text("品牌名必填", 400);
    if (await getCard(c.env.BUCKET, id)) return c.text("id 已存在", 400);
    const card = emptyCard(id, brand);
    await putCard(c.env.BUCKET, card);
    const idx = await listIndex(c.env.BUCKET);
    await upsertIndexEntry(c.env.BUCKET, { id, brand, order: idx.length + 1 });
    const keys = await loadKeys(c.env.BUCKET);
    const newKey = generateKey();
    keys.cards[id] = newKey;
    await saveKeys(c.env.BUCKET, keys);
    return c.json({ card, key: newKey });
  });

  app.delete("/api/card/:id", requireAuth, requireAdmin, async (c) => {
    const id = c.req.param("id");
    await deleteCard(c.env.BUCKET, id);
    const keys = await loadKeys(c.env.BUCKET);
    delete keys.cards[id];
    await saveKeys(c.env.BUCKET, keys);
    return c.json({ ok: true });
  });
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm run test -- api`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/routes/api.ts test/api.test.ts
git commit -m "feat: add JSON API routes"
```

---

## Task 17: 应用入口

**Files:**
- Create: `src/index.ts`
- Create: `test/index.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// test/index.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";
import { saveKeys } from "../src/utils/keys";

describe("app entrypoint", () => {
  beforeEach(async () => {
    const list = await env.BUCKET.list();
    for (const o of list.objects) await env.BUCKET.delete(o.key);
  });

  it("serves /", async () => {
    const res = await app.request("/", {}, env);
    expect(res.status).toBe(200);
  });

  it("serves /api/cards", async () => {
    const res = await app.request("/api/cards", {}, env);
    expect(res.status).toBe(200);
  });

  it("/edit requires key", async () => {
    await saveKeys(env.BUCKET, { admin: "A", cards: {} });
    const res = await app.request("/edit", {}, env);
    expect(res.status).toBe(403);
  });

  it("returns 404 for unknown", async () => {
    const res = await app.request("/nope", {}, env);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm run test -- "test/index"`
Expected: FAIL

- [ ] **Step 3: 写实现**

```typescript
// src/index.ts
import { Hono } from "hono";
import type { Env, AuthContext } from "./types";
import { mountPages } from "./routes/pages";
import { mountEdit } from "./routes/edit";
import { mountApi } from "./routes/api";

type Vars = { auth: AuthContext };

const app = new Hono<{ Bindings: Env; Variables: Vars }>();

app.onError((err, c) => {
  console.error(err);
  return c.text("服务异常，请稍后再试", 500);
});

app.notFound((c) => c.text("not found", 404));

mountPages(app);
mountEdit(app);
mountApi(app);

export default app;
```

- [ ] **Step 4: 运行测试与 typecheck**

Run: `npm run typecheck && npm run test`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/index.ts test/index.test.ts
git commit -m "feat: wire all routes in app entrypoint"
```

---

## Task 18: 部署文档（README）

**Files:**
- Create: `README.md`

- [ ] **Step 1: 写 README**

````markdown
# Bushcraft 工匠展览

部署在 Cloudflare Workers + R2 的轻量展览网站。

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

然后访问 `https://<your-worker>.workers.dev/edit?key=你的32位随机key` 进入管理后台。

## 测试

```bash
npm run test
npm run typecheck
```
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README"
```

---

## Task 19: 端到端验证

- [ ] **Step 1: 运行全部测试**

Run: `npm run test`
Expected: ALL PASS

- [ ] **Step 2: 运行 typecheck**

Run: `npm run typecheck`
Expected: 退出码 0

- [ ] **Step 3: 启动本地 dev server**

Run: `npm run dev`（手动验证 / 页面渲染）

预期：终端打印本地 URL，浏览器访问可见"还没有卡片"。

按 Ctrl+C 停止。

- [ ] **Step 4: 最终 commit（如有改动）**

```bash
git status
# 如果有未提交改动，commit；否则跳过
```

---

## Self-Review

**Spec coverage 检查（对照 spec 各章节）：**

- 技术栈：Task 1 安装依赖 ✓
- 项目结构：Tasks 4-17 创建对应文件 ✓
- R2 存储结构：Tasks 5, 12（cards/index.json, cards/{id}.json, keys.json, images/{id}/*） ✓
- 卡片数据结构：Task 2 类型 + Task 12 数据层 ✓
- 页面路由 GET /、/card/:id、/images/:id/:filename：Task 13 ✓
- 编辑路由 GET /edit、POST /edit/:id：Tasks 14, 15 ✓
- API 路由（GET /api/cards、GET /api/card/:id、POST /api/card/:id、POST /api/cards、DELETE /api/card/:id）：Task 16 ✓
- 注：spec 中 `POST /api/card/:id/image` 与 `DELETE /api/card/:id/image/:name` 因表单编辑路由已覆盖图片上传/删除场景，未在 JSON API 中重复实现。如未来需要可单独追加。
- 认证机制（key/admin/无效 403）：Tasks 6, 7 ✓
- 视觉设计（色调、字体、卡片布局、动效、响应式）：Task 8 layout CSS + Task 9 card 模板 ✓
- 编辑页面（字段、管理员功能）：Tasks 10, 11, 14, 15 ✓
- 安全（5MB、image 类型白名单、HTML 转义、keys.json 不公开）：Tasks 4, 7, 15 ✓
- 部署（wrangler.toml、初始化）：Tasks 1, 18 ✓
- 规模：每页一次加载全部 + 图片 lazy loading ✓

**Placeholder scan：** 无 TBD/TODO；每个含代码改动的 step 都给出完整代码。

**Type consistency：** Card / CardIndexEntry / Keys / AuthContext / Env 在 Task 2 定义后被 Tasks 5-17 一致使用；方法签名（getJSON、putJSON、verifyKey、canEditCard、mountPages/mountEdit/mountApi）跨任务一致。

**API/edit 路由命名注意点：** `/edit/_new` 和 `/edit/_admin` 用下划线前缀避免与卡片 id（限 `[a-z0-9-]+`）冲突，符合 spec id 约束。
