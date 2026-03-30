import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { db } from "@/db";
import { accounts, engagementLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "@/lib/crypto";
import { parseProxyConfig, buildProxyUrl } from "@/lib/proxy";
import { humanType, randomWait, smoothMoveAndClick } from "./human-behavior";
import { generateContextAwareReply } from "@/lib/ai/gemini";
import * as os from "os";
import * as path from "path";
import { promises as fs } from "fs";

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
    await randomWait(3000, 5000);

    // 1. Click "Create" button (usually the plus icon)
    const createButtonSelector = '[aria-label="New post"], [aria-label="新規投稿"], svg[aria-label="新規投稿"]';
    
    // 2. Select file via filechooser
    let tempFilePath: string | null = null;
    
    if (imageUrl) {
        tempFilePath = path.join(os.tmpdir(), `insta-${Date.now()}.jpg`);
        const imgRes = await fetch(imageUrl);
        const imgBuffer = await imgRes.arrayBuffer();
        await fs.writeFile(tempFilePath, Buffer.from(imgBuffer));
        
        console.log(`[insta-poster] Downloaded image to ${tempFilePath}`);
        
        const [fileChooser] = await Promise.all([
          page.waitForEvent('filechooser'),
          smoothMoveAndClick(page, createButtonSelector)
        ]);
        
        await fileChooser.setFiles(tempFilePath);
        await randomWait(2000, 4000);
        
        // Instagram mobile Web often has a "Next" -> "Next" flow for crop/filter
        const nextButtonSelector = 'button:has-text("次へ"), button:has-text("Next")';
        
        // First Next (Filter screen)
        if (await page.locator(nextButtonSelector).isVisible().catch(() => false)) {
          await smoothMoveAndClick(page, nextButtonSelector);
          await randomWait(1000, 2000);
        }
        
        // Second Next (Caption screen)
        if (await page.locator(nextButtonSelector).isVisible().catch(() => false)) {
          await smoothMoveAndClick(page, nextButtonSelector);
          await randomWait(1000, 2000);
        }
    } else {
        throw new Error("Instagram requires an image to post.");
    }

    // 3. Type Caption
    const captionSelector = 'textarea[aria-label="キャプションを書く..."], textarea[aria-label="Write a caption..."]';
    if (await page.locator(captionSelector).isVisible().catch(() => false)) {
        await humanType(page, captionSelector, content);
    } else {
        console.warn(`[insta-poster] Caption textarea not found. Proceeding anyway.`);
    }

    // 4. Share
    const shareButtonSelector = 'button:has-text("シェア"), button:has-text("Share")';
    await smoothMoveAndClick(page, shareButtonSelector);
    
    await randomWait(8000, 15000); // Wait for upload

    console.log(`[insta-poster] Successfully posted for account ${accountId}`);
    
    // Clean up temp file
    if (tempFilePath) {
       await fs.unlink(tempFilePath).catch(e => console.error("Failed to delete temp file", e));
    }
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

/**
 * Search Instagram for target keywords, scrape recent hashtag posts, and generate/post context-aware comments.
 */
export async function engageWithKeywordsOnInstagram({
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

  // Use mobile emulation for lower detection chance
  const browser = await chromium.launch(browserArgs);
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  });
  
  const page = await context.newPage();

  try {
    const sessionCookie = await decrypt(account.encryptedToken);
    await context.addCookies([{ name: "sessionid", value: sessionCookie, domain: ".instagram.com", path: "/", httpOnly: true, secure: true }]);
    
    if (keywords.length === 0) return 0;
    
    const keyword = keywords[Math.floor(Math.random() * keywords.length)];
    // Instagram hashtag URL format
    const searchUrl = `https://www.instagram.com/explore/tags/${encodeURIComponent(keyword)}/`;
    
    console.log(`[insta-poster] Searching Instagram for keyword: "${keyword}"...`);
    await page.goto(searchUrl, { waitUntil: "networkidle" });
    await randomWait(4000, 6000);

    let actionsDone = 0;
    
    // Wait for posts grid 
    await page.waitForSelector('article a[href^="/p/"]', { timeout: 15000 }).catch(() => null);
    
    const posts = await page.locator('article a[href^="/p/"]').all();

    for (const postLink of posts) {
      if (actionsDone >= maxActions) break;

      const postUrl = await postLink.getAttribute("href");
      if (!postUrl) continue;

      // Navigate to the post individually
      await page.goto(`https://www.instagram.com${postUrl}`, { waitUntil: "networkidle" });
      await randomWait(3000, 5000);

      // Extract username
      let targetUserId = "unknown";
      try {
        const headerLink = page.locator('header a').first();
        const href = await headerLink.getAttribute("href");
        if (href) targetUserId = href.replace(/\//g, "");
      } catch (e) { /* Ignore */ }

      if (!targetUserId || targetUserId === "unknown" || targetUserId === account.username || contactedUsers.has(targetUserId)) {
        await page.goBack({ waitUntil: "networkidle" });
        await randomWait(2000, 3000);
        continue;
      }

      // Extract caption
      let caption = "";
      try {
         // Caption is usually an h1 or span inside the first comment
         caption = await page.locator('h1').innerText().catch(() => "");
         if (!caption) {
             const firstCommentText = await page.locator('ul li span').first().innerText();
             caption = firstCommentText;
         }
      } catch (e) { /* Ignore */ }
      
      console.log(`[insta-poster] Found post from @${targetUserId}: "${caption.substring(0, 50)}..."`);

      // Generate AI comment
      const commentText = await generateContextAwareReply(caption || "SNS", account.username);
      
      // Post comment
      try {
        // Click comment box / button
        const commentButton = page.locator('svg[aria-label="コメント"]');
        if (await commentButton.isVisible().catch(() => false)) {
          await commentButton.click();
          await randomWait(1500, 3000);
        }
        
        const commentBox = page.locator('textarea[placeholder="コメントを追加..."], textarea[placeholder="Add a comment..."]');
        await humanType(page, 'textarea[placeholder="コメントを追加..."], textarea[placeholder="Add a comment..."]', commentText);
        await randomWait(1000, 2000);

        // Submit comment (usually a "post" button or hitting Enter)
        const postButton = page.locator('button:has-text("投稿する"), button:has-text("Post")').first();
        if (await postButton.isVisible().catch(() => false)) {
            await smoothMoveAndClick(page, 'button:has-text("投稿する"), button:has-text("Post")');
        } else {
            await page.keyboard.press('Enter');
        }
        await page.waitForTimeout(4000); // Wait to complete network request
      } catch (e: any) {
        console.warn(`[insta-poster] Failed to comment to @${targetUserId}: ${e.message}`);
        await page.goBack({ waitUntil: "networkidle" });
        await randomWait(2000, 3000);
        continue;
      }
      
      console.log(`[insta-poster] ✅ Commented on @${targetUserId}'s post: "${commentText}"`);

      await db.insert(engagementLogs).values({
        tenantId: account.tenantId,
        accountId: account.id,
        targetUserId: targetUserId,
        actionType: "reply", // Treat comment as reply
      });

      contactedUsers.add(targetUserId);
      actionsDone++;

      await page.goBack({ waitUntil: "networkidle" });
      await randomWait(10000, 20000); // Instagram is very strict, longer wait
    }

    return actionsDone;
  } finally {
    await browser.close();
  }
}
