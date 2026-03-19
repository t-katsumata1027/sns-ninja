import { env } from "@/lib/env";
import { db } from "@/db";
import { accounts, concepts, posts } from "@/db/schema";
import { eq } from "drizzle-orm";

type PostCategory = "educational" | "affiliate" | "personal";

export async function generateDailyPostsForAccount(accountId: string) {
  // 1. Fetch account and concept
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
  if (!account || !account.isActive || !account.conceptId) {
    console.log(`Account ${accountId} is inactive or has no concept linked. Skipping.`);
    return;
  }

  const [concept] = await db.select().from(concepts).where(eq(concepts.id, account.conceptId));
  if (!concept) {
    console.error(`Concept not found for account ${accountId}`);
    return;
  }

  // 2. Determine Number of Posts based on Warming Up Stage
  // stage 1: 1 post/day, stage 2: 2 posts/day, stage 3: 3 posts/day
  const stage = parseInt(account.warmingUpStage || "1", 10);
  const postsCount = Math.min(Math.max(stage, 1), 3);

  console.log(`Generating ${postsCount} posts for ${account.username} (Stage: ${stage})`);

  // 3. Determine Categories based on contentMix
  const mix = concept.contentMix as { educational: number; affiliate: number; personal: number; };
  if (!mix) {
    console.error("No contentMix defined in concept.");
    return;
  }

  const categoriesToGenerate: PostCategory[] = [];
  for (let i = 0; i < postsCount; i++) {
    const rand = Math.random() * 100;
    if (rand < mix.educational) {
      categoriesToGenerate.push("educational");
    } else if (rand < mix.educational + mix.affiliate) {
      categoriesToGenerate.push("affiliate");
    } else {
      categoriesToGenerate.push("personal");
    }
  }

  // 4. Generate Posts
  const generatedPosts: string[] = [];
  const { generatePost } = await import("@/lib/ai/gemini");

  for (const category of categoriesToGenerate) {
    try {
      const text = await generatePost({
        platform: account.platform as "x" | "instagram",
        category,
        concept,
      });
      generatedPosts.push(text);
      
      // Delay to avoid rate limiting
      await new Promise(res => setTimeout(res, 2000));
    } catch (e: any) {
      console.error(`Error generating ${category} post:`, e.message);
    }
  }

  // 5. Save to DB (Status: pending_approval for HITL)
  for (const content of generatedPosts) {
    await db.insert(posts).values({
      tenantId: account.tenantId,
      accountId: account.id,
      content,
      status: "pending_approval", // HITL Requirement
    });
  }

  console.log(`Successfully generated and queued ${generatedPosts.length} posts for ${account.username}.`);
  return generatedPosts;
}

// Removed: logic moved to buildPrompt in gemini.ts
