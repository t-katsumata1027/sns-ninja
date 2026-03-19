import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL!;

async function main() {
  const sql = postgres(connectionString, { prepare: false });
  try {
    console.log("Running migration...");
    await sql.unsafe(`
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "account_type" text DEFAULT 'affiliate' NOT NULL;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "enable_auto_post" boolean DEFAULT true NOT NULL;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "enable_image_generation" boolean DEFAULT false NOT NULL;
ALTER TABLE "concepts" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
    `);
    console.log("Columns added successfully");

    try {
      await sql.unsafe(`CREATE INDEX IF NOT EXISTS "engagement_logs_account_id_acted_at_idx" ON "engagement_logs" USING btree ("account_id","acted_at");`);
      console.log("Index added");
    } catch (e: any) {
      console.log("Index may already exist, skipping: ", e.message);
    }
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await sql.end();
  }
}

main();
