import postgres from "postgres";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";

dotenv.config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' });

async function migrate() {
  console.log("Applying migration: trend_cache table...");
  const migrationPath = join(process.cwd(), "supabase/migrations/0001_lying_the_executioner.sql");
  const migrationSql = readFileSync(migrationPath, "utf-8");

  try {
    await sql.unsafe(migrationSql);
    console.log("Migration applied successfully.");
  } catch (error: any) {
    if (error.message.includes("already exists")) {
      console.log("Table trend_cache already exists, skipping creation.");
    } else {
      console.error("Migration failed:", error);
      process.exit(1);
    }
  } finally {
    await sql.end();
  }
}

migrate();
