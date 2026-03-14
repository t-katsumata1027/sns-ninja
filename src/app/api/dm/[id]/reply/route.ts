import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { dmMessages } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { analyzeIntent, generateDmReply } from "@/lib/ai/intent";
import { dmReplyQueue } from "@/lib/queue/client";

// POST /api/dm/[id]/reply
// Analyze intent of a DM and queue an auto-reply
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: dmId } = await params;

  // Fetch the DM
  const [dm] = await db
    .select()
    .from(dmMessages)
    .where(and(eq(dmMessages.id, dmId), eq(dmMessages.tenantId, user.id)))
    .limit(1);

  if (!dm) {
    return NextResponse.json({ error: "DM not found" }, { status: 404 });
  }

  // 1. Analyze intent with Gemini
  const intentResult = await analyzeIntent(dm.message);

  // 2. Generate personalized reply
  const replyContent = await generateDmReply(dm.message, intentResult);

  // 3. Update the DM record with intent category
  await db
    .update(dmMessages)
    .set({ intentCategory: intentResult.intent })
    .where(eq(dmMessages.id, dmId));

  // 4. Enqueue the DM reply job (with anti-ban delay built into worker)
  await dmReplyQueue.add("reply", {
    dmId,
    accountId: dm.accountId,
    tenantId: user.id,
    senderId: dm.senderId,
    replyContent,
    platform: "x", // derived from accountId in a full implementation
  });

  return NextResponse.json({
    intent: intentResult.intent,
    confidence: intentResult.confidence,
    replyContent,
    queued: true,
  });
}
