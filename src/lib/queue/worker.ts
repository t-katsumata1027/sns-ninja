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

// ---- Helpers ----

/** Random delay between min and max milliseconds (anti-ban) */
async function humanDelay(minMs: number, maxMs: number): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await new Promise((resolve) => setTimeout(resolve, delay));
}

// ---- post-publish worker ----

export const postPublishWorker = new Worker<PostPublishJobData>(
  "post-publish",
  async (job) => {
    const { postId, accountId, content, platform } = job.data;

    console.log(`[post-publish] Processing job ${job.id} for postId=${postId}`);

    // Anti-ban: random delay of 3–8 minutes before each publish action
    await humanDelay(3 * 60_000, 8 * 60_000);

    if (platform === "x") {
      await postToX({ accountId, content });
    } else if (platform === "instagram") {
      // Instagram poster to be implemented in Week 4
      console.warn(`[post-publish] Instagram posting not yet implemented`);
    }

    console.log(`[post-publish] Job ${job.id} completed successfully`);
    return { success: true };
  },
  {
    connection: redisConnectionOptions,
    concurrency: 1, // Process one post at a time per worker instance
  }
);

// ---- dm-reply worker ----

export const dmReplyWorker = new Worker<DmReplyJobData>(
  "dm-reply",
  async (job) => {
    const { dmId, senderId, replyContent, platform } = job.data;

    console.log(`[dm-reply] Processing job ${job.id} for dmId=${dmId}`);

    // Anti-ban: random delay of 1–3 minutes before sending DM reply
    await humanDelay(60_000, 3 * 60_000);

    // Platform-specific DM sending would be implemented here
    console.log(`[dm-reply] Would send DM to ${senderId} on ${platform}: "${replyContent}"`);

    console.log(`[dm-reply] Job ${job.id} completed successfully`);
    return { success: true };
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
