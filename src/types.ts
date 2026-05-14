export interface Card {
  id: string;
  brand: string;
  owner: string;
  logo: string;
  specialty: string;
  description: string;
  address?: string;
  contact: {
    wechat?: string;
    email?: string;
  };
  socials: {
    web?: string;
    instagram?: string;
    xiaohongshu?: string;
  };
  products: string[];
  links: Array<{ label: string; url: string }>;
}

export interface CardIndexEntry {
  id: string;
  brand: string;
  order: number;
}

export interface Keys {
  admin: string;
  cards: Record<string, string>;
}

export interface Env {
  BUCKET: R2Bucket;
}

export type Role = "admin" | "card";

export interface AuthContext {
  role: Role;
  cardId?: string;
}

export type AppVars = { auth?: AuthContext };
export type AppEnv = { Bindings: Env; Variables: AppVars };
