"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      // The reset link in the email points at /auth/confirm, which verifies
      // the token_hash to establish a recovery session, then forwards to
      // /reset-password. Requires the "Reset Password" email template to use
      // the token_hash strategy (see deployment notes).
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
      });

      if (error) throw error;

      setSent(true);
      // Intentionally generic so we don't reveal whether an email is registered.
      setMessage(
        "If an account exists for that email, a password reset link is on its way. Check your inbox."
      );
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
            Reset your password
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Enter your email and we&apos;ll send you a link to reset your
            password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Email address
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={sent}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900 disabled:bg-slate-50"
              placeholder="you@example.com"
            />
          </div>

          {message && (
            <div className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
              {message}
            </div>
          )}

          {!sent && (
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          )}
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Remembered your password?
          <Link
            href="/login"
            className="ml-2 font-medium text-slate-900 underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
