import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const PRODUCT_NAME = "LogEats (ログイーツ)";
const PRODUCT_URL = "https://www.log-eats.com/";
const PRODUCT_USP = "写真を見るだけでカロリーとPFCバランスを即座に計算。LINE連携で簡単に毎日の食事記録が完了し、過去の食事からのレコーディングダイエットが可能。";
const TARGET_AUDIENCE = "カロリー管理やダイエットが続かない人、手軽に健康管理を始めたい人";

async function main() {
  const { db } = await import("../db");
  const { tenants, accounts, concepts, promptTemplates } = await import("../db/schema");
  const { eq } = await import("drizzle-orm");

  console.log("🌱 Starting Product Growth Seeding...");

  // 1. Get or create a default tenant
  let tenantList = await db.select().from(tenants).limit(1);
  let tenantId: string;
  let accountId: string;

  if (tenantList.length === 0) {
    console.log("No tenants found. Creating a default tenant...");
    const [newTenant] = await db.insert(tenants).values({
      name: "Default Tenant",
    }).returning();
    tenantId = newTenant.id;
  } else {
    tenantId = tenantList[0].id;
    console.log(`Using existing tenant: ${tenantId}`);
  }

  // 2. Create the Concept
  console.log(`Creating concept for product: ${PRODUCT_NAME}...`);
  const [concept] = await db.insert(concepts).values({
    tenantId,
    platform: "x",
    genre: "Health & Diet App / SaaS",
    accountName: `${PRODUCT_NAME} Official`,
    bio: `${PRODUCT_USP} URL: ${PRODUCT_URL}`,
    targetAudience: TARGET_AUDIENCE,
    hashtags: ["#ダイエット", "#カロリー制限", "#レコーディングダイエット", "#LogEats"],
    contentMix: {
      educational: 40,
      engagement: 30,
      product_promotion: 30
    },
    useHashtags: true,
    personality: "熱意があってフレンドリー、かつプロフェッショナル",
    footerText: "--- \n🍴 LogEatsで今日から賢くダイエット！"
  }).returning();
  console.log(`✅ Concept Created: ${concept.id}`);

  // 3. Ensure an Account exists for this tenant
  let accountList = await db.select().from(accounts).where(eq(accounts.tenantId, tenantId)).limit(1);
  if (accountList.length === 0) {
    console.log("No accounts found for tenant. Creating a dummy account...");
    const [newAccount] = await db.insert(accounts).values({
      tenantId,
      conceptId: concept.id,
      platform: "x",
      username: "LogEatsApp",
      isActive: true,
    }).returning();
    accountId = newAccount.id;
  } else {
    accountId = accountList[0].id;
    // Link existing account to this concept
    await db.update(accounts).set({ conceptId: concept.id }).where(eq(accounts.id, accountId));
    console.log(`Using existing account: ${accountId}`);
  }

  // 4. Create Prompt Templates for Product Growth
  console.log("Creating prompt templates...");

  const tipsTemplate = `あなたはダイエット・食事管理の専門家であり、「${PRODUCT_NAME}」の公式PR担当です。
ターゲット層: ${TARGET_AUDIENCE}
プロダクトの強み: ${PRODUCT_USP}
プロダクトURL: ${PRODUCT_URL}

以下の条件に従って、X（旧Twitter）向けの「お役立ち情報（Tips）」投稿を作成してください。
1. 日常で実践しやすいダイエットやカロリー管理に関する豆知識を1つ提供する。（例: 糖質オフのコツ、コンビニ飯の選び方など）
2. 専門用語は避け、親しみやすいトーンで書く。
3. 投稿の最後に、自然な流れで「${PRODUCT_NAME}」を使えばより簡単に実践できることをアピールし、URL(${PRODUCT_URL})へ誘導する。
4. 140文字以内で、改行を見やすく入れる。
5. ハッシュタグを2つ程度つける。`;

  const quizTemplate = `あなたは「${PRODUCT_NAME}」の公式PRアカウントです。
プロダクトURL: ${PRODUCT_URL}

以下の条件に従って、X（旧Twitter）向けの「カロリークイズ」投稿を作成してください。
1. 定番の食べ物や飲み物（例：スタバのフラペチーノ、吉野家の牛丼など）を取り上げ、「これ、何キロカロリーかわかる？」といったクイズを出す。
2. ユーザーにリプライや引用RTで予想させるように促す。
3. 「答え合わせや、普段の食事のカロリー計算は ${PRODUCT_NAME} で試してみて！」という形で、URL(${PRODUCT_URL})を自然に案内する。
4. 短く、ポップで興味を惹く文章にする。
5. 絵文字を適度に使用する。`;

  const promoTemplate = `あなたは「${PRODUCT_NAME}」の公式PRアカウントです。
プロダクトの強み: ${PRODUCT_USP}
プロダクトURL: ${PRODUCT_URL}

以下の条件に従って、X（旧Twitter）向けの「直接的な機能紹介」投稿を作成してください。
1. ユーザーのペイン（課題）に共感する一文から始める。（例: 「カロリー計算、毎日続けるのは面倒ですよね…」）
2. ${PRODUCT_NAME} の最大の特徴（写真からのAI計算、LINE連携など）を簡潔に紹介し、課題をどう解決するかを伝える。
3. すぐに使ってみるようCTA（Call To Action）を配置し、URL(${PRODUCT_URL})へ誘導する。
4. ベネフィット（得られる良いこと）を強調する。`;

  const templates = [
    { name: "Product Growth: Diet Tips", template: tipsTemplate, platform: "x", tenantId },
    { name: "Product Growth: Calorie Quiz", template: quizTemplate, platform: "x", tenantId },
    { name: "Product Growth: Direct Promo", template: promoTemplate, platform: "x", tenantId },
  ];

  for (const t of templates) {
    const [inserted] = await db.insert(promptTemplates).values(t).returning();
    console.log(`✅ Prompt Template Created: ${inserted.name} (${inserted.id})`);
  }

  console.log("🎉 Seeding complete!");
  process.exit(0);
}

main().catch(console.error);
