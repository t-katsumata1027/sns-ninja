import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/db";
import { accounts, engagementRules, engagementLogs } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";

const GEMINI_MODEL = "gemini-3.1-flash-lite-preview";

export async function runGrowthCycleForAccount(accountId: string) {
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

  // 3. Simulate fetching target posts based on keywords (In real env, this calls X/IG API)
  const keywords = rule.targetKeywords as string[] || [];
  console.log(`Searching posts for keywords: ${keywords.join(", ")}`);
  
  // Mock target post data (this would be replaced by actual scraping/API fetching)
  const targetPosts = [
    { targetUserId: "user_123", content: `${keywords[0] || "SNS"}の運用で悩んでます...` },
    { targetUserId: "user_456", content: `最近${keywords[1] || "AI"}ツール触り始めたけど難しい` }
  ];

  // 4. Check interaction history to prevent spamming the same user
  const contactedUsers = new Set(recentLogs.map(l => l.targetUserId));
  const newTargets = targetPosts.filter(p => !contactedUsers.has(p.targetUserId)).slice(0, maxActionsPerCycle);

  // 5. Engage: Generate AI Reply & Log Action
  for (const target of newTargets) {
    // Random human-like delay between 2-5 seconds
    await new Promise(res => setTimeout(res, 2000 + Math.random() * 3000));
    
    try {
      const replyText = await generateContextAwareReply(target.content, account.username);
      
      console.log(`[ACTION] Replied to ${target.targetUserId}: "${replyText}"`);
      
      // Log the Engagement
      await db.insert(engagementLogs).values({
        accountId: account.id,
        targetUserId: target.targetUserId,
        actionType: "reply",
      });

    } catch (err: any) {
      console.error(`Failed to engage with ${target.targetUserId}:`, err.message);
    }
  }

  console.log(`Growth cycle complete for ${account.username}. Engaged with ${newTargets.length} targets.`);
}

async function generateContextAwareReply(targetPostContent: string, myAccountName: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL, generationConfig: { temperature: 0.7 } });

  const prompt = `
あなたは「${myAccountName}」という名前のアカウントを運用している人間です。
以下のSNSの投稿に対して、単なる相槌や絵文字だけでなく、人間味があり、相手が喜んだり感心するような文脈にあった「リプライ（返信）」を生成してください。

【対象の投稿内容】
"${targetPostContent}"

条件：
- 文字数は短め（50文字前後）。
- ハッシュタグは使わない。
- 商品の売り込みや宣伝は絶対にしない。
- 完全に自然な日本語で。
  `;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
