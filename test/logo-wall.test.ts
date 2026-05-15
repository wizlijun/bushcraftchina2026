import { describe, it, expect } from "vitest";
import { renderLogoWall } from "../src/templates/logo-wall";
import type { Card } from "../src/types";

const sample: Card = {
  id: "shangwu",
  brand: "晌午",
  owner: "张三",
  logo: "/images/shangwu/logo.png",
  specialty: "手工刀匠",
  description: "",
  contact: {},
  socials: {},
  products: [],
  links: [],
};

describe("renderLogoWall", () => {
  it("default mode links to /card/:id without ?print", async () => {
    const out = (await renderLogoWall([sample])).toString();
    expect(out).toContain('href="/card/shangwu"');
    expect(out).not.toContain('href="/card/shangwu?print"');
  });

  it("print mode rewrites every card link with ?print", async () => {
    const out = (await renderLogoWall([sample], { print: true })).toString();
    expect(out).toContain('href="/card/shangwu?print"');
    expect(out).not.toMatch(/href="\/card\/shangwu"/);
  });

  it("print mode preserves brand/craft labels", async () => {
    const out = (await renderLogoWall([sample], { print: true })).toString();
    expect(out).toContain("晌午");
    expect(out).toContain("手工刀匠");
  });

  it("filters out cards without a logo", async () => {
    const noLogo: Card = { ...sample, id: "x", brand: "X", logo: "" };
    const out = (await renderLogoWall([sample, noLogo])).toString();
    expect(out).not.toContain('href="/card/x"');
  });
});
