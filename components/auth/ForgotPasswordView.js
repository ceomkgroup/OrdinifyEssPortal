"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FlashBanner } from "@/components/ui/FlashBanner";
import { LogoLoader } from "@/components/ui/Spinner";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  AUTH_FIELD_INPUT,
  AUTH_FIELD_WRAP,
  AuthFooter,
  AuthSplitLayout,
} from "@/components/auth/AuthSplitLayout";

const GENERIC_SENT =
  "If an account exists for this email, you will receive reset instructions shortly.";

export function ForgotPasswordView() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await forgotPassword({ email: email.trim() });
      setSuccess(GENERIC_SENT);
    } catch (err) {
      const status = Number(err?.status) || 0;
      if (!status || status >= 500 || status === 429) {
        setError("Unable to send reset email. Please try again.");
      } else {
        setSuccess(GENERIC_SENT);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout>
      <h1 className="font-[family-name:var(--font-heading)] text-[32px] font-semibold leading-tight text-[var(--text)] md:text-[36px]">
        Forgot Password
      </h1>
      <p className="mt-2 text-[15px] text-[var(--muted)]">
        Enter your email and we&apos;ll send reset instructions.
      </p>

      <form onSubmit={onSubmit} className="mt-9 space-y-5" aria-busy={loading}>
        <div>
          <label className="mb-2 block text-[13px] font-medium text-[var(--text)]">
            Email
          </label>
          <div className={AUTH_FIELD_WRAP}>
            <Mail className="h-4 w-4 text-[var(--muted)]" />
            <input
              type="email"
              required
              autoComplete="email"
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className={AUTH_FIELD_INPUT}
            />
          </div>
        </div>

        {error ? (
          <FlashBanner
            message={error}
            tone="danger"
            compact
            className="rounded-[10px]"
            duration={5000}
            onDismiss={() => setError("")}
          />
        ) : null}
        {success ? (
          <FlashBanner
            message={success}
            tone="success"
            compact
            className="rounded-[10px]"
            duration={8000}
            onDismiss={() => setSuccess("")}
          />
        ) : null}

        <Button
          type="submit"
          className="h-12 w-full rounded-[10px] text-[15px] font-semibold shadow-[0_10px_24px_rgba(123,57,236,0.28)]"
          disabled={loading}
        >
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

      <AuthFooter />
    </AuthSplitLayout>
  );
}
