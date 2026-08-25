import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles email auth links that use the token_hash strategy (recommended for
// SSR / PKCE). Supabase sends the user here with `token_hash` and `type`
// (e.g. type=recovery for password reset). We verify the OTP to establish a
// session, then forward to `next`.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Invalid or expired link: send to login with a clear error flag.
  return NextResponse.redirect(`${origin}/login?error=auth_link_invalid`);
}
