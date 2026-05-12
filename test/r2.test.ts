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
