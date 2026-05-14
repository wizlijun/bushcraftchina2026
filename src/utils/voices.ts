import type { VoiceIndex, VoiceMessage, Card } from "../types";
import { getCard, putCard } from "./cards";
import { deleteObject } from "./r2";

const MAX_RETRIES = 3;

const indexKey = (cardId: string) => `voices/${cardId}/index.json`;
export const voiceObjectKey = (cardId: string, voiceId: string, ext: string) =>
  `voices/${cardId}/${voiceId}.${ext}`;
const rateKey = (date: string, ipHash: string) => `voices/_rate/${date}/${ipHash}.txt`;

export async function loadVoiceIndex(bucket: R2Bucket, cardId: string): Promise<VoiceIndex> {
  const obj = await bucket.get(indexKey(cardId));
  if (!obj) return { items: [] };
  return await obj.json<VoiceIndex>();
}

export async function appendVoiceMeta(
  bucket: R2Bucket,
  cardId: string,
  voice: VoiceMessage
): Promise<VoiceIndex> {
  const key = indexKey(cardId);
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const existing = await bucket.get(key);
    const items: VoiceMessage[] = existing ? (await existing.json<VoiceIndex>()).items : [];
    items.push(voice);
    const body = JSON.stringify({ items });
    const opts: R2PutOptions = {
      httpMetadata: { contentType: "application/json; charset=utf-8" },
    };
    if (existing) opts.onlyIf = { etagMatches: existing.etag };
    const result = await bucket.put(key, body, opts);
    if (result) return { items };
  }
  throw new Error("voice index write contention");
}

export async function removeVoiceMeta(
  bucket: R2Bucket,
  cardId: string,
  voiceId: string
): Promise<{ index: VoiceIndex; removed: VoiceMessage | null }> {
  const key = indexKey(cardId);
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const existing = await bucket.get(key);
    if (!existing) return { index: { items: [] }, removed: null };
    const items: VoiceMessage[] = (await existing.json<VoiceIndex>()).items;
    const idx = items.findIndex((v) => v.id === voiceId);
    if (idx < 0) return { index: { items }, removed: null };
    const [removed] = items.splice(idx, 1);
    const result = await bucket.put(key, JSON.stringify({ items }), {
      httpMetadata: { contentType: "application/json; charset=utf-8" },
      onlyIf: { etagMatches: existing.etag },
    });
    if (result) return { index: { items }, removed };
  }
  throw new Error("voice index write contention");
}

export async function bumpVoiceCount(
  bucket: R2Bucket,
  cardId: string,
  delta: number
): Promise<number> {
  const card = await getCard(bucket, cardId);
  if (!card) return 0;
  const next = Math.max(0, (card.voice_count ?? 0) + delta);
  const updated: Card = { ...card, voice_count: next };
  await putCard(bucket, updated);
  return next;
}

export function todayUtcDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export async function checkAndIncrementRate(
  bucket: R2Bucket,
  ipHash: string,
  limit: number,
  now: Date = new Date()
): Promise<{ ok: true; count: number } | { ok: false; count: number }> {
  const date = todayUtcDate(now);
  const key = rateKey(date, ipHash);
  const existing = await bucket.get(key);
  const current = existing ? parseInt((await existing.text()).trim(), 10) || 0 : 0;
  if (current >= limit) return { ok: false, count: current };
  const next = current + 1;
  await bucket.put(key, String(next), {
    httpMetadata: { contentType: "text/plain; charset=utf-8" },
  });
  return { ok: true, count: next };
}

export async function deleteVoiceObject(
  bucket: R2Bucket,
  cardId: string,
  voiceId: string,
  ext: string
): Promise<void> {
  await deleteObject(bucket, voiceObjectKey(cardId, voiceId, ext));
}
