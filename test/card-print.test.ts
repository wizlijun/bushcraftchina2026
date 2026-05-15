import { describe, it, expect } from "vitest";
import { renderCardPrint } from "../src/templates/card-print";
import type { Card } from "../src/types";

const sample: Card = {
  id: "shangwu",
  brand: "晌午",
  owner: "Jerry",
  logo: "/images/shangwu/logo.png",
  specialty: "HANDMADE LEATHER",
  description: "ignored in print view",
  contact: { wechat: "wx", email: "hi@shangwu.com" },
  socials: { web: "https://shangwu.com" },
  products: ["/images/shangwu/p1.jpg"],
  links: [],
};

describe("renderCardPrint", () => {
  it("returns a complete HTML document", async () => {
    const out = (await renderCardPrint(sample, "https://example.com")).toString();
    expect(out.startsWith("<!doctype html>")).toBe(true);
    expect(out).toContain("</html>");
  });

  it("includes brand, owner (script), and specialty", async () => {
    const out = (await renderCardPrint(sample, "https://example.com")).toString();
    expect(out).toContain("晌午");
    expect(out).toContain("Jerry");
    expect(out).toContain("HANDMADE LEATHER");
  });

  it("includes the logo image", async () => {
    const out = (await renderCardPrint(sample, "https://example.com")).toString();
    expect(out).toContain("/images/shangwu/logo.png");
  });

  it("encodes the canonical card URL (no ?print) for the QR", async () => {
    const out = (await renderCardPrint(sample, "https://example.com")).toString();
    expect(out).toContain("https://example.com/card/shangwu");
    expect(out).not.toContain("https://example.com/card/shangwu?print");
  });

  it("includes the Bushcraft China Community footer text", async () => {
    const out = (await renderCardPrint(sample, "https://example.com")).toString();
    expect(out).toContain("Bushcraft China Community");
  });

  it("loads qrcodejs and html2canvas from CDN", async () => {
    const out = (await renderCardPrint(sample, "https://example.com")).toString();
    expect(out).toContain("qrcodejs/1.0.0/qrcode.min.js");
    expect(out).toContain("html2canvas");
  });

  it("does not include feed/voice-sheet/swipe-hint markup", async () => {
    const out = (await renderCardPrint(sample, "https://example.com")).toString();
    expect(out).not.toContain("voice-sheet");
    expect(out).not.toContain("swipe-hint");
    expect(out).not.toContain("voice-trigger");
    expect(out).not.toContain("like-trigger");
  });

  it("escapes XSS in brand", async () => {
    const bad: Card = { ...sample, brand: "<script>x</script>" };
    const out = (await renderCardPrint(bad, "https://example.com")).toString();
    expect(out).not.toContain("<script>x</script>");
    expect(out).toContain("&lt;script&gt;");
  });

  it("falls back to default logo when card has no logo", async () => {
    const noLogo: Card = { ...sample, logo: "" };
    const out = (await renderCardPrint(noLogo, "https://example.com")).toString();
    expect(out).toContain("/images/_default/logo.png");
  });

  it("falls back to card-<id>.png filename when brand has no ASCII chars", async () => {
    const out = (await renderCardPrint(sample, "https://example.com")).toString();
    // Brand "晌午" has no a-z0-9 chars, so slug falls back to `card-${id}`.
    expect(out).toContain("card-shangwu.png");
  });

  it("slugifies ASCII brand for filename", async () => {
    const ascii: Card = { ...sample, id: "x", brand: "Bottle Bound Crafts" };
    const out = (await renderCardPrint(ascii, "https://example.com")).toString();
    expect(out).toContain("bottle-bound-crafts.png");
  });

  it("sets noindex meta", async () => {
    const out = (await renderCardPrint(sample, "https://example.com")).toString();
    expect(out).toContain('name="robots"');
    expect(out).toContain("noindex");
  });
});
