import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { generatePost } from "@/lib/ai/gemini";
import { db } from "@/db";
import { promptTemplates, posts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// POST /api/ai/generate
// Body: { prompt_template_id: string, account_id: string, context?: string }
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { prompt_template_id, account_id, context } = body;

  if (!prompt_template_id || !account_id) {
    return NextResponse.json(
      { error: "prompt_template_id and account_id are required" },
      { status: 400 }
    );
  }

  // Fetch prompt template (tenant-scoped)
  const [template] = await db
    .select()
    .from(promptTemplates)
    .where(
      and(
        eq(promptTemplates.id, prompt_template_id),
        eq(promptTemplates.tenantId, user.id)
      )
    )
    .limit(1);

  if (!template) {
    return NextResponse.json({ error: "Prompt template not found" }, { status: 404 });
  }

  // Generate post content with Gemini AI
  const generatedContent = await generatePost({
    template: template.template,
    platform: template.platform as "x" | "instagram",
    context,
  });

  // Save as a pending_approval post (HITL compliant)
  const [newPost] = await db.insert(posts).values({
    tenantId: user.id,
    accountId: account_id,
    content: generatedContent,
    status: "pending_approval",
  }).returning();

  return NextResponse.json({ post: newPost }, { status: 201 });
}
