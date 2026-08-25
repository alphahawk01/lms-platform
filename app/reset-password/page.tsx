"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  // The user arrives here only after /auth/callback established a recovery
  // session. If there's no session, the link was invalid or expired.
  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setMessage(
          "This reset link is invalid or has expired. Please request a new one."
        );
      }
      setCheckingSession(false);
    }

    checkSession();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // Updates the password for the currently authenticated (recovery) user.
      // This persists to Supabase.
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setDone(true);
      setMessage("Your password has been updated. Redirecting you now...");

      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1500);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Set a new password
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Choose a new password for your account.
          </p>
        </div>

        {checkingSession ? (
          <p className="text-sm text-slate-500">Verifying your reset link...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                New password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={done}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900 disabled:bg-slate-50"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Confirm new password
              </label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                disabled={done}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900 disabled:bg-slate-50"
                placeholder="••••••••"
              />
            </div>

            {message && (
              <div className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || done}
              className="w-full rounded-lg bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
