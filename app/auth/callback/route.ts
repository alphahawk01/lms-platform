import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the PKCE code exchange for auth links (password recovery, email
// confirmation, etc.). Supabase redirects the user here with a `code` query
// param; we exchange it for a session cookie, then forward to `next`.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // No code or exchange failed: send the user to login with an error flag.
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
