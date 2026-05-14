export async function hashIp(ip: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${ip}|${salt}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (let i = 0; i < 8; i++) hex += bytes[i].toString(16).padStart(2, "0");
  return hex;
}
