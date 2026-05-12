import { Hono } from "hono";
import type { AppEnv } from "./types";
import { mountPages } from "./routes/pages";
import { mountEdit } from "./routes/edit";
import { mountApi } from "./routes/api";

const app = new Hono<AppEnv>();

app.onError((err, c) => {
  console.error(err);
  return c.text("服务异常，请稍后再试", 500);
});

app.notFound((c) => c.text("not found", 404));

mountPages(app);
mountEdit(app);
mountApi(app);

export default app;
