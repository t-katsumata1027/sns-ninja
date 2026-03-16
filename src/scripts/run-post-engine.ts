import * as dotenv from "dotenv";
import { eq } from "drizzle-orm";

dotenv.config({ path: ".env.local" });

async function run() {
  const { db } = await import("@/db");
  const { accounts } = await import("@/db/schema");
  const { generateDailyPostsForAccount } = await import("@/lib/automation/post-engine");
  
  console.log("🚀 Starting Daily Post Generation Engine...");
  
  // Fetch all active accounts that have a linked concept
  const activeAccounts = await db
    .select()
    .from(accounts)
    .where(eq(accounts.isActive, true));

  const validAccounts = activeAccounts.filter(a => a.conceptId !== null);

  console.log(`Found ${validAccounts.length} active accounts ready for post generation.`);

  for (const account of validAccounts) {
    try {
      await generateDailyPostsForAccount(account.id);
    } catch (e: any) {
      console.error(`🚨 Failed to process account ${account.id}:`, e.message);
    }
  }

  console.log("✅ Daily Post Generation Complete!");
  process.exit(0);
}

run().catch((e) => {
  console.error("Fatal Error:", e);
  process.exit(1);
});
