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
import { loadVoiceIndex } from "../utils/voices";

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
    throw new HttpError(400, "we only welcome jpg, png or webp");
  }
  if (field.size > MAX_IMG_BYTES) {
    throw new HttpError(400, "that image is rather large — 5MB at most, please");
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
      const counts: Record<string, number> = {};
      const likeCounts: Record<string, number> = {};
      await Promise.all(
        idx.map(async (e) => {
          const card = await getCard(c.env.BUCKET, e.id);
          counts[e.id] = card?.voice_count ?? 0;
          likeCounts[e.id] = card?.like_count ?? 0;
        })
      );
      return c.html(layout({ title: "Admin Desk", noindex: true }, await renderAdminList(idx, keys, key, counts, likeCounts)));
    }
    const card = await getCard(c.env.BUCKET, auth.cardId!);
    if (!card) return c.text("we couldn’t find that maker", 404);
    const { items: voices } = await loadVoiceIndex(c.env.BUCKET, card.id);
    return c.html(layout({ title: `Edit · ${card.brand}`, noindex: true }, await renderEditForm(card, key, false, voices)));
  });

  app.get("/edit/:id", requireAuth, async (c) => {
    const auth = c.get("auth")!;
    const id = c.req.param("id");
    const key = c.req.query("key") ?? "";
    if (!canEditCard(auth, id)) return c.text("this door isn’t yours to open", 403);
    let card = await getCard(c.env.BUCKET, id);
    if (!card) card = emptyCard(id, "");
    const { items: voices } = await loadVoiceIndex(c.env.BUCKET, id);
    return c.html(
      layout({ title: `Edit · ${card.brand || id}`, noindex: true }, await renderEditForm(card, key, auth.role === "admin", voices))
    );
  });

  app.post("/edit/_new", requireAuth, requireAdmin, async (c) => {
    const fd = await c.req.formData();
    const newId = String(fd.get("new_id") ?? "").trim();
    const newBrand = String(fd.get("new_brand") ?? "").trim();
    const key = c.req.query("key") ?? "";
    if (!/^[a-z0-9-]+$/.test(newId)) return c.text("the id isn’t quite right — lowercase letters, numbers or hyphens only", 400);
    if (!newBrand) return c.text("please give the workshop a name", 400);
    if (await getCard(c.env.BUCKET, newId)) return c.text("that id is already taken", 400);
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
    if (!canEditCard(auth, id)) return c.text("this door isn’t yours to open", 403);

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
      email: String(fd.get("email") ?? "").trim() || undefined,
    };

    card.socials = {
      web: String(fd.get("social_web") ?? "").trim() || undefined,
      instagram: String(fd.get("social_instagram") ?? "").trim() || undefined,
      xiaohongshu: String(fd.get("social_xiaohongshu") ?? "").trim() || undefined,
      youtube: String(fd.get("social_youtube") ?? "").trim() || undefined,
    };

    card.address = String(fd.get("address") ?? "").trim() || undefined;

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
      const nextProducts: string[] = [];
      for (let i = 0; i < 3; i++) {
        const existing = card.products[i];
        const remove = fd.get(`remove_product_${i}`);
        const path = await processImage(c.env.BUCKET, id, fd.get(`product_${i}`), `product-${i}`);
        if (path) {
          if (existing && existing.startsWith("/images/")) {
            await deleteObject(c.env.BUCKET, existing.slice(1));
          }
          nextProducts.push(path);
        } else if (remove) {
          if (existing && existing.startsWith("/images/")) {
            await deleteObject(c.env.BUCKET, existing.slice(1));
          }
        } else if (existing) {
          nextProducts.push(existing);
        }
      }
      for (const orphan of card.products.slice(3)) {
        if (orphan.startsWith("/images/")) await deleteObject(c.env.BUCKET, orphan.slice(1));
      }
      card.products = nextProducts;
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
