import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const { db } = await import("../db");
  const { concepts, accounts, promptTemplates, posts } = await import("../db/schema");
  const { eq, like, desc } = await import("drizzle-orm");
  const { generatePost } = await import("../lib/ai/gemini");

  console.log("🚀 Starting Product Growth Post Generation...");

  // Allow passing a concept ID or default to the most recently created one
  const conceptList = await db
    .select()
    .from(concepts)
    .where(like(concepts.genre, "%SaaS%"))
    .orderBy(desc(concepts.createdAt))
    .limit(1);

  if (conceptList.length === 0) {
    console.log("No product growth concepts found in DB. Make sure to run seed-product-growth.ts first.");
    process.exit(1);
  }

  const concept = conceptList[0];
  console.log(`Found Product Concept: ${concept.accountName}`);

  // Fetch accounts linked to this concept
  let accountList = await db.select().from(accounts).where(eq(accounts.conceptId, concept.id));
  
  if (accountList.length === 0) {
    console.log("No accounts linked to this concept. Trying to find any account for this tenant...");
    accountList = await db.select().from(accounts).where(eq(accounts.tenantId, concept.tenantId)).limit(1);
    if (accountList.length > 0) {
      console.log(`Linking account ${accountList[0].username} to concept ${concept.id}`);
      await db.update(accounts).set({ conceptId: concept.id }).where(eq(accounts.id, accountList[0].id));
    } else {
      console.log("No accounts found for this tenant.");
      process.exit(1);
    }
  }

  // Fetch product growth prompt templates for this tenant
  const templates = await db
    .select()
    .from(promptTemplates)
    .where(eq(promptTemplates.tenantId, concept.tenantId));

  const productTemplates = templates.filter(t => t.name.startsWith("Product Growth:"));

  if (productTemplates.length === 0) {
    console.log("No Product Growth prompt templates found.");
    process.exit(1);
  }

  console.log(`Found ${productTemplates.length} templates. Generating posts...`);

  // We will generate 1 post for each template for each account
  for (const account of accountList) {
    console.log(`\n--- Generating posts for Account: ${account.username} ---`);
    for (const template of productTemplates) {
      console.log(`Generating using template: ${template.name}...`);
      
      try {
        const generatedContent = await generatePost({
          template: template.template,
          platform: template.platform as "x" | "instagram",
          personality: concept.personality || undefined,
          footerText: concept.footerText || undefined,
          useHashtags: concept.useHashtags || false,
          hashtags: concept.suggestedHashtags as string[] || [],
          // context could be dynamic trendy keywords here, but for product growth the USP is in the template
          context: "Write naturally and engagingly. Ensure you do not sound like a generic bot.",
        });

        // Insert into posts table (pending approval)
        const [newPost] = await db.insert(posts).values({
          tenantId: account.tenantId,
          accountId: account.id,
          content: generatedContent,
          status: "pending_approval",
        }).returning();

        console.log(`✅ Success! Post queued with ID: ${newPost.id}`);
        console.log(`Preview: \n${generatedContent.substring(0, 100)}...\n`);
      } catch (err: any) {
        console.error(`❌ Failed to generate post using ${template.name}:`, err.message);
      }
    }
  }

  console.log("🎉 Post generation complete!");
  process.exit(0);
}

main().catch(console.error);
