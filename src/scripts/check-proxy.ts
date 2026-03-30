/**
 * Proxy Connectivity Check Script
 * Usage: npx tsx src/scripts/check-proxy.ts <account_id>
 */

import { chromium } from "playwright";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseProxyConfig } from "@/lib/proxy";

async function checkProxy(accountId: string) {
  console.log(`🔍 Checking proxy for account ${accountId}...`);

  const [account] = await db
    .select({ username: accounts.username, proxyConfig: accounts.proxyConfig })
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);

  if (!account) {
    console.error("❌ Account not found.");
    process.exit(1);
  }

  const proxy = parseProxyConfig(account.proxyConfig);
  if (!proxy) {
    console.warn("⚠️ No proxy configured for this account. Testing with direct connection...");
  }

  const browser = await chromium.launch({
    headless: true,
    proxy: proxy ? {
      server: `${proxy.protocol}://${proxy.host}:${proxy.port}`,
      username: proxy.username,
      password: proxy.password,
    } : undefined,
  });

  try {
    const page = await browser.newPage();
    
    // Use an external IP check service
    console.log("🌐 Navigating to httpbin.org/ip...");
    await page.goto("https://httpbin.org/ip", { timeout: 30000 });
    const ipContent = await page.textContent("body");
    console.log(`✅ Success! External IP: ${ipContent?.trim()}`);

    console.log("📍 Checking location via ipapi.co...");
    await page.goto("https://ipapi.co/json/", { timeout: 30000 });
    const geoContent = await page.textContent("body");
    const geo = JSON.parse(geoContent || "{}");
    console.log(`📍 Location: ${geo.city}, ${geo.country_name} (ISP: ${geo.org})`);

    console.log("\n🚀 Proxy check PASSED.");
  } catch (err: any) {
    console.error(`\n❌ Proxy check FAILED: ${err.message}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

const accountId = process.argv[2];
if (!accountId) {
  console.error("Usage: npx tsx src/scripts/check-proxy.ts <account_id>");
  process.exit(1);
}

checkProxy(accountId).catch(console.error);
