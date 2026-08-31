import { createBrowserClient } from "@supabase/ssr";

// Persist the auth session across app restarts (including installed PWAs on
// mobile). The cookie is given a long lifetime so it isn't treated as a
// session-only cookie that gets cleared when the app is fully closed.
const COOKIE_MAX_AGE = 60 * 60 * 24 * 400; // 400 days (browser max)

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: {
        maxAge: COOKIE_MAX_AGE,
        sameSite: "lax",
        secure: true,
      },
    }
  );
}
