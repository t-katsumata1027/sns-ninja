import { GoogleGenerativeAI } from "@google/generative-ai";

export interface MarketResearchResult {
  concept: {
    name: string;
    description: string;
    bio: string;
    identity: string;
  };
  strategy: {
    targetAudience: string;
    contentMix: {
      educational: number; // Percentage
      affiliate: number; // Percentage
      personal: number; // Percentage
    };
    hashtags: string[];
    recommendedProducts: string[];
  };
  growth: {
    keywords: string[];
    competitorKeywords: string[];
    engagementStrategy: string;
  };
}

const RESEARCH_SYSTEM_PROMPT = `あなたは、X（旧Twitter）とInstagramでのアフィリエイト収益化、およびアカウント育成のプロフェッショナルです。
ユーザーが指定した「ジャンル」と「プラットフォーム」に基づき、完全なアカウント設計図と市場調査結果を提案してください。

提案には以下の要素を必ず含めてください：
1. アカウントコンセプト：名称、キャッチコピー、プロフィール文（自己紹介）、コアバリュー。
2. 運用戦略：ターゲット層、投稿の比率（有益情報：アフィリエイト：日常）、推奨ハッシュタグ、紹介すべき商品の方向性。
3. 成長戦略：自動いいね・リプライで狙うべきキーワード、競合分析、フォロワー獲得のためのアプローチ。

回答はすべて**日本語**で行い、以下のJSON形式で出力してください：
{
  "concept": {
    "name": "アカウント名案",
    "description": "コンセプトの説明",
    "bio": "プロフィール文（160文字以内）",
    "identity": "アイコンやヘッダーのイメージ"
  },
  "strategy": {
    "targetAudience": "ターゲットとなる読者層",
    "contentMix": { "educational": 50, "affiliate": 30, "personal": 20 },
    "hashtags": ["タグ1", "タグ2"],
    "recommendedProducts": ["紹介すべき商品ジャンル1", "2"]
  },
  "growth": {
    "keywords": ["検索・自動いいねで狙うキーワード1", "2"],
    "competitorKeywords": ["フォローすべき競合アカウントの属性やキーワード"],
    "engagementStrategy": "リプライやいいねの自動化で意識すべきポイント"
  }
}`;

export async function performMarketResearch(
  genre: string,
  platform: "x" | "instagram"
): Promise<MarketResearchResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite-preview", // Using Flash-Lite for better speed and cost
    systemInstruction: RESEARCH_SYSTEM_PROMPT,
    generationConfig: { 
      temperature: 0.8, 
      maxOutputTokens: 2048,
      responseMimeType: "application/json"
    },
  });

  const prompt = `ジャンル: ${genre}\nプラットフォーム: ${platform}\nに基づいて市場調査とアカウント設計を行ってください。`;
  
  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();

  try {
    return JSON.parse(raw) as MarketResearchResult;
  } catch (err) {
    console.error("Failed to parse research result:", raw);
    throw new Error("AIからの回答を解析できませんでした。");
  }
}
