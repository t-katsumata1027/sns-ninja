/**
 * BullMQ Worker - processes post-publish and dm-reply jobs.
 * This file is intended to be run as a standalone Node.js process, NOT inside Next.js.
 *
 * Usage: node --loader tsx src/lib/queue/worker.ts
 * (Or via a process manager like PM2)
 */

import { Worker } from "bullmq";
import { redisConnectionOptions, type PostPublishJobData, type DmReplyJobData } from "./client";
import { postToX } from "@/lib/automation/x-poster";
import { waitForRateLimit } from "@/lib/rate-limiter";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { postToInstagram, sendDmToInstagram } from "@/lib/automation/instagram-poster";
import { sendDmToX } from "@/lib/automation/x-poster";
import { analyzeIntent, generateDmReply } from "@/lib/ai/intent";
import { accounts } from "@/db/schema";

// ---- post-publish worker ----

export const postPublishWorker = new Worker<PostPublishJobData>(
  "post-publish",
  async (job) => {
    const { postId, accountId, content, platform } = job.data;

    console.log(`[post-publish] Processing job ${job.id} for postId=${postId}`);

    try {
      // Anti-ban: use PRD-specified 'post' action delay (3–8 min)
      await waitForRateLimit("post");

      if (platform === "x") {
        await postToX({ accountId, content });
      } else if (platform === "instagram") {
        await postToInstagram({ accountId, content });
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
    concurrency: 1, // Process one post at a time per worker instance
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
      await waitForRateLimit("dm");

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
    concurrency: 2,
  }
);

// ---- Event listeners ----

postPublishWorker.on("completed", (job) => console.log(`✅ post-publish job ${job.id} done`));
postPublishWorker.on("failed", (job, err) =>
  console.error(`❌ post-publish job ${job?.id} failed:`, err.message)
);
dmReplyWorker.on("completed", (job) => console.log(`✅ dm-reply job ${job.id} done`));
dmReplyWorker.on("failed", (job, err) =>
  console.error(`❌ dm-reply job ${job?.id} failed:`, err.message)
);

console.log("🚀 BullMQ workers started. Waiting for jobs...");
