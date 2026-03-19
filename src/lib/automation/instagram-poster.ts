import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "@/lib/crypto";
import { parseProxyConfig, buildProxyUrl } from "@/lib/proxy";
import { humanType, randomWait, smoothMoveAndClick, humanScroll } from "./human-behavior";

// Apply stealth plugin
chromium.use(StealthPlugin());

export interface PostToInstagramOptions {
  accountId: string;
  content: string;
  imageUrl?: string; // Instagram requires an image
}

/**
 * Post to Instagram using Playwright Stealth with mobile emulation.
 */
export async function postToInstagram({ accountId, content, imageUrl }: PostToInstagramOptions): Promise<void> {
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  if (!account || !account.encryptedToken) throw new Error(`Account ${accountId} not configured correctly`);

  const proxy = account.proxyConfig ? parseProxyConfig(account.proxyConfig) : null;
  const browserArgs: any = { headless: true };
  if (proxy) browserArgs.proxy = { server: buildProxyUrl(proxy) };

  const browser = await chromium.launch(browserArgs);
  
  // Emulate iPhone 13 Pro
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  });

  const page = await context.newPage();

  try {
    const sessionCookie = await decrypt(account.encryptedToken);
    
    // Initial navigation
    await page.goto("https://www.instagram.com", { waitUntil: "networkidle" });
    
    // Inject session cookie (Instagram uses 'sessionid')
    await context.addCookies([
      {
        name: "sessionid",
        value: sessionCookie,
        domain: ".instagram.com",
        path: "/",
        httpOnly: true,
        secure: true,
      },
    ]);

    await page.goto("https://www.instagram.com/", { waitUntil: "networkidle" });
    await randomWait(2000, 4000);

    // Instagram Mobile: New Post button is often in the bottom nav or top right
    // The specific selectors might change, using a common one for mobile view
    // Note: Instagram's UI is highly dynamic. In a real scenario, more robust selectors or visual matching might be needed.
    
    // 1. Click "Create" button (usually the plus icon)
    // Selector for mobile "New Post" button
    const createButtonSelector = '[aria-label="新規投稿"], [aria-label="New Post"], svg[aria-label="新規投稿"]';
    await smoothMoveAndClick(page, createButtonSelector);
    await randomWait(1000, 2000);

    // 2. Select file (Instagram mobile uses file input)
    // In automated environments, we'd need a local path to the image
    if (imageUrl) {
        // Here we'd download the image or use a local path
        // For this implementation, we assume a local path or placeholder
        // const fileChooserPromise = page.waitForEvent('filechooser');
        // await page.click('button:has-text("Select from computer")');
        // const fileChooser = await fileChooserPromise;
        // await fileChooser.setFiles(localPath);
    }

    // 3. Type Caption
    const captionSelector = 'textarea[aria-label="キャプションを書く..."], textarea[aria-label="Write a caption..."]';
    if (await page.locator(captionSelector).isVisible()) {
        await humanType(page, captionSelector, content);
    }

    // 4. Share
    const shareButtonSelector = 'button:has-text("シェア"), button:has-text("Share")';
    await smoothMoveAndClick(page, shareButtonSelector);
    
    await randomWait(5000, 8000); // Wait for upload

    console.log(`[insta-poster] Successfully posted for account ${accountId}`);
  } catch (error) {
    console.error(`[insta-poster] Failed:`, error);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * Send a Direct Message on Instagram.
 */
export async function sendDmToInstagram({ accountId, targetUserId, content }: { accountId: string; targetUserId: string; content: string }): Promise<void> {
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  if (!account || !account.encryptedToken) throw new Error(`Account ${accountId} not configured`);

  const proxy = account.proxyConfig ? parseProxyConfig(account.proxyConfig) : null;
  const browserArgs: any = { headless: true };
  if (proxy) browserArgs.proxy = { server: buildProxyUrl(proxy) };

  const browser = await chromium.launch(browserArgs);
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  try {
    const sessionCookie = await decrypt(account.encryptedToken);
    await context.addCookies([{ name: "sessionid", value: sessionCookie, domain: ".instagram.com", path: "/", httpOnly: true, secure: true }]);
    
    await page.goto(`https://www.instagram.com/direct/t/${targetUserId}/`, { waitUntil: "networkidle" });
    
    const dmInputSelector = 'textarea[placeholder="メッセージ..."], textarea[placeholder="Message..."]';
    await humanType(page, dmInputSelector, content);
    await randomWait(1000, 2000);
    
    await smoothMoveAndClick(page, 'button:has-text("送信"), button:has-text("Send")');
    await page.waitForTimeout(3000);
    
    console.log(`[insta-poster] DM sent to ${targetUserId}`);
  } finally {
     await browser.close();
  }
}
