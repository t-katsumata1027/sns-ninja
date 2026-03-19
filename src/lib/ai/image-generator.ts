import { env } from "@/lib/env";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// For server-side bucket uploads, use Service Role if available, else omit
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function generateAndUploadImage(prompt: string): Promise<string | null> {
  if (!env.FAL_KEY) {
    console.warn("FAL_KEY is not set. Skipping image generation.");
    return null;
  }

  try {
    console.log(`[ImageGen] Generating image for prompt: "${prompt.substring(0, 50)}..."`);
    
    const response = await fetch("https://fal.run/fal-ai/flux/schnell", {
      method: "POST",
      headers: {
        "Authorization": `Key ${env.FAL_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: prompt,
        image_size: "square_hd",
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: true
      })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fal.ai API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const imageUrl = data.images?.[0]?.url;

    if (!imageUrl) {
        throw new Error("No image URL returned from Fal.ai");
    }

    console.log(`[ImageGen] Image generated successfully. Uploading to Supabase...`);

    // Download the image payload
    const imageRes = await fetch(imageUrl);
    const imageBuffer = await imageRes.arrayBuffer();

    // Ensure bucket exists (or try to create it)
    await ensureMediaBucket();

    // Generate unique filename
    const filename = `${crypto.randomUUID()}.jpg`;
    
    // Upload to Supabase Storage (bucket name: "media")
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("media")
      .upload(filename, imageBuffer, {
        contentType: "image/jpeg",
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get Public URL
    const { data: publicUrlData } = supabase.storage
      .from("media")
      .getPublicUrl(filename);

    console.log(`[ImageGen] Uploaded successfully: ${publicUrlData.publicUrl}`);
    return publicUrlData.publicUrl;

  } catch (error: any) {
    console.error("[ImageGen] Failed to generate/upload image:", error.message);
    return null; // Graceful fallback
  }
}

async function ensureMediaBucket() {
    try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const exists = buckets?.some(b => b.name === "media");
        
        if (!exists) {
            console.log("[ImageGen] Creating 'media' storage bucket...");
            await supabase.storage.createBucket("media", { public: true });
        }
    } catch (e) {
        // Just catch and ignore errors here as it might be permission related, 
        // we'll fail exactly on upload if it really doesn't exist
        console.warn("[ImageGen] Could not verify/create media bucket:", (e as any).message);
    }
}
