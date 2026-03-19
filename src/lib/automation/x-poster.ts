import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { db } from "@/db";
import { accounts, engagementLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "@/lib/crypto";
import { parseProxyConfig, buildProxyUrl, type ProxyConfig } from "@/lib/proxy";
import { generateContextAwareReply } from "@/lib/ai/gemini";

// Apply stealth plugin globally (fingerprint evasion)
chromium.use(StealthPlugin());

export interface PostToXOptions {
  accountId: string;
  content: string;
}

/**
 * Post a tweet to X using Playwright Stealth with account proxies.
 * Simulates human-like typing speed for anti-detection.
 */
export async function postToX({ accountId, content }: PostToXOptions): Promise<void> {
  // Fetch account config from DB
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);

  if (!account) {
    throw new Error(`Account ${accountId} not found`);
  }
  if (!account.encryptedToken) {
    throw new Error(`Account ${accountId} has no token set`);
  }

  // Proxy setup (residential proxy for IP rotation)
  const proxy = account.proxyConfig
    ? parseProxyConfig(account.proxyConfig)
    : null;

  const browserArgs: { proxy?: { server: string } } = {};
  if (proxy) {
    browserArgs.proxy = { server: buildProxyUrl(proxy) };
  }

  const browser = await chromium.launch({
    headless: true,
    ...browserArgs,
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  });

  const page = await context.newPage();

  try {
    // Decrypt and use auth token via cookie injection
    const token = await decrypt(account.encryptedToken);

    // Navigate to X and authenticate
    await page.goto("https://x.com", { waitUntil: "networkidle" });

    // Set auth cookie (using the decrypted token)
    await context.addCookies([
      {
        name: "auth_token",
        value: token,
        domain: ".x.com",
        path: "/",
        httpOnly: true,
        secure: true,
      },
    ]);

    // Navigate to home after cookie injection
    await page.goto("https://x.com/home", { waitUntil: "networkidle" });

    // Use human behavior utilities
    const { humanType, randomWait, smoothMoveAndClick } = await import("./human-behavior");

    // Click "What's happening?" tweet input
    await smoothMoveAndClick(page, '[data-testid="tweetTextarea_0"]');

    // Human-like typing
    await humanType(page, '[data-testid="tweetTextarea_0"]', content);

    // Short pause before clicking post
    await randomWait(1000, 3000);

    // Click the Post button
    await smoothMoveAndClick(page, '[data-testid="tweetButton"]');

    // Wait for confirmation
    await page.waitForTimeout(3000);

    console.log(`[x-poster] Successfully posted for account ${accountId}`);
  } finally {
    await browser.close();
  }
}

/**
 * Send a Direct Message on X.
 */
export async function sendDmToX({ accountId, targetUserId, content }: { accountId: string; targetUserId: string; content: string }): Promise<void> {
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  if (!account || !account.encryptedToken) throw new Error(`Account ${accountId} not configured`);

  const proxy = account.proxyConfig ? parseProxyConfig(account.proxyConfig) : null;
  const browserArgs: any = { headless: true };
  if (proxy) browserArgs.proxy = { server: buildProxyUrl(proxy) };

  const browser = await chromium.launch(browserArgs);
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const token = await decrypt(account.encryptedToken);
    await context.addCookies([{ name: "auth_token", value: token, domain: ".x.com", path: "/", httpOnly: true, secure: true }]);
    
    await page.goto(`https://x.com/messages/compose?recipient_id=${targetUserId}`, { waitUntil: "networkidle" });
    
    const { humanType, randomWait, smoothMoveAndClick } = await import("./human-behavior");
    
    const dmInputSelector = '[data-testid="dmCompoundAtMentionInput"], [data-testid="dmComposerTextInput"]';
    await smoothMoveAndClick(page, dmInputSelector);
    await humanType(page, dmInputSelector, content);
    await randomWait(1000, 2000);
    
    await smoothMoveAndClick(page, '[data-testid="dmComposerSendButton"]');
    await page.waitForTimeout(2000);
    
    console.log(`[x-poster] DM sent to ${targetUserId}`);
  } finally {
    await browser.close();
  }
}

/**
 * Search X for target keywords, scrape posts, and generate/post context-aware replies.
 */
