import { pgTable, text, timestamp, uuid, jsonb, boolean } from "drizzle-orm/pg-core";

// --- Tenants (Multi-tenant base) ---
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(), // Supabase Auth UID will also map here logically, or be a 1-to-1 if needed.
  name: text("name").notNull(),
  subscriptionPlan: text("subscription_plan").default("one-time"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Concepts (AI Generated Account Blueprint) ---
export const concepts = pgTable("concepts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(), // "x" or "instagram"
  genre: text("genre").notNull(),
  accountName: text("account_name").notNull(),
  bio: text("bio").notNull(),
  targetAudience: text("target_audience"),
  hashtags: jsonb("hashtags"),
  contentMix: jsonb("content_mix"), // { educational, affiliate, personal }
  productUrl: text("product_url"),
  useHashtags: boolean("use_hashtags").default(true),
  suggestedHashtags: jsonb("suggested_hashtags"),
  footerText: text("footer_text"),
  personality: text("personality"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Accounts (Social Media Accounts for a Tenant) ---
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  conceptId: uuid("concept_id")
    .references(() => concepts.id, { onDelete: "set null" }),
  platform: text("platform").notNull(), // "x" or "instagram"
  username: text("username").notNull(),
  warmingUpStage: text("warming_up_stage").default("1"), // "1": restrictive, "2": moderate, "3": full
  encryptedToken: text("encrypted_token"),
  proxyConfig: jsonb("proxy_config"),      // Store IPBurger/residential proxy info
  stealthFingerprint: jsonb("stealth_fingerprint"), // Appended fingerprint definition
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Posts (Scheduled content) ---
export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  mediaUrls: jsonb("media_urls"),
  status: text("status").notNull().default("pending_approval"), // HITL: pending_approval, approved, scheduled, published, failed
  scheduledFor: timestamp("scheduled_for"), // null if instant
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- DM Messages (Intent analyzed DMs) ---
export const dmMessages = pgTable("dm_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  senderId: text("sender_id").notNull(),
  message: text("message").notNull(),
  intentCategory: text("intent_category"), // e.g., "purchase", "general_question"
  isReplied: boolean("is_replied").default(false),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
});

// --- Prompt Templates (AI Content generation rules) ---
export const promptTemplates = pgTable("prompt_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  template: text("template").notNull(), // The prompt instruction for Gemini
  platform: text("platform").notNull(), // "x" or "instagram"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Engagement Rules (Targeting & Limits) ---
export const engagementRules = pgTable("engagement_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  targetKeywords: jsonb("target_keywords"), // keywords to search for
  competitorAccounts: jsonb("competitor_accounts"), // accounts whose followers to target
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Engagement Logs (Anti-spam / Rate limiting tracking) ---
export const engagementLogs = pgTable("engagement_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  targetUserId: text("target_user_id").notNull(), // the external user ID (X / IG)
  actionType: text("action_type").notNull(), // "like", "reply", "follow"
  actedAt: timestamp("acted_at").defaultNow().notNull(),
});

// --- Trend Cache (Global cache for high-traffic data) ---
export const trendCache = pgTable("trend_cache", {
  id: text("id").primaryKey(), // e.g., "trending_keywords"
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
