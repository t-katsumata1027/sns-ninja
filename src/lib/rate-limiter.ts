/**
 * Anti-BAN Rate Limiting Configuration
 * Based on PRD guidelines (01-project-overview.md)
 *
 * All limits are enforced in the BullMQ worker before each action.
 */

export type SnsAction = "like" | "follow" | "reply" | "retweet" | "dm" | "post";

interface RateLimit {
  /** Minimum seconds between actions */
  minDelaySec: number;
  /** Maximum seconds between actions */
  maxDelaySec: number;
  /** Max actions per hour */
  maxPerHour: number;
}

/** PRD-defined rate limits per platform action */
export const ACTION_LIMITS: Record<SnsAction, RateLimit> = {
  like: { minDelaySec: 90, maxDelaySec: 180, maxPerHour: 50 },
  follow: { minDelaySec: 1800, maxDelaySec: 10800, maxPerHour: 15 }, // 30min–3hr
  reply: { minDelaySec: 180, maxDelaySec: 300, maxPerHour: 8 },      // 3–5 min
  retweet: { minDelaySec: 120, maxDelaySec: 240, maxPerHour: 10 },   // 2–4 min
  dm: { minDelaySec: 18, maxDelaySec: 60, maxPerHour: 200 },         // Instagram DM cap
  post: { minDelaySec: 180, maxDelaySec: 480, maxPerHour: 8 },       // 3–8 min (general posting)
};

/**
 * Returns a random delay in milliseconds for the given action.
 * Use this BEFORE executing any automated SNS action.
 *
 * @example
 * await delay(getRateLimitDelay("like"));
 * await likePost(postId);
 */
export function getRateLimitDelay(action: SnsAction): number {
  const { minDelaySec, maxDelaySec } = ACTION_LIMITS[action];
  const delaySec = Math.random() * (maxDelaySec - minDelaySec) + minDelaySec;
  return Math.floor(delaySec * 1000);
}

/**
 * Sleep for the rate-limit delay for the given action.
 * Logs the wait time for observability.
 */
export async function waitForRateLimit(action: SnsAction): Promise<void> {
  const delayMs = getRateLimitDelay(action);
  const delaySec = (delayMs / 1000).toFixed(1);
  console.log(`[rate-limit] Action "${action}": waiting ${delaySec}s (anti-ban)`);
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}
