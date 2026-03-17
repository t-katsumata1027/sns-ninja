import { GoogleGenerativeAI } from "@google/generative-ai";

export interface NicheSuggestion {
  genre: string;
  reasoning: string;
  profitabilityScore: number; // 0-100
  competitionLevel: "low" | "medium" | "high";
  metrics: {
    profitability: number; // 0-100
    growth: number; // 0-100
    uniqueness: number; // 0-100
    easeOfEntry: number; // 0-100
  };
}

export interface MarketAnalysis {
  trends: string[];
  targetDemographics: string;
  painPoints: string[];
  marketGap: string;
}

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

export interface TrendingKeyword {
  keyword: string;
  category: string;
  trendScore: number; // 0-100
  description: string;
}

const TRENDING_KEYWORDS_PROMPT = `あなたはSNSアフィリエイトのトレンドアナリストです。
今、XやInstagramで「個人が参入して収益化しやすい」かつ「トレンド性が高い」キーワードを8個提案してください。

各提案には以下を含めてください：
- キーワード
- カテゴリ（美容、ガジェット、副業、ライフスタイル、教育など）
- トレンドスコア (0-100)
- 短い解説

出力は必ず以下のJSON形式で行い、日本語で回答してください：
[
  { "keyword": "キーワード", "category": "カテゴリ", "trendScore": 95, "description": "解説" },
  ...
]`;

export async function getTrendingKeywords(): Promise<TrendingKeyword[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite-preview",
    systemInstruction: TRENDING_KEYWORDS_PROMPT,
    generationConfig: { responseMimeType: "application/json" },
  });

  const result = await model.generateContent("最新のトレンドキーワードを提案してください。");
  return JSON.parse(result.response.text()) as TrendingKeyword[];
}

const GENRE_SUGGESTION_PROMPT = `あなたはSNSアフィリエイトの市場分析のエキスパートです。
ユーザーが入力したキーワードに基づき、今SNS（X/Instagram）で参入すべき「具体的に稼げるニッチジャンル」を5つ提案してください。

各提案には以下を含めてください：
- ジャンル名（具体的であるほど良い）
- 推奨理由
- 収益性スコア (0-100)
- 競合レベル (low/medium/high)
- 詳細メトリクス (0-100): 収益性(profitability), 将来性(growth), 独自性(uniqueness), 参入ハードルの低さ(easeOfEntry)

出力は必ず以下のJSON形式で行い、日本語で回答してください：
[
  { 
    "genre": "ジャンル名", 
    "reasoning": "理由", 
    "profitabilityScore": 85, 
    "competitionLevel": "medium",
    "metrics": { "profitability": 90, "growth": 80, "uniqueness": 70, "easeOfEntry": 60 }
  },
  ...
]`;

export async function suggestGenres(keyword: string): Promise<NicheSuggestion[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite-preview",
    systemInstruction: GENRE_SUGGESTION_PROMPT,
    generationConfig: { 
      temperature: 0.9, 
      responseMimeType: "application/json"
    },
  });

  const result = await model.generateContent(`キーワード: ${keyword}`);
  return JSON.parse(result.response.text()) as NicheSuggestion[];
}

export async function analyzeMarket(genre: string, platform: string): Promise<MarketAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey!);
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite-preview",
    systemInstruction: `あなたは「${genre}」ジャンルの市場調査員です。${platform}における最新トレンド、ターゲット属性、悩み（Pain Points）、市場の隙間（Gap）を分析してください。JSON形式で出力してください：{"trends":[], "targetDemographics":"", "painPoints":[], "marketGap":""}`,
    generationConfig: { responseMimeType: "application/json" },
  });

  const result = await model.generateContent("分析を開始してください。");
  return JSON.parse(result.response.text()) as MarketAnalysis;
}

export async function performMarketResearch(
  genre: string,
  platform: "x" | "instagram"
): Promise<MarketResearchResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey!);
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite-preview",
    systemInstruction: `あなたはSNS運用のプロフェッショナルです。
「${genre}」というジャンルに対して、${platform}で収益化を最大化するための完全なアカウント設計図をJSONで出力してください。

出力形式：
{
  "concept": {
    "name": "アカウント名",
    "description": "アカウントの全体像",
    "bio": "魅力的なプロフィール文",
    "identity": "発信者のキャラクター設定"
  },
  "strategy": {
    "targetAudience": "ターゲット層の詳細",
    "contentMix": {
      "educational": 50,
      "affiliate": 30,
      "personal": 20
    },
    "hashtags": ["タグ1", "タグ2"],
    "recommendedProducts": ["アフィリエイト対象商品例"]
  },
  "growth": {
    "keywords": ["検索KW1"],
    "competitorKeywords": ["競合KW1"],
    "engagementStrategy": "初期のファン獲得戦略"
  }
}
必ず日本語で回答し、数値（contentMix）の合計は100にしてください。`,
    generationConfig: { responseMimeType: "application/json" },
  });

  const result = await model.generateContent("最良のアカウント設計図を生成してください。");
  const data = JSON.parse(result.response.text()) as MarketResearchResult;
  
  // Defensive check
  if (!data.concept || !data.concept.name) {
    throw new Error("AIの応答が不完全です。もう一度お試しください。");
  }
  
  return data;
}
