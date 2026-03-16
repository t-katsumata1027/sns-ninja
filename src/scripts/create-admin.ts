
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function createAdminAccount() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const email = "admin@sns-ninja.com";
  const password = "SNS-Ninja-Admin-2026!";

  console.log(`Checking account for: ${email}`);

  // Try to sign up
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    console.log("Sign up result:", signUpError.message);
  } else if (signUpData.user) {
    console.log("Account created successfully. User ID:", signUpData.user.id);
  }

  // Always attempt diagnostic sign-in to check exact status
  console.log("Attempting diagnostic sign-in...");
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    console.log(">>> DIAGNOSTIC FAILURE:", signInError.message);
    if (signInError.message.includes("Email not confirmed")) {
      console.log(">>> CAUSE: Email confirmation is REQUIRED. Please confirm the email or disable this requirement in Supabase.");
    }
  } else {
    console.log(">>> DIAGNOSTIC SUCCESS: Sign-in worked. Session active.");
    if (signInData.user) {
        console.log("User ID:", signInData.user.id);
    }
  }
}

createAdminAccount().catch((err) => {
  console.error("Unexpected error:", err);
});
