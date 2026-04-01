/**
 * BullMQ Worker - processes post-publish and dm-reply jobs.
 * This file is intended to be run as a standalone Node.js process, NOT inside Next.js.
 *
 * Usage: node --loader tsx src/lib/queue/worker.ts
 * (Or via a process manager like PM2)
 */

import "@/lib/env";
import { Worker } from "bullmq";
import { redisConnectionOptions, type PostPublishJobData, type DmReplyJobData, type CronDailyJobData, getCronDailyQueue } from "./client";
import { postToX } from "@/lib/automation/x-poster";
import { waitForRateLimit } from "@/lib/rate-limiter";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { postToInstagram, sendDmToInstagram } from "@/lib/automation/instagram-poster";
import { sendDmToX } from "@/lib/automation/x-poster";
import { analyzeIntent, generateDmReply } from "@/lib/ai/intent";
import { accounts, concepts } from "@/db/schema";
import { generatePost } from "@/lib/ai/gemini";
import { generateAndUploadImage } from "@/lib/ai/image-generator";
import { sendDiscordAlert } from "@/lib/discord";

// ---- post-publish worker ----

export const postPublishWorker = new Worker<PostPublishJobData>(
  "post-publish",
  async (job) => {
    const { postId, accountId, content, platform } = job.data;

    console.log(`[post-publish] Processing job ${job.id} for postId=${postId}`);

    try {
      // Anti-ban: use PRD-specified 'post' action delay (3–8 min)
      // Throws error if hourly limit reached (X: 8 posts/hr)
      await waitForRateLimit(accountId, "post");

      // Fetch from DB to get mediaUrls (required for Instagram)
      const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
      const imageUrl = post?.mediaUrls ? (post.mediaUrls as string[])[0] : undefined;

      if (platform === "x") {
        await postToX({ accountId, content });
      } else if (platform === "instagram") {
        await postToInstagram({ accountId, content, imageUrl });
      }

      // Update post status to published
      await db.update(posts).set({ status: "published", publishedAt: new Date() }).where(eq(posts.id, postId));

      console.log(`[post-publish] Job ${job.id} completed successfully`);
      return { success: true };
    } catch (err: any) {
      console.error(`[post-publish] Job ${job.id} failed:`, err.message);
      // Update post status to failed
      await db.update(posts).set({ status: "failed" }).where(eq(posts.id, postId));
      throw err; // Re-throw to let BullMQ handle retry/fail
    }
  },
  {
    connection: redisConnectionOptions,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY_POST || "1", 10), // Safe for Free Tier
  }
);
// ... (dm-reply worker follows)

import { dmMessages } from "@/db/schema";

// ---- dm-reply worker ----

export const dmReplyWorker = new Worker<DmReplyJobData>(
  "dm-reply",
  async (job) => {
    const { dmId, senderId, replyContent, platform } = job.data;

    console.log(`[dm-reply] Processing job ${job.id} for dmId=${dmId}`);

    try {
      // Anti-ban: use 'dm' rate limit delay before replying
      // Throws error if hourly limit reached (IG: 200/hr)
      await waitForRateLimit(job.data.accountId, "dm");

      // 1. Analyze Intent
      const intentResult = await analyzeIntent(job.data.replyContent || ""); // Job data usually contains raw incoming message or context
      
      // 2. Fetch Account for context
      const [account] = await db.select().from(accounts).where(eq(accounts.id, job.data.accountId)).limit(1);
      
      // 3. Generate Reply
      const finalReply = await generateDmReply(job.data.replyContent || "", intentResult, account?.username);

      // 4. Send Message
      if (platform === "x") {
        await sendDmToX({ accountId: job.data.accountId, targetUserId: senderId, content: finalReply });
      } else if (platform === "instagram") {
        await sendDmToInstagram({ accountId: job.data.accountId, targetUserId: senderId, content: finalReply });
      }

      // Update DM message as replied
      await db.update(dmMessages).set({ isReplied: true }).where(eq(dmMessages.id, dmId));

      console.log(`[dm-reply] Job ${job.id} completed successfully`);
      return { success: true };
    } catch (err: any) {
      console.error(`[dm-reply] Job ${job.id} failed:`, err.message);
      throw err;
    }
  },
  {
    connection: redisConnectionOptions,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY_DM || "5", 10),
  }
);

// ---- Event listeners ----

