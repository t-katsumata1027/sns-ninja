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
  personality?: string;
  footerText?: string;
  useHashtags?: boolean;
  hashtags?: string[];
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
  const { template, platform, context, personality, footerText, useHashtags, hashtags } = options;
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig,
    systemInstruction: `You are an expert SNS copywriter. ${platformGuidelines[platform]}
${personality ? `Tone/Personality: ${personality}. ` : ""}
Always respond with only the post content, no explanations or meta-text.`,
  });

  let prompt = [
    `Template/Goal: ${template}`,
    context ? `Additional Context: ${context}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  if (useHashtags && hashtags && hashtags.length > 0) {
    prompt += `\nInclude some of these hashtags if appropriate: ${hashtags.join(", ")}`;
  }

  const result = await model.generateContent(prompt);
  let content = result.response.text().trim();

  if (footerText) {
    content += `\n\n${footerText}`;
  }

  return content;
}

/**
 * Suggest hashtags for a product/concept using Gemini.
 */
export async function suggestHashtags(options: {
  genre: string;
  bio: string;
}): Promise<string[]> {
  const { genre, bio } = options;
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { ...generationConfig, temperature: 0.7 },
    systemInstruction: "You are an SNS marketing expert. Suggest the best hashtags for a product given its genre and biography. Return only a comma-separated list of 5-10 hashtags, starting each with #.",
  });

  const prompt = `Genre: ${genre}\nBiography: ${bio}\n\nSuggest 5-10 Japanese hashtags:`;
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  return text
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.startsWith("#"));
}
