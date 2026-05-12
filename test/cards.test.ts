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
