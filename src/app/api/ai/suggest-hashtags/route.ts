import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { suggestHashtags } from "@/lib/ai/gemini";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { genre, bio } = await req.json();

    if (!genre || !bio) {
      return NextResponse.json({ error: "genre and bio are required" }, { status: 400 });
    }

    const hashtags = await suggestHashtags({ genre, bio });

    return NextResponse.json({ hashtags });
  } catch (error: any) {
    console.error("[api/ai/suggest-hashtags] Error:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
