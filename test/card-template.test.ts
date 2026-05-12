import { describe, it, expect } from "vitest";
import { renderCard } from "../src/templates/card";
import type { Card } from "../src/types";

const sample: Card = {
  id: "shangwu",
  brand: "晌午",
  owner: "张三",
  logo: "/images/shangwu/logo.png",
  specialty: "手工刀匠",
  description: "每一把刀都是与木头的一次对话",
  contact: { wechat: "wx", phone: "" },
  products: ["/images/shangwu/p1.jpg"],
  links: [{ label: "小红书", url: "https://xhs.com/x" }],
};

describe("renderCard", () => {
  it("includes brand and specialty", () => {
    const out = renderCard(sample).toString();
    expect(out).toContain("晌午");
    expect(out).toContain("手工刀匠");
    expect(out).toContain("张三");
  });

  it("includes product image", () => {
    expect(renderCard(sample).toString()).toContain("/images/shangwu/p1.jpg");
  });

  it("includes link", () => {
    const out = renderCard(sample).toString();
    expect(out).toContain("https://xhs.com/x");
    expect(out).toContain("小红书");
  });

  it("escapes XSS in brand", () => {
    const bad: Card = { ...sample, brand: "<script>x</script>" };
    const out = renderCard(bad).toString();
    expect(out).not.toContain("<script>x</script>");
    expect(out).toContain("&lt;script&gt;");
  });

  it("hides empty contact section", () => {
    const c: Card = { ...sample, contact: { wechat: "", phone: "" } };
    expect(renderCard(c).toString()).not.toContain("微信");
  });
});
