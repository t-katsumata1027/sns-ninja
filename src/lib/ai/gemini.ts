import { GoogleGenerativeAI, type GenerationConfig } from "@google/generative-ai";

const GEMINI_MODEL = "gemini-3.1-flash-lite-preview";

function getGenAI(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }
  return new GoogleGenerativeAI(apiKey);
}

export type Platform = "x" | "instagram";

export interface GeneratePostOptions {
  template: string;   // Prompt template from DB
  platform: Platform;
  context?: string;   // Optional extra context (e.g., product info)
}

const platformGuidelines: Record<Platform, string> = {
  x: "Write a concise, engaging tweet for X (Twitter). Max 280 characters. Use 1-2 relevant hashtags naturally. Do not use em dashes.",
  instagram: "Write an engaging Instagram caption. Include a hook in the first line, body content, and 5-10 relevant hashtags at the end.",
};

const generationConfig: GenerationConfig = {
  temperature: 0.9,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 1024,
};

/**
 * Generate an SNS post using Gemini.
 * Returns the generated text content.
 */
export async function generatePost(options: GeneratePostOptions): Promise<string> {
  const { template, platform, context } = options;
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig,
    systemInstruction: `You are an expert SNS affiliate marketing copywriter. ${platformGuidelines[platform]}\nAlways respond with only the post content, no explanations or meta-text.`,
  });

  const prompt = [
    `Template/Goal: ${template}`,
    context ? `Additional Context: ${context}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text();
}
