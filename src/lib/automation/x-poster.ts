import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "@/lib/crypto";
import { parseProxyConfig, buildProxyUrl, type ProxyConfig } from "@/lib/proxy";

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

    // Click "What's happening?" tweet input
    const tweetInput = page.locator('[data-testid="tweetTextarea_0"]').first();
    await tweetInput.click();

    // Human-like typing: type each character with random delay
    for (const char of content) {
      await tweetInput.pressSequentially(char, {
        delay: Math.floor(Math.random() * 100) + 50, // 50-150ms per character
      });
    }

    // Short pause before clicking post (human-like)
    await page.waitForTimeout(Math.floor(Math.random() * 2000) + 1000);

    // Click the Post button
    const postButton = page.locator('[data-testid="tweetButton"]').first();
    await postButton.click();

    // Wait for confirmation
    await page.waitForTimeout(3000);

    console.log(`[x-poster] Successfully posted for account ${accountId}`);
  } finally {
    await browser.close();
  }
}
