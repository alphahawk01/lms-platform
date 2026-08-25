"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) throw error;

        setMessage(
          "Account created successfully. Check your email to confirm your account."
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.push("/dashboard");
        router.refresh();
      }
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
    <main className="flex min-h-screen items-center justify-center bg-pd-navy-deep p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-pd-navy p-8 shadow-2xl shadow-black/40">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            PREMIER<span className="text-pd-red">DATA</span>
          </h1>

          <div className="mt-3 h-1 w-12 rounded-full bg-pd-red" />

          <p className="mt-4 text-sm text-slate-300">
            {isSignUp
              ? "Create your account to start your training."
              : "Sign in to continue your training."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isSignUp && (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Full name
              </label>

              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full rounded-lg border border-white/15 bg-pd-navy-surface px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-pd-red"
                placeholder="Your full name"
              />
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Email address
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-white/15 bg-pd-navy-surface px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-pd-red"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-200">
                Password
              </label>

              {!isSignUp && (
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-pd-red hover:text-pd-red-hover"
                >
                  Forgot password?
                </Link>
              )}
            </div>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-white/15 bg-pd-navy-surface px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-pd-red"
              placeholder="••••••••"
            />
          </div>

          {message && (
            <div className="rounded-lg border border-white/10 bg-pd-navy-surface p-3 text-sm text-slate-200">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-pd-red px-4 py-3 font-semibold text-white transition hover:bg-pd-red-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : isSignUp
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          {isSignUp
            ? "Already have an account?"
            : "Don't have an account?"}

          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setMessage("");
            }}
            className="ml-2 font-semibold text-pd-red hover:text-pd-red-hover"
          >
            {isSignUp ? "Sign in" : "Create one"}
          </button>
        </div>
      </div>
    </main>
  );
}