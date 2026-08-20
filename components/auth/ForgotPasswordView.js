"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { OrdinifyLogo } from "@/components/ui/OrdinifyLogo";
import { Button } from "@/components/ui/Button";
import { FlashBanner } from "@/components/ui/FlashBanner";
import { LogoLoader } from "@/components/ui/Spinner";
import { useAuth } from "@/components/auth/AuthProvider";

export function ForgotPasswordView() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await forgotPassword({ email: email.trim() });
      setSuccess(
        res?.message || "Password reset instructions have been sent to your email."
      );
    } catch (err) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-md rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--card-shadow)] sm:p-8">
        <OrdinifyLogo />
        <h1 className="mt-6 font-[family-name:var(--font-heading)] text-2xl font-semibold text-[var(--text)]">
          Forgot Password
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Enter your email and we&apos;ll send reset instructions.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[var(--text)]">
              Email
            </label>
            <div className="flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-3 focus-within:border-[var(--violet)]">
              <Mail className="h-4 w-4 text-[var(--muted)]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full border-0 bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          {error ? (
            <FlashBanner
              message={error}
              tone="danger"
              compact
              duration={5000}
              onDismiss={() => setError("")}
            />
          ) : null}
          {success ? (
            <FlashBanner
              message={success}
              tone="success"
              compact
              duration={5000}
              onDismiss={() => setSuccess("")}
            />
          ) : null}

          <Button type="submit" className="h-11 w-full" disabled={loading}>
            {loading ? (
              <>
                <LogoLoader size="xs" />
                Sending…
              </>
            ) : (
              "Send Reset Link"
            )}
          </Button>
        </form>

        <Link
          href="/login"
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--violet)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
      </div>
    </div>
  );
}
