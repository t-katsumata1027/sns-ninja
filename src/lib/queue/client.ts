import { Queue } from "bullmq";

// BullMQ bundles its own ioredis. Pass connection options directly (not a Redis instance)
// to avoid version incompatibility between standalone ioredis and BullMQ's bundled version.
// BullMQ connection options using a single connection string
// Lazy validation for REDIS_URL to avoid build-time crashes.
// During build phase, we allow it to be missing with a warning.
const isBuildPhase = process.env.npm_lifecycle_event === "build" || process.env.NEXT_PHASE;

if (!process.env.REDIS_URL) {
  if (isBuildPhase) {
    console.warn("⚠️ Build Phase: REDIS_URL is not defined. Skipping Redis client initialization.");
  } else {
    console.error("❌ CRITICAL: REDIS_URL is not defined in environment variables.");
    process.exit(1);
  }
}

const redisConnectionOptions = {
  connectionString: process.env.REDIS_URL || "", // Default to empty string during build
  maxRetriesPerRequest: null as null,
  enableReadyCheck: false,
};

export { redisConnectionOptions };

// Lazy initializers to avoid connection attempts during build time
let _postPublishQueue: Queue | null = null;
let _dmReplyQueue: Queue | null = null;
let _cronDailyQueue: Queue | null = null;

export function getPostPublishQueue() {
  if (!process.env.REDIS_URL) {
    throw new Error("Cannot getPostPublishQueue: REDIS_URL is not defined.");
  }
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
  if (!process.env.REDIS_URL) {
    throw new Error("Cannot getDmReplyQueue: REDIS_URL is not defined.");
  }
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
  if (!process.env.REDIS_URL) {
    throw new Error("Cannot getCronDailyQueue: REDIS_URL is not defined.");
  }
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
