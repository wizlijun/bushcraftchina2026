import { Hono } from "hono";
import type { AppEnv, VoiceMessage } from "../types";
import { requireAuth, canEditCard } from "../middleware/auth";
import { getCard } from "../utils/cards";
import {
  loadVoiceIndex,
  appendVoiceMeta,
  removeVoiceMeta,
  bumpVoiceCount,
  checkAndIncrementRate,
  deleteVoiceObject,
  voiceObjectKey,
} from "../utils/voices";
import { hashIp } from "../utils/ip-hash";

const MIN_DURATION_MS = 5_000;
const MAX_DURATION_MS = 120_000;
const MAX_BYTES = 1_024 * 1_024;
const DAILY_LIMIT_PER_IP = 50;

const ALLOWED_TYPES: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "mp4",
  "audio/x-m4a": "m4a",
  "audio/mpeg": "mp3",
};

function extFromContentType(ct: string): string | null {
  const base = ct.split(";")[0].trim().toLowerCase();
  return ALLOWED_TYPES[base] ?? null;
}

function genVoiceId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function clientIp(c: { req: { header: (k: string) => string | undefined } }): string {
  return (
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-forwarded-for")?.split(",")[0].trim() ??
    "0.0.0.0"
  );
}

export function mountVoices(app: Hono<AppEnv>): void {
  // Audio file stream — public
  app.get("/voices/:cardId/:filename{.+}", async (c) => {
    const cardId = c.req.param("cardId");
    const filename = c.req.param("filename");
    if (cardId.includes("..") || filename.includes("..") || filename.includes("/")) {
      return c.text("nope", 400);
    }
    const obj = await c.env.BUCKET.get(`voices/${cardId}/${filename}`);
    if (!obj) return c.text("not found", 404);
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set("etag", obj.httpEtag);
    if (!headers.has("cache-control")) {
      headers.set("cache-control", "public, max-age=2592000");
    }
    return new Response(obj.body, { headers });
  });

  // Public submit
  app.post("/api/voice/:cardId", async (c) => {
    const cardId = c.req.param("cardId");
    const card = await getCard(c.env.BUCKET, cardId);
    if (!card) return c.text("card not found", 404);

    const lenHeader = c.req.header("content-length");
    if (lenHeader && parseInt(lenHeader, 10) > MAX_BYTES + 64 * 1024) {
      return c.text("payload too large", 413);
    }

    let fd: FormData;
    try {
      fd = await c.req.formData();
    } catch {
      return c.text("invalid form data", 400);
    }

    const audioField: unknown = fd.get("audio");
    const durationStr = fd.get("duration_ms");
    if (!(audioField instanceof File) || audioField.size === 0) {
      return c.text("missing audio", 400);
    }
    const audio = audioField;
    if (audio.size > MAX_BYTES) return c.text("audio too large", 413);

    const ext = extFromContentType(audio.type);
    if (!ext) return c.text("unsupported audio type", 415);

    const duration_ms = Math.round(Number(durationStr));
    if (!Number.isFinite(duration_ms) || duration_ms < MIN_DURATION_MS) {
      return c.text("recording too short — please record at least 5 seconds", 400);
    }
    if (duration_ms > MAX_DURATION_MS + 1500) {
      return c.text("recording too long", 400);
    }

    const ip = clientIp(c);
    const salt = c.env.ADMIN_SALT ?? "default-salt-please-rotate";
    const ip_hash = await hashIp(ip, salt);

    const rate = await checkAndIncrementRate(
      c.env.BUCKET,
      ip_hash,
      DAILY_LIMIT_PER_IP
    );
    if (!rate.ok) return c.text("daily voice limit reached", 429);

    const voice_id = genVoiceId();
    const objectKey = voiceObjectKey(cardId, voice_id, ext);
    const buffer = await audio.arrayBuffer();

    try {
      await c.env.BUCKET.put(objectKey, buffer, {
        httpMetadata: {
          contentType: audio.type.split(";")[0].trim(),
          cacheControl: "public, max-age=2592000",
        },
      });

      const ua = (c.req.header("user-agent") ?? "").slice(0, 200);
      const country = c.req.header("cf-ipcountry") ?? undefined;
      const city = c.req.header("cf-ipcity") ?? undefined;

      const voice: VoiceMessage = {
        id: voice_id,
        ext,
        duration_ms: Math.min(duration_ms, MAX_DURATION_MS),
        size_bytes: audio.size,
        content_type: audio.type,
        ip_hash,
        country,
        city,
        ua,
        created_at: new Date().toISOString(),
      };

      await appendVoiceMeta(c.env.BUCKET, cardId, voice);
      const voice_count = await bumpVoiceCount(c.env.BUCKET, cardId, +1);

      return c.json({ ok: true, voice_id, voice_count }, 201);
    } catch (err) {
      // best-effort cleanup
      try {
        await c.env.BUCKET.delete(objectKey);
      } catch {}
      throw err;
    }
  });

  // List voices for editor — auth required
  app.get("/api/card/:id/voices", requireAuth, async (c) => {
    const id = c.req.param("id");
    if (!canEditCard(c.get("auth")!, id)) {
      return c.text("forbidden", 403);
    }
    const card = await getCard(c.env.BUCKET, id);
    if (!card) return c.text("not found", 404);
    const { items } = await loadVoiceIndex(c.env.BUCKET, id);
    return c.json({
      ok: true,
      items: items.map((v) => ({
        ...v,
        audio_url: `/voices/${id}/${v.id}.${v.ext}`,
      })),
    });
  });

  // Delete voice — auth required (admin or card owner)
  app.delete("/api/voice/:cardId/:voiceId", requireAuth, async (c) => {
    const cardId = c.req.param("cardId");
    const voiceId = c.req.param("voiceId");
    if (!canEditCard(c.get("auth")!, cardId)) {
      return c.text("forbidden", 403);
    }
    const { removed } = await removeVoiceMeta(c.env.BUCKET, cardId, voiceId);
    if (!removed) return c.text("not found", 404);
    await deleteVoiceObject(c.env.BUCKET, cardId, voiceId, removed.ext);
    const voice_count = await bumpVoiceCount(c.env.BUCKET, cardId, -1);
    return c.json({ ok: true, voice_count });
  });
}
