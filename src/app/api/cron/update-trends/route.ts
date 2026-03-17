import { getTrendingKeywords } from "@/lib/ai/research";
import { db } from "@/db";
import { trendCache } from "@/db/schema";
import { NextResponse } from "next/server";

export const maxDuration = 60; // AI can be slow

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    console.log("Cron: Updating trending keywords cache...");
    const keywords = await getTrendingKeywords();
    
    await db.insert(trendCache).values({
      id: "trending_keywords",
      data: keywords,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: trendCache.id,
      set: {
        data: keywords,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, updated: keywords.length });
  } catch (error: any) {
    console.error("Cron Trend Update Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