export async function engageWithKeywordsOnX({
  accountId,
  keywords,
  maxActions,
  contactedUsers
}: {
  accountId: string;
  keywords: string[];
  maxActions: number;
  contactedUsers: Set<string>;
}): Promise<number> {
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  if (!account || !account.encryptedToken) throw new Error(`Account ${accountId} not configured`);

  const proxy = account.proxyConfig ? parseProxyConfig(account.proxyConfig) : null;
  const browserArgs: any = { headless: true };
  if (proxy) browserArgs.proxy = { server: buildProxyUrl(proxy) };

  const browser = await chromium.launch(browserArgs);
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  });
  
  const page = await context.newPage();

  try {
    const token = await decrypt(account.encryptedToken);
    await context.addCookies([{ name: "auth_token", value: token, domain: ".x.com", path: "/", httpOnly: true, secure: true }]);
    
    const { humanType, randomWait, smoothMoveAndClick } = await import("./human-behavior");

    if (keywords.length === 0) return 0;
    
    // Select a random keyword for this cycle
    const keyword = keywords[Math.floor(Math.random() * keywords.length)];
    const searchUrl = `https://x.com/search?q=${encodeURIComponent(keyword)}&src=typed_query&f=live`;
    
    console.log(`[x-poster] Searching X for keyword: "${keyword}"...`);
    await page.goto(searchUrl, { waitUntil: "networkidle" });
    await randomWait(3000, 5000);

    let actionsDone = 0;
    
    // Wait for tweets to load
    await page.waitForSelector('[data-testid="tweet"]', { timeout: 15000 }).catch(() => null);
    
    // Find all tweets currently in DOM
    const tweets = await page.locator('[data-testid="tweet"]').all();

    for (const tweet of tweets) {
      if (actionsDone >= maxActions) break;

      // Ensure the tweet is visible to interact with
      const isVisible = await tweet.isVisible().catch(() => false);
      if (!isVisible) continue;

      // Extract targetUserId from the user profile link
      const userLink = tweet.locator('a[role="link"]').filter({ hasText: '@' }).first();
      let targetUserId = "unknown";
      try {
         const href = await userLink.getAttribute("href");
         if (href) targetUserId = href.replace("/", "").split("?")[0]; // Clean up the handle
      } catch (e) { continue; } 

      // Skip invalid handles or already contacted users or self
      if (!targetUserId || targetUserId === "unknown" || targetUserId === account.username || contactedUsers.has(targetUserId)) {
        continue;
      }

      // Extract Tweet text
      const tweetTextElement = tweet.locator('[data-testid="tweetText"]');
      let tweetContent = "";
      try {
         tweetContent = await tweetTextElement.innerText();
      } catch (e) { continue; } // Skip if no text
      
      if (!tweetContent.trim()) continue;

      console.log(`[x-poster] Found target post from @${targetUserId}: "${tweetContent.substring(0, 50)}..."`);

      // Generate Reply using the shared Gemini AI function
      const replyText = await generateContextAwareReply(tweetContent, account.username);
      
      // Click Reply Icon
      try {
        const replyButton = tweet.locator('[data-testid="reply"]');
        await replyButton.click();
        await randomWait(1500, 3000);

        // Type the reply in the modal
        await humanType(page, '[data-testid="tweetTextarea_0"]', replyText);
        await randomWait(1000, 2000);

        // Click post reply
        await smoothMoveAndClick(page, '[data-testid="tweetButton"]');
        await page.waitForTimeout(3000); // Wait to complete network request
      } catch (e: any) {
        console.warn(`[x-poster] Failed to reply to @${targetUserId}: ${e.message}`);
        // Close modal if it failed halfway
        await page.keyboard.press("Escape");
        await page.waitForTimeout(1000);
        continue;
      }
      
      console.log(`[x-poster] ✅ Replied to @${targetUserId}: "${replyText}"`);

      // Log in the DB
      await db.insert(engagementLogs).values({
        accountId: account.id,
        targetUserId: targetUserId,
        actionType: "reply",
      });

      contactedUsers.add(targetUserId);
      actionsDone++;

      // Wait a significant amount of time between actions to avoid rate limits/ban
      console.log(`[x-poster] Waiting before next action...`);
      await randomWait(8000, 15000);
    }

    return actionsDone;
  } finally {
    await browser.close();
  }
}
