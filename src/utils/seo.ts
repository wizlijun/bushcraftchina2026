import type { Card } from "../types";

const SITE_NAME = "Bushcraft China Community";
const HOME_DESCRIPTION =
  "A show of crafters and their works — meet the makers, knives, leather, fire and wood, of Bushcraft China.";

export function origin(reqUrl: string): string {
  return new URL(reqUrl).origin;
}

export function absoluteUrl(origin: string, path: string): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function isPublished(card: Card): boolean {
  return !!(card.logo && card.logo.trim() !== "");
}

function squashWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function truncate(s: string, max = 160): string {
  const clean = squashWhitespace(s);
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trimEnd() + "…";
}

export interface PageMeta {
  title: string;
  description?: string;
  canonical?: string;
  image?: string;
  type?: "website" | "profile" | "article";
  noindex?: boolean;
  jsonLd?: unknown;
}

export function homeMeta(originUrl: string): PageMeta {
  return {
    title: `${SITE_NAME} · A Show of Crafters & Their Works`,
    description: HOME_DESCRIPTION,
    canonical: `${originUrl}/`,
    image: `${originUrl}/b.png`,
    type: "website",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: `${originUrl}/`,
      description: HOME_DESCRIPTION,
    },
  };
}

export function cardMeta(card: Card, originUrl: string, opts: { published: boolean }): PageMeta {
  const titleParts = [card.brand];
  if (card.specialty) titleParts.push(card.specialty);
  titleParts.push(SITE_NAME);
  const title = titleParts.filter(Boolean).join(" · ");

  const descriptionSource =
    card.description ||
    [card.specialty, card.owner ? `by ${card.owner}` : ""].filter(Boolean).join(" — ") ||
    `${card.brand} on ${SITE_NAME}`;

  const image = absoluteUrl(originUrl, card.logo || "/b.png");
  const canonical = `${originUrl}/card/${encodeURIComponent(card.id)}`;

  const sameAs: string[] = [];
  if (card.socials?.web) sameAs.push(card.socials.web);
  if (card.socials?.instagram) {
    const handle = card.socials.instagram.replace(/^@/, "");
    sameAs.push(`https://instagram.com/${handle}`);
  }
  if (card.socials?.xiaohongshu) {
    const handle = card.socials.xiaohongshu.replace(/^@/, "");
    sameAs.push(`https://www.xiaohongshu.com/user/profile/${handle}`);
  }

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: card.brand,
    url: canonical,
    description: truncate(descriptionSource, 500),
  };
  if (card.logo) jsonLd.logo = image;
  if (card.products && card.products.length) {
    jsonLd.image = card.products.map((p) => absoluteUrl(originUrl, p));
  }
  if (card.owner) {
    jsonLd.founder = { "@type": "Person", name: card.owner };
  }
  if (card.address) {
    jsonLd.address = { "@type": "PostalAddress", streetAddress: card.address };
  }
  if (card.contact?.email) jsonLd.email = card.contact.email;
  if (sameAs.length) jsonLd.sameAs = sameAs;

  return {
    title,
    description: truncate(descriptionSource, 160),
    canonical,
    image,
    type: "profile",
    noindex: !opts.published,
    jsonLd,
  };
}

export function buildSitemap(originUrl: string, cards: Card[]): string {
  const urls: string[] = [];
  urls.push(`<url><loc>${originUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`);
  for (const card of cards) {
    if (!isPublished(card)) continue;
    const loc = `${originUrl}/card/${encodeURIComponent(card.id)}`;
    urls.push(`<url><loc>${loc}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

export function buildRobots(originUrl: string): string {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /edit",
    "Disallow: /api",
    "",
    `Sitemap: ${originUrl}/sitemap.xml`,
    "",
  ].join("\n");
}
