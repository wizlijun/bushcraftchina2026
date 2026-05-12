import { describe, it, expect } from "vitest";
import { escapeHtml } from "../src/utils/escape";

describe("escapeHtml", () => {
  it("escapes &, <, >, \", '", () => {
    expect(escapeHtml(`<script>alert("x")</script>`))
      .toBe("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  });

  it("escapes ampersand first", () => {
    expect(escapeHtml("a&b<c")).toBe("a&amp;b&lt;c");
  });

  it("handles empty string", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("handles undefined/null safely", () => {
    expect(escapeHtml(undefined as any)).toBe("");
    expect(escapeHtml(null as any)).toBe("");
  });
});
