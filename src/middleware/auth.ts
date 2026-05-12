import type { MiddlewareHandler } from "hono";
import type { Env, AuthContext } from "../types";
import { verifyKey } from "../utils/keys";

type Vars = { auth: AuthContext };

export const requireAuth: MiddlewareHandler<{ Bindings: Env; Variables: Vars }> = async (c, next) => {
  const key = c.req.query("key") ?? c.req.header("x-edit-key") ?? "";
  const auth = await verifyKey(c.env.BUCKET, key);
  if (!auth) return c.text("无权限", 403);
  c.set("auth", auth);
  await next();
};

export const requireAdmin: MiddlewareHandler<{ Bindings: Env; Variables: Vars }> = async (c, next) => {
  const auth = c.get("auth");
  if (!auth || auth.role !== "admin") return c.text("仅管理员可操作", 403);
  await next();
};

export function canEditCard(auth: AuthContext, cardId: string): boolean {
  return auth.role === "admin" || auth.cardId === cardId;
}
