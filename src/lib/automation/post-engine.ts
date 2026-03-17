import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/db";
import { accounts, concepts, posts } from "@/db/schema";
import { eq } from "drizzle-orm";

const GEMINI_MODEL = "gemini-3.1-flash-lite-preview"; // Optimized for cost and speed

type PostCategory = "educational" | "affiliate" | "personal";

export async function generateDailyPostsForAccount(accountId: string) {
  // 1. Fetch account and concept
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
  if (!account || !account.isActive || !account.conceptId) {
    console.log(`Account ${accountId} is inactive or has no concept linked. Skipping.`);
    return;
  }

  const [concept] = await db.select().from(concepts).where(eq(concepts.id, account.conceptId));
  if (!concept) {
    console.error(`Concept not found for account ${accountId}`);
    return;
  }

  // 2. Determine Number of Posts based on Warming Up Stage
  // stage 1: 1 post/day, stage 2: 2 posts/day, stage 3: 3 posts/day
  const stage = parseInt(account.warmingUpStage || "1", 10);
  const postsCount = Math.min(Math.max(stage, 1), 3);

  console.log(`Generating ${postsCount} posts for ${account.username} (Stage: ${stage})`);

  // 3. Determine Categories based on contentMix
  const mix = concept.contentMix as { educational: number; affiliate: number; personal: number; };
  if (!mix) {
    console.error("No contentMix defined in concept.");
    return;
  }

  const categoriesToGenerate: PostCategory[] = [];
  for (let i = 0; i < postsCount; i++) {
    const rand = Math.random() * 100;
    if (rand < mix.educational) {
      categoriesToGenerate.push("educational");
    } else if (rand < mix.educational + mix.affiliate) {
      categoriesToGenerate.push("affiliate");
    } else {
      categoriesToGenerate.push("personal");
    }
  }

  // 4. Generate Posts
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL, generationConfig: { temperature: 0.9 } });

  const generatedPosts: string[] = [];

  for (const category of categoriesToGenerate) {
    const prompt = buildHybridPrompt(account.platform, category, concept);
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      generatedPosts.push(text);
      
      // Delay to avoid rate limiting
      await new Promise(res => setTimeout(res, 2000));
    } catch (e: any) {
      console.error(`Error generating ${category} post:`, e.message);
    }
  }

  // 5. Save to DB (Status: pending_approval for HITL)
  for (const content of generatedPosts) {
    await db.insert(posts).values({
      tenantId: account.tenantId,
      accountId: account.id,
      content,
      status: "pending_approval", // HITL Requirement
    });
  }

  console.log(`Successfully generated and queued ${generatedPosts.length} posts for ${account.username}.`);
  return generatedPosts;
}

function buildHybridPrompt(platform: string, category: PostCategory, concept: any): string {
  let categoryFocus = "";
  if (category === "educational") {
    categoryFocus = "読者に役立つ有益なノウハウや最新情報を共有する「有益投稿」を作成してください。商品の売り込みは絶対にしないでください。";
  } else if (category === "affiliate") {
    categoryFocus = "読者の悩みを解決する手段として、自然な流れで商品・サービス（ツールの紹介など）を提案する「アフィリエイト（収益化）投稿」を作成してください。過度な売り込み感を出さないこと。";
  } else if (category === "personal") {
    categoryFocus = "運用者の日常の気づきや価値観、失敗談などを共有し、読者と親近感を築く「属人性（パーソナル）投稿」を作成してください。";
  }

  const guidelines = platform === "x" 
    ? "X（Twitter）向けに、140字以内で完結するよう短く、ハッシュタグは1〜2個にし、共感やリツイートを誘うようなパンチの効いた構成にしてください。" 
    : "Instagram向けに、1枚目の画像を引き立てるようなキャッチーな1行目、詳細な本文、そして最後にハッシュタグを5〜10個つけてください。";

  return `
あなたはSNSマーケティングのプロです。以下の設定に従い、SNSの投稿文を作成してください。

[アカウント設定]
ジャンル: ${concept.genre}
ターゲット層: ${concept.targetAudience}
プロフィール文: ${concept.bio}
頻繁に使うハッシュタグ: ${(concept.hashtags || []).join(", ")}

[今回の投稿の目的]
${categoryFocus}

[プラットフォームの規約・ガイドライン]
${guidelines}
絶対に返答には投稿文のテキストのみを出力し、挨拶文や解説を含めないでください。
  `.trim();
}
