import { Redis } from "ioredis";
import { env } from "./env";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getStageMultiplier } from "./automation/warming-up";

/**
 * Anti-BAN Rate Limiting Configuration
 */

export type SnsAction = "like" | "follow" | "reply" | "retweet" | "dm" | "post";

interface RateLimit {
  minDelaySec: number;
  maxDelaySec: number;
  maxPerHour: number;
}

export const ACTION_LIMITS: Record<SnsAction, RateLimit> = {
  like: { minDelaySec: 90, maxDelaySec: 180, maxPerHour: 50 },
  follow: { minDelaySec: 1800, maxDelaySec: 10800, maxPerHour: 15 },
  reply: { minDelaySec: 180, maxDelaySec: 300, maxPerHour: 8 },
  retweet: { minDelaySec: 120, maxDelaySec: 240, maxPerHour: 10 },
  dm: { minDelaySec: 18, maxDelaySec: 60, maxPerHour: 200 },
  post: { minDelaySec: 180, maxDelaySec: 480, maxPerHour: 8 },
};

const redis = new Redis(env.REDIS_URL);

/**
 * Checks and waits for the rate limit of a specific action for an account.
 * Adjusts limits based on 'warmingUpStage'.
 */
export async function waitForRateLimit(
  accountId: string,
  action: SnsAction
): Promise<void> {
  // 1. Fetch account info to get warming_up_stage
  const [account] = await db
    .select({ warmingUpStage: accounts.warmingUpStage })
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);

  const multiplier = getStageMultiplier(account?.warmingUpStage);
  const baseLimit = ACTION_LIMITS[action];
  
  // Calculate adjusted hourly limit (minimum 1 action)
  const adjustedMaxPerHour = Math.max(1, Math.floor(baseLimit.maxPerHour * multiplier));

  const key = `ratelimit:${accountId}:${action}`;
  const now = Date.now();
  const oneHourAgo = now - 3600 * 1000;

  // 2. Sliding Window check using Redis Sorted Set
  await redis.zremrangebyscore(key, 0, oneHourAgo);
  const currentCount = await redis.zcard(key);

  if (currentCount >= adjustedMaxPerHour) {
    const stageInfo = account?.warmingUpStage ? `(Stage ${account.warmingUpStage})` : "";
    console.warn(
      `⚠️ [rate-limit] Account ${accountId} reached hourly limit ${stageInfo} for "${action}" (${currentCount}/${adjustedMaxPerHour}).`
    );
    throw new Error(`Rate limit reached for ${action} ${stageInfo}. Retrying later via queue.`);
  }

  // 3. Random delay between actions
  const delayMs = Math.floor(
    (Math.random() * (baseLimit.maxDelaySec - baseLimit.minDelaySec) + baseLimit.minDelaySec) * 1000
  );
  
  console.log(
    `[rate-limit] Account ${accountId} action "${action}": waiting ${(delayMs / 1000).toFixed(1)}s (anti-ban)`
  );
  
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  // 4. Record action and cleanup
  await redis.zadd(key, now, `${now}-${Math.random()}`);
  await redis.expire(key, 4000); 
}
