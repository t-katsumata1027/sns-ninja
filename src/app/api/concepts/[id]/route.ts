import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { concepts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = await req.json();
    
    // Whitelist the fields that can be updated for product growth
    const { 
      productUrl, 
      useHashtags, 
      suggestedHashtags, 
      footerText, 
      personality,
      genre,
      accountName,
      bio,
      targetAudience
    } = body;

    const updated = await db
      .update(concepts)
      .set({
        productUrl,
        useHashtags,
        suggestedHashtags,
        footerText,
        personality,
        genre,
        accountName,
        bio,
        targetAudience,
      })
      .where(and(eq(concepts.id, id), eq(concepts.tenantId, user.id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: "Concept not found" }, { status: 404 });
    }

    return NextResponse.json({ concept: updated[0] });
  } catch (error: any) {
    console.error("[api/concepts/[id]] Error:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const [concept] = await db
      .select()
      .from(concepts)
      .where(and(eq(concepts.id, id), eq(concepts.tenantId, user.id)))
      .limit(1);

    if (!concept) {
      return NextResponse.json({ error: "Concept not found" }, { status: 404 });
    }

    return NextResponse.json({ concept });
  } catch (error: any) {
    console.error("[api/concepts/[id]] GET Error:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
