"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type AuthState = {
  error: string | null;
  status?: "awaiting_confirmation" | "unconfirmed_login_attempt";
  email?: string;
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function signUpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return { error: "Backend isn't configured yet — ask an admin to finish setup." };

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();

  if (!email || !password) return { error: "Email and password are required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName || undefined },
      emailRedirectTo: `${SITE_URL}/auth/callback`,
    },
  });

  if (error) return { error: error.message };

  // `signUp` only returns a live session when email confirmation is disabled
  // project-wide. This project requires confirmation (the Supabase default),
  // so `data.session` is null here even on a fully successful signup —
  // redirecting straight to /dashboard would just bounce the user back to
  // /login through the (app) layout guard with zero explanation. This exact
  // silent bounce is what happened in production on 16/07: the account was
  // created and the confirmation email sent, but the user had no way to know
  // that from the UI and assumed the app was broken.
  if (!data.session) {
    return { error: null, status: "awaiting_confirmation", email };
  }

  redirect("/dashboard");
}

export async function logInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return { error: "Backend isn't configured yet — ask an admin to finish setup." };

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Surface "email not confirmed" distinctly — collapsing every login error
    // into a generic "Invalid email or password" hides the one thing the user
    // can actually act on (go confirm the email that's already in their inbox).
    if (error.code === "email_not_confirmed" || error.message.toLowerCase().includes("email not confirmed")) {
      return { error: null, status: "unconfirmed_login_attempt", email };
    }
    return { error: "Invalid email or password." };
  }

  redirect("/dashboard");
}

export async function resendConfirmationAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return { error: "Backend isn't configured yet — ask an admin to finish setup." };

  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Missing email address." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${SITE_URL}/auth/callback` },
  });

  if (error) return { error: error.message, email };
  return { error: null, status: "awaiting_confirmation", email };
}

export async function logOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
