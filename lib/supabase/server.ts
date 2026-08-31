import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Long-lived cookie so sessions persist across app restarts (installed PWAs).
const COOKIE_MAX_AGE = 60 * 60 * 24 * 400; // 400 days (browser max)

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: {
        maxAge: COOKIE_MAX_AGE,
        sameSite: "lax",
        secure: true,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Cookies cannot be set from some Server Component contexts.
            // The proxy (proxy.ts) handles refreshing the auth session.
          }
        },
      },
    }
  );
}