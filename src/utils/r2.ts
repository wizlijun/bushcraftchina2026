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
