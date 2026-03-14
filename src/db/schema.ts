import { pgTable, text, timestamp, uuid, jsonb, boolean } from "drizzle-orm/pg-core";

// --- Tenants (Multi-tenant base) ---
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(), // Supabase Auth UID will also map here logically, or be a 1-to-1 if needed.
  name: text("name").notNull(),
  subscriptionPlan: text("subscription_plan").default("one-time"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Accounts (Social Media Accounts for a Tenant) ---
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(), // "x" or "instagram"
  username: text("username").notNull(),
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
