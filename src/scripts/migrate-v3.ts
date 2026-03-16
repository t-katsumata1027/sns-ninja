import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL!;

async function migrate() {
  const sql = postgres(connectionString, { prepare: false });

  console.log("Running Phase 1 Migrations...");

  try {
    // 1. Create concepts table
    await sql`
      CREATE TABLE IF NOT EXISTS "concepts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "tenant_id" uuid NOT NULL,
        "platform" text NOT NULL,
        "genre" text NOT NULL,
        "account_name" text NOT NULL,
        "bio" text NOT NULL,
        "target_audience" text,
        "hashtags" jsonb,
        "content_mix" jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `;
    console.log("Created concepts table.");

    // 2. Add columns to accounts
    await sql`
      ALTER TABLE "accounts" 
      ADD COLUMN IF NOT EXISTS "concept_id" uuid,
      ADD COLUMN IF NOT EXISTS "warming_up_stage" text DEFAULT '1';
    `;
    console.log("Added columns to accounts table.");

    // 3. Create engagement_logs
    await sql`
      CREATE TABLE IF NOT EXISTS "engagement_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "account_id" uuid NOT NULL,
        "target_user_id" text NOT NULL,
        "action_type" text NOT NULL,
        "acted_at" timestamp DEFAULT now() NOT NULL
      );
    `;
    console.log("Created engagement_logs table.");

    // 4. Create engagement_rules
    await sql`
      CREATE TABLE IF NOT EXISTS "engagement_rules" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "tenant_id" uuid NOT NULL,
        "account_id" uuid NOT NULL,
        "target_keywords" jsonb,
        "competitor_accounts" jsonb,
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `;
    console.log("Created engagement_rules table.");

    // 5. Add Constraints (ignoring 'already exists' errors gracefully)
    const constraints = [
      `ALTER TABLE "accounts" ADD CONSTRAINT "accounts_concept_id_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."concepts"("id") ON DELETE set null ON UPDATE no action;`,
      `ALTER TABLE "concepts" ADD CONSTRAINT "concepts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;`,
      `ALTER TABLE "engagement_logs" ADD CONSTRAINT "engagement_logs_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;`,
      `ALTER TABLE "engagement_rules" ADD CONSTRAINT "engagement_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;`,
      `ALTER TABLE "engagement_rules" ADD CONSTRAINT "engagement_rules_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;`
    ];

    for (const constraint of constraints) {
      try {
        await sql.unsafe(constraint);
      } catch (e: any) {
        if (e.code === '42710') {
          // duplicate_object
          console.log(`Constraint already exists, skipping.`);
        } else {
          console.error(`Error adding constraint:`, e.message);
        }
      }
    }
    console.log("Added constraints.");

    console.log("✅ Migration complete.");

  } catch (err) {
    console.error(">>> ERROR executing migration:", err);
  } finally {
    await sql.end();
  }
}

migrate().catch(console.error);
