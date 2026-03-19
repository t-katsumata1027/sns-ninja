import { db } from "@/db";
import { accounts, engagementRules, engagementLogs } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { engageWithKeywordsOnX } from "@/lib/automation/x-poster";
// If you implement instagram, you can import engageWithKeywordsOnInstagram here

export async function runGrowthCycleForAccount(accountId: string) {
  // ... (rest of the function remains the same until step 5)
  // 1. Fetch account and active engagement rules
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
  if (!account || !account.isActive) {
    console.log(`Account ${accountId} is inactive. Skipping growth cycle.`);
    return;
  }

  const [rule] = await db.select().from(engagementRules)
    .where(and(eq(engagementRules.accountId, account.id), eq(engagementRules.isActive, true)));

  if (!rule || (!rule.targetKeywords && !rule.competitorAccounts)) {
    console.log(`No active engagement rules for ${account.username}.`);
    return;
  }

  // 2. Anti-BAN Checks: Determine action limits based on warmingUpStage
  const stage = parseInt(account.warmingUpStage || "1", 10);
  let maxActionsPerCycle = 2; // Default conservative
  if (stage === 2) maxActionsPerCycle = 5;
  if (stage >= 3) maxActionsPerCycle = 10;

  // Check how many actions were taken in the last 24h
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentLogs = await db.select().from(engagementLogs)
    .where(and(
      eq(engagementLogs.accountId, account.id),
      gt(engagementLogs.actedAt, oneDayAgo)
    ));
    
  if (recentLogs.length >= maxActionsPerCycle * 5) {
     console.log(`Account ${account.username} reached daily max actions. Skipping.`);
     return;
  }

  // 3 & 4 & 5. Perform the actual Playwright Scrape & Reply
  const keywords = rule.targetKeywords as string[] || [];
  const contactedUsers = new Set(recentLogs.map(l => l.targetUserId));
  
  if (account.platform === "x") {
    try {
      const actionsDone = await engageWithKeywordsOnX({
        accountId: account.id,
        keywords: keywords.filter(k => k.trim().length > 0),
        maxActions: maxActionsPerCycle,
        contactedUsers
      });
      console.log(`Growth cycle complete for @${account.username}. Engaged with ${actionsDone} targets on X.`);
    } catch (err: any) {
      console.error(`Fatal error in X engagement cycle for @${account.username}:`, err.message);
    }
  } else if (account.platform === "instagram") {
    console.log(`Instagram growth engine not fully converted to Playwright yet. Skipping.`);
  }
}
