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

// Lazy initializers to avoid connection attempts during build time
let _postPublishQueue: Queue | null = null;
let _dmReplyQueue: Queue | null = null;
let _cronDailyQueue: Queue | null = null;

export function getPostPublishQueue() {
  if (!_postPublishQueue) {
    _postPublishQueue = new Queue("post-publish", {
      connection: redisConnectionOptions,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 60_000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return _postPublishQueue;
}

export function getDmReplyQueue() {
  if (!_dmReplyQueue) {
    _dmReplyQueue = new Queue("dm-reply", {
      connection: redisConnectionOptions,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 30_000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return _dmReplyQueue;
}

export function getCronDailyQueue() {
  if (!_cronDailyQueue) {
    _cronDailyQueue = new Queue("cron-daily", {
      connection: redisConnectionOptions,
      defaultJobOptions: {
        attempts: 1, // Don't retry cron jobs if they fail completely
        removeOnComplete: 10,
        removeOnFail: 100,
      },
    });
  }
  return _cronDailyQueue;
}

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

export type CronDailyJobData = {
  // Empty, just a trigger
};
