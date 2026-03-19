import { GoogleGenerativeAI, type GenerationConfig, SchemaType } from "@google/generative-ai";
import { env } from "@/lib/env";

const GEMINI_MODEL = "gemini-3.1-flash-lite-preview";

function getGenAI(): GoogleGenerativeAI {
  return new GoogleGenerativeAI(env.GEMINI_API_KEY);
}

export type Platform = "x" | "instagram";
export type PostCategory = "educational" | "affiliate" | "personal";

export interface GeneratePostOptions {
  platform: Platform;
  category?: PostCategory;
  concept?: any;      // Concept from DB
  template?: string;  // Custom template override
  context?: string;
}

const generationConfig: GenerationConfig = {
  temperature: 0.9,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 1024,
};

const categoryFocus: Record<PostCategory, string> = {
  educational: "読者に役立つ有益なノウハウや最新情報を共有する「有益投稿」を作成してください。商品の売り込みは絶対にしないでください。",
  affiliate: "読者の悩みを解決する手段として、自然な流れで商品・サービス（ツールの紹介など）を提案する「アフィリエイト（収益化）投稿」を作成してください。過度な売り込み感を出さないこと。",
  personal: "運用者の日常の気づきや価値観、失敗談などを共有し、読者と親近感を築く「属人性（パーソナル）投稿」を作成してください。",
};

const platformGuidelines: Record<Platform, string> = {
  x: "X（Twitter）向けに、140字以内で完結するよう短く、ハッシュタグは1〜2個にし、共感やリツイートを誘うようなパンチの効いた構成にしてください。",
  instagram: "Instagram向けに、1枚目の画像を引き立てるようなキャッチーな1行目、詳細な本文、そして最後にハッシュタグを5〜10個つけてください。",
};

/**
 * Generate an SNS post using Gemini.
 */
export async function generatePost(options: GeneratePostOptions): Promise<string> {
  const { platform, category, concept, template, context } = options;
  const personality = concept?.personality;
  const footerText = concept?.footerText;
  const useHashtags = concept?.useHashtags;
  const hashtags = concept?.hashtags as string[] | undefined;

  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig,
    systemInstruction: `あなたはSNSマーケティングのプロです。${platformGuidelines[platform]}
${personality ? `トーン・性格設定: ${personality}. ` : ""}
絶対に返答には投稿文のテキストのみを出力し、挨拶文や解説を含めないでください。`,
  });

  const prompt = `
[アカウント設定]
ジャンル: ${concept?.genre || "なし"}
ターゲット層: ${concept?.targetAudience || "なし"}
プロフィール文: ${concept?.bio || "なし"}
頻繁に使うハッシュタグ: ${(hashtags || []).join(", ")}

[今回の投稿の目的]
${category ? categoryFocus[category] : template || "なし"}

${context ? `[追加の文脈]\n${context}` : ""}
  `.trim();

  const result = await model.generateContent(prompt);
  let content = result.response.text().trim();

  // Simple post-processing if necessary
  if (useHashtags && hashtags && hashtags.length > 0 && !content.includes("#")) {
    const selectedTags = hashtags.slice(0, 3).join(" ");
    content += `\n\n${selectedTags}`;
  }

  if (footerText) {
    content += `\n\n${footerText}`;
  }

  return content;
}

/**
 * Suggest hashtags for a product/concept using Gemini (JSON Mode).
 */
export async function suggestHashtags(options: {
  genre: string;
  bio: string;
}): Promise<string[]> {
  const { genre, bio } = options;
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      ...generationConfig,
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          hashtags: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
        },
        required: ["hashtags"],
      },
    },
    systemInstruction: "You are an SNS marketing expert. Suggest the best hashtags for a product. Return a JSON object with a 'hashtags' array of 5-10 strings, each starting with #.",
  });

  const prompt = `Genre: ${genre}\nBiography: ${bio}\n\nSuggest 5-10 Japanese hashtags.`;
  const result = await model.generateContent(prompt);
  const data = JSON.parse(result.response.text());

  return data.hashtags || [];
}

/**
 * Generate a context-aware human-like reply for engagement.
 */
export async function generateContextAwareReply(targetPostContent: string, myAccountName: string): Promise<string> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { ...generationConfig, temperature: 0.7 },
  });

  const prompt = `
あなたは「${myAccountName}」という名前のアカウントを運用している人間です。
以下のSNSの投稿に対して、単なる相槌や絵文字だけでなく、人間味があり、相手が喜んだり感心するような文脈にあった「リプライ（返信）」を生成してください。

【対象の投稿内容】
"${targetPostContent}"

条件：
- 文字数は短め（50文字前後）。
- ハッシュタグは使わない。
- 商品の売り込みや宣伝は絶対にしない。
- 完全に自然な日本語で。
  `;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
