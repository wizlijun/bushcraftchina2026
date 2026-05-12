import { Hono } from "hono";
import type { AppEnv, Card } from "../types";
import { requireAuth, requireAdmin, canEditCard } from "../middleware/auth";
import { layout } from "../templates/layout";
import { renderEditForm } from "../templates/edit-form";
import { renderAdminList } from "../templates/admin-list";
import {
  getCard, listIndex, emptyCard, putCard, deleteCard, upsertIndexEntry,
} from "../utils/cards";
import { loadKeys, saveKeys, generateKey } from "../utils/keys";
import { putImage, deleteObject } from "../utils/r2";

const ALLOWED_IMG_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMG_BYTES = 5 * 1024 * 1024;

class HttpError extends Error {
  constructor(public status: number, msg: string) {
    super(msg);
  }
}

function extFromType(type: string): string {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "bin";
}

async function processImage(
  bucket: R2Bucket,
  cardId: string,
  field: unknown,
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

export function mountEdit(app: Hono<AppEnv>): void {
  app.get("/edit", requireAuth, async (c) => {
    const auth = c.get("auth")!;
    const key = c.req.query("key") ?? "";
    if (auth.role === "admin") {
      const idx = await listIndex(c.env.BUCKET);
      const keys = await loadKeys(c.env.BUCKET);
      return c.html(layout("管理员后台", await renderAdminList(idx, keys, key)));
    }
    const card = await getCard(c.env.BUCKET, auth.cardId!);
    if (!card) return c.text("卡片不存在", 404);
    return c.html(layout(`编辑：${card.brand}`, await renderEditForm(card, key, false)));
  });

  app.get("/edit/:id", requireAuth, async (c) => {
    const auth = c.get("auth")!;
    const id = c.req.param("id");
    const key = c.req.query("key") ?? "";
    if (!canEditCard(auth, id)) return c.text("无权限", 403);
    let card = await getCard(c.env.BUCKET, id);
    if (!card) card = emptyCard(id, "");
    return c.html(
      layout(`编辑：${card.brand || id}`, await renderEditForm(card, key, auth.role === "admin"))
    );
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
    const auth = c.get("auth")!;
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
      if (err instanceof HttpError) return c.text(err.message, err.status as 400);
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
