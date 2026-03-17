import { GoogleGenerativeAI } from "@google/generative-ai";

export type DmIntent = "purchase" | "inquiry" | "general";

export interface IntentAnalysisResult {
  intent: DmIntent;
  confidence: number;
  suggestedReplyTemplate: string;
}

const INTENT_SYSTEM_PROMPT = `You are an expert at analyzing customer messages and classifying their intent.
Classify the given message into exactly one of these categories:
- "purchase": User is showing buying intent, asking about prices, wanting to order, or expressing clear interest in purchasing
- "inquiry": User is asking for detailed information, specifications, how it works, etc.
- "general": Generic greeting, casual message, or unclear intent

Respond ONLY with valid JSON in this exact format:
{"intent":"<purchase|inquiry|general>","confidence":<0.0-1.0>,"reason":"<brief reason>"}`;

/**
 * Analyze the intent of an incoming DM message using Gemini.
 */
export async function analyzeIntent(message: string): Promise<IntentAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite-preview",
    systemInstruction: INTENT_SYSTEM_PROMPT,
    generationConfig: { temperature: 0.1, maxOutputTokens: 128 },
  });

  const result = await model.generateContent(`Message to analyze: "${message}"`);
  const raw = result.response.text().trim();

  let parsed: { intent: DmIntent; confidence: number };
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Fallback if JSON is not parseable
    parsed = { intent: "general", confidence: 0.5 };
  }

  const intentTemplates: Record<DmIntent, string> = {
    purchase:
      "ご購入にご興味をお持ちいただきありがとうございます！詳細情報とご購入方法をお送りします。[LINK]",
    inquiry:
      "詳しい情報をお知らせします。ご不明な点があればお気軽にお申し付けください。[LINK]",
    general: "メッセージをいただきありがとうございます！何かご質問などございましたらお気軽にどうぞ。",
  };

  return {
    intent: parsed.intent,
    confidence: parsed.confidence,
    suggestedReplyTemplate: intentTemplates[parsed.intent],
  };
}

/**
 * Generate a personalized DM reply based on intent and context.
 */
export async function generateDmReply(
  originalMessage: string,
  intentResult: IntentAnalysisResult,
  context?: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-pro-preview-03-25",
    systemInstruction:
      "You are a friendly and helpful SNS affiliate marketer responding to direct messages in Japanese. Keep replies concise (under 200 characters), warm, and action-oriented. Do not include emojis excessively.",
    generationConfig: { temperature: 0.7, maxOutputTokens: 256 },
  });

  const prompt = [
    `Original message: "${originalMessage}"`,
    `Intent category: ${intentResult.intent}`,
    `Template to adapt: "${intentResult.suggestedReplyTemplate}"`,
    context ? `Additional context: ${context}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