postPublishWorker.on("completed", (job) => console.log(`✅ post-publish job ${job.id} done`));
postPublishWorker.on("failed", async (job, err) => {
  console.error(`❌ post-publish job ${job?.id} failed:`, err.message);
  await sendDiscordAlert("Post Publish Failed", `Job ${job?.id} failed: ${err.message}`, job?.data);
});

dmReplyWorker.on("completed", (job) => console.log(`✅ dm-reply job ${job.id} done`));
dmReplyWorker.on("failed", async (job, err) => {
  console.error(`❌ dm-reply job ${job?.id} failed:`, err.message);
  await sendDiscordAlert("DM Reply Failed", `Job ${job?.id} failed: ${err.message}`, job?.data);
});

// ---- cron-daily worker ----

export const cronDailyWorker = new Worker<CronDailyJobData>(
  "cron-daily",
  async (job) => {
    console.log(`[cron-daily] Processing scheduled daily post generation...`);

    try {
      // 1. Fetch all accounts where auto-posting is enabled and active
      const activeAccounts = await db.select().from(accounts).where(eq(accounts.isActive, true));
      const autoPostAccounts = activeAccounts.filter(a => a.enableAutoPost);

      if (autoPostAccounts.length === 0) {
        console.log(`[cron-daily] No accounts with auto-posting enabled found.`);
        return { success: true };
      }

      for (const account of autoPostAccounts) {
        if (!account.conceptId) {
          console.log(`[cron-daily] Skipping @${account.username}: No concept linked.`);
          continue;
        }

        // Fetch concept
        const [concept] = await db.select().from(concepts).where(eq(concepts.id, account.conceptId));
        if (!concept) continue;

        console.log(`[cron-daily] Generating post for @${account.username}...`);

        try {
          const generatedContent = await generatePost({
            platform: account.platform as "x" | "instagram",
            category: account.accountType === "affiliate" ? "affiliate" : "educational",
            concept: concept,
            context: "Generate an engaging post based on the daily trends."
          });

          let mediaUrls = null;

          // Process Image Generation if enabled
          if (account.enableImageGeneration) {
             const imagePrompt = `A high quality, engaging social media image for the following topic: ${concept.genre}. Professional, vibrant colors. Context: ${generatedContent.substring(0, 100)}`;
             const uploadedUrl = await generateAndUploadImage(imagePrompt);
             if (uploadedUrl) {
                mediaUrls = [uploadedUrl];
             }
          }

          // Save pending post for HITL approval
          await db.insert(posts).values({
            tenantId: account.tenantId,
            accountId: account.id,
            content: generatedContent,
            mediaUrls: mediaUrls,
            status: "pending_approval",
          });

          console.log(`[cron-daily] ✅ Pending post created for @${account.username}`);
        } catch (e: any) {
             console.error(`[cron-daily] ❌ Failed to generate for @${account.username}:`, e.message);
        }
      }

      console.log(`[cron-daily] Daily generation complete.`);
      return { success: true };
    } catch (err: any) {
      console.error(`[cron-daily] Job failed:`, err.message);
      throw err;
    }
  },
  {
    connection: redisConnectionOptions,
    concurrency: 1, // Run generation sequentially to avoid rate limits
  }
);

cronDailyWorker.on("completed", (job) => console.log(`✅ cron-daily job ${job.id} done`));
cronDailyWorker.on("failed", async (job, err) => {
  console.error(`❌ cron-daily job ${job?.id} failed:`, err.message);
  await sendDiscordAlert("Daily Generation Failed", `Job ${job?.id} failed: ${err.message}`);
});

// Register the repeatable job
async function setupCronJobs() {
   const cronQueue = getCronDailyQueue();
   // Add a repeatable job that runs every day at 8:00 AM UTC (17:00 JST)
   await cronQueue.add(
     "daily-generate", 
     {}, 
     { repeat: { pattern: "0 8 * * *" }, jobId: "daily-generate-task" }
   );
   console.log("⏰ Registered 'daily-generate' repeatable cron job.");
}

import http from "http";

// ---- health-check server for Worker (Render / K8s) ----
const HEALTH_PORT = process.env.PORT || 3001;
const healthServer = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
});

healthServer.listen(HEALTH_PORT, () => {
  console.log(`📡 Worker health server listening on port ${HEALTH_PORT}`);
});

console.log("🚀 BullMQ workers started. Waiting for jobs...");
