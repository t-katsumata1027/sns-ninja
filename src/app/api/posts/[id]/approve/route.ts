import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { postPublishQueue } from "@/lib/queue/client";

// PATCH /api/posts/[id]/approve
// HITL: Approve a pending_approval post, schedule it for publishing
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: postId } = await params;
  const body = await req.json().catch(() => ({}));
  const { scheduledFor, editedContent } = body;

  // Fetch the post (RLS-safe: only this tenant's posts)
  const [post] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.tenantId, user.id)))
    .limit(1);

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  if (post.status !== "pending_approval") {
    return NextResponse.json({ error: "Post is not pending approval" }, { status: 409 });
  }

  const finalContent = editedContent ?? post.content;
  const scheduledAt = scheduledFor ? new Date(scheduledFor) : new Date();
  const delay = Math.max(0, scheduledAt.getTime() - Date.now());

  // Update status to 'approved' in DB
  await db
    .update(posts)
    .set({
      content: finalContent,
      status: "approved",
      scheduledFor: scheduledAt,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, postId));

  // Enqueue the publish job with optional delay
  await postPublishQueue.add(
    "publish",
    {
      postId,
      accountId: post.accountId,
      tenantId: user.id,
      content: finalContent,
      platform: "x", // TODO: derive from account.platform
    },
    { delay }
  );

  return NextResponse.json({ success: true, scheduledFor: scheduledAt });
}

// PATCH /api/posts/[id]/reject - reject a pending post
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: postId } = await params;

  await db
    .update(posts)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(and(eq(posts.id, postId), eq(posts.tenantId, user.id)));

  return NextResponse.json({ success: true });
}
