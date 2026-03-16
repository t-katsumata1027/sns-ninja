import { db } from "@/db";
import { accounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { runGrowthCycleForAccount } from "@/lib/automation/growth-engine";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function run() {
  const { db } = await import("@/db");
  const { accounts } = await import("@/db/schema");
  const { runGrowthCycleForAccount } = await import("@/lib/automation/growth-engine");
  
  console.log("📈 Starting Growth Engagement Engine...");
  
  const activeAccounts = await db
    .select()
    .from(accounts)
    .where(eq(accounts.isActive, true));

  console.log(`Found ${activeAccounts.length} active accounts.`);

  for (const account of activeAccounts) {
    try {
      await runGrowthCycleForAccount(account.id);
    } catch (e: any) {
      console.error(`🚨 Failed growth cycle for account ${account.id}:`, e.message);
    }
  }

  console.log("✅ Growth Engagement Engine Complete!");
  process.exit(0);
}

run().catch((e) => {
  console.error("Fatal Error:", e);
  process.exit(1);
});
