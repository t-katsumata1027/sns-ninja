import { Queue } from "bullmq";

// BullMQ bundles its own ioredis. Pass connection options directly (not a Redis instance)
// to avoid version incompatibility between standalone ioredis and BullMQ's bundled version.
const redisConnectionOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null as null, // Required by BullMQ
  enableReadyCheck: false,
};

// Export for use in worker.ts
export { redisConnectionOptions };

// Queue for publishing posts to X / Instagram
export const postPublishQueue = new Queue("post-publish", {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 60_000 }, // 1m → 2m → 4m
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

// Queue for sending DM replies
export const dmReplyQueue = new Queue("dm-reply", {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 30_000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

export type PostPublishJobData = {
  postId: string;
  accountId: string;
  tenantId: string;
  content: string;
  platform: "x" | "instagram";
};

export type DmReplyJobData = {
  dmId: string;
  accountId: string;
  tenantId: string;
  senderId: string;
  replyContent: string;
  platform: "x" | "instagram";
};
