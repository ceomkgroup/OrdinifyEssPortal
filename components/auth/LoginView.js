"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
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

export function LoginView() {
  const { login, authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    if (authLoading) return;
    setError("");
    try {
      await login({ email: email.trim(), password });
    } catch (err) {
      setError(err.message || "Login failed");
    }
  }

  return (
    <AuthSplitLayout>
      <h1 className="font-[family-name:var(--font-heading)] text-[32px] font-semibold leading-tight text-[var(--text)] md:text-[36px]">
        Welcome Back! 👋
      </h1>
      <p className="mt-2 text-[15px] text-[var(--muted)]">
        Login to your account to continue
      </p>

      <form onSubmit={onSubmit} className="mt-9 space-y-5" aria-busy={authLoading}>
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
              disabled={authLoading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className={AUTH_FIELD_INPUT}
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-[13px] font-medium text-[var(--text)]">
            Password
          </label>
          <div className={AUTH_FIELD_WRAP}>
            <Lock className="h-4 w-4 text-[var(--muted)]" />
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              disabled={authLoading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={AUTH_FIELD_INPUT}
            />
            <button
              type="button"
              disabled={authLoading}
              onClick={() => setShowPassword((v) => !v)}
              className="text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-50"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <div className="mt-2.5 flex justify-end">
            <Link
              href="/forgot-password"
              className="text-[12.5px] font-semibold text-[var(--text)] hover:text-[var(--violet)]"
            >
              Forgot Password?
            </Link>
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

        <Button
          type="submit"
          className="h-12 w-full rounded-[10px] text-[15px] font-semibold shadow-[0_10px_24px_rgba(123,57,236,0.28)]"
          disabled={authLoading}
        >
          {authLoading ? (
            <>
              <LogoLoader size="xs" />
              Signing in…
            </>
          ) : (
            "Login"
          )}
        </Button>
      </form>

      <AuthFooter />
    </AuthSplitLayout>
  );
}
