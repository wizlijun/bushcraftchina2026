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
  voice_count?: number;
}

export interface VoiceMessage {
  id: string;
  ext: string;
  duration_ms: number;
  size_bytes: number;
  content_type: string;
  ip_hash: string;
  country?: string;
  city?: string;
  ua?: string;
  created_at: string;
}

export interface VoiceIndex {
  items: VoiceMessage[];
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
  ADMIN_SALT?: string;
}

export type Role = "admin" | "card";

export interface AuthContext {
  role: Role;
  cardId?: string;
}

export type AppVars = { auth?: AuthContext };
export type AppEnv = { Bindings: Env; Variables: AppVars };
