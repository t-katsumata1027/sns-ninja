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
  const rawText = result.response.text();
  console.log("Raw Trending Keywords AI Response:", rawText);
  
  let data: any;
  try {
    const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/) || rawText.match(/\[[\s\S]*\]/) || rawText.match(/{[\s\S]*}/);
    const cleanJson = jsonMatch ? jsonMatch[0] : rawText;
    data = JSON.parse(cleanJson);
  } catch (e) {
    console.error("Trending Keywords JSON Parse Error:", e);
    throw new Error("トレンドデータの解析に失敗しました。");
  }

  // Normalize if it's an object instead of array
  if (!Array.isArray(data) && data.keywords && Array.isArray(data.keywords)) {
    data = data.keywords;
  }
  
  if (!Array.isArray(data)) {
    console.error("Trending keywords is still not an array:", data);
    return [];
  }
  
  return data as TrendingKeyword[];
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
  const rawText = result.response.text();
  console.log("Raw Genre Suggestion AI Response:", rawText);

  let data: any;
  try {
    const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/) || rawText.match(/\[[\s\S]*\]/) || rawText.match(/{[\s\S]*}/);
    const cleanJson = jsonMatch ? jsonMatch[0] : rawText;
    data = JSON.parse(cleanJson);
  } catch (e) {
    console.error("Genre Suggestion JSON Parse Error:", e);
    throw new Error("ジャンル提案の解析に失敗しました。");
  }

  // Normalize
  if (!Array.isArray(data) && data.genres && Array.isArray(data.genres)) {
    data = data.genres;
  }
  
  if (!Array.isArray(data)) {
    console.error("Genre suggestions is not an array:", data);
    return [];
  }

  return data as NicheSuggestion[];
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
  const rawText = result.response.text();
  console.log("Raw Market Analysis AI Response:", rawText);

  try {
    const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/) || rawText.match(/{[\s\S]*}/);
    const cleanJson = jsonMatch ? jsonMatch[0] : rawText;
    return JSON.parse(cleanJson) as MarketAnalysis;
  } catch (e) {
    console.error("Market Analysis JSON Parse Error:", e);
    throw new Error("市場分析の解析に失敗しました。");
  }
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
  const rawText = result.response.text();
  console.log("Raw AI Response (Market Research):", rawText);
  
  // Robust JSON extraction
  let data: MarketResearchResult;
  try {
    // Extract JSON if AI wrapped it in markdown
    const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/) || rawText.match(/{[\s\S]*}/);
    const cleanJson = jsonMatch ? jsonMatch[0] : rawText;
    data = JSON.parse(cleanJson);
  } catch (e) {
    console.error("JSON Parse Error:", e);
    throw new Error("AIの応答を解析できませんでした。内容を確認してください。");
  }
  
  // Defensive check with normalized property access
  if (!data.concept || (!data.concept.name && !(data as any).name)) {
    console.error("Data missing concept.name. Actual keys:", Object.keys(data));
    throw new Error("リサーチ結果のデータ構造が正しくありません。AIの生成を再試行してください。");
  }

  // Backup: if concept is flat in the root
  if (!data.concept && (data as any).name) {
    data = {
      concept: {
        name: (data as any).name,
        description: (data as any).description || "",
        bio: (data as any).bio || "",
        identity: (data as any).identity || ""
      },
      strategy: data.strategy || { targetAudience: "", contentMix: { educational: 50, affiliate: 30, personal: 20 }, hashtags: [], recommendedProducts: [] },
      growth: data.growth || { keywords: [], competitorKeywords: [], engagementStrategy: "" }
    } as MarketResearchResult;
  }
  
  return data;
}
