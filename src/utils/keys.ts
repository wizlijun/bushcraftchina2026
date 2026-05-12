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
