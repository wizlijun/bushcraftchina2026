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
    contact: {}, socials: {}, products: [], links: [],
  };
}
