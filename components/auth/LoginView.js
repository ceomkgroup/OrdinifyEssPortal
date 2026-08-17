"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Clock3,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { OrdinifyLogo } from "@/components/ui/OrdinifyLogo";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Secure & Reliable",
    text: "Your data is protected with enterprise grade security",
  },
  {
    icon: Clock3,
    title: "Real-time Attendance",
    text: "Track attendance in real-time from anywhere",
  },
  {
    icon: BarChart3,
    title: "Smart Insights",
    text: "Get actionable insights and detailed reports",
  },
];

export function LoginView() {
  const { login, authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await login({ email: email.trim(), password });
    } catch (err) {
      setError(err.message || "Login failed");
    }
  }

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      {/* Full-height brand panel */}
      <aside className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-gradient-to-br from-[#8b5cf6] via-[#7b39ec] to-[#4c1d95] px-12 py-12 text-white xl:px-16 lg:flex">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-28 -left-16 h-80 w-80 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute bottom-32 right-16 h-40 w-40 rounded-full bg-white/5" />

        <div className="relative z-10">
          <OrdinifyLogo variant="light" size={44} />

          <h2 className="mt-14 font-[family-name:var(--font-heading)] text-5xl font-semibold leading-none tracking-tight">
            Ordinify
          </h2>
          <p className="mt-4 text-lg font-medium text-white/90">
            HR & Attendance Management System
          </p>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/75">
            Manage attendance, leaves, payroll and employee operations
            seamlessly from one modern employee portal.
          </p>
        </div>

        <div className="relative z-10 space-y-6">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-4">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <Icon className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <div>
                <p className="text-[15px] font-semibold">{title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-white/75">
                  {text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Full-height form panel */}
      <section className="flex min-h-screen flex-col justify-center bg-[var(--surface)] px-6 py-10 sm:px-10 md:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-[440px]">
          <div className="mb-8 lg:hidden">
            <OrdinifyLogo />
          </div>

          <h1 className="font-[family-name:var(--font-heading)] text-[32px] font-semibold leading-tight text-[var(--text)] md:text-[36px]">
            Welcome Back! 👋
          </h1>
          <p className="mt-2 text-[15px] text-[var(--muted)]">
            Login to your account to continue
          </p>

          <form onSubmit={onSubmit} className="mt-9 space-y-5">
            <div>
              <label className="mb-2 block text-[13px] font-medium text-[var(--text)]">
                Email
              </label>
              <div className="flex h-12 items-center gap-2.5 rounded-[10px] border border-[var(--border)] bg-[var(--input-bg)] px-3.5 transition focus-within:border-[var(--violet)] focus-within:bg-[var(--surface)] focus-within:ring-4 focus-within:ring-[rgba(123,57,236,0.15)]">
                <Mail className="h-4 w-4 text-[var(--muted)]" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full border-0 bg-transparent text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-medium text-[var(--text)]">
                Password
              </label>
              <div className="flex h-12 items-center gap-2.5 rounded-[10px] border border-[var(--border)] bg-[var(--input-bg)] px-3.5 transition focus-within:border-[var(--violet)] focus-within:bg-[var(--surface)] focus-within:ring-4 focus-within:ring-[rgba(123,57,236,0.15)]">
                <Lock className="h-4 w-4 text-[var(--muted)]" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border-0 bg-transparent text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-[var(--muted)] hover:text-[var(--text)]"
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
              <p className="rounded-[10px] bg-[var(--danger-soft)] px-3 py-2.5 text-[13px] text-[var(--danger)]">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              className="h-12 w-full rounded-[10px] text-[15px] font-semibold shadow-[0_10px_24px_rgba(123,57,236,0.28)]"
              disabled={authLoading}
            >
              {authLoading ? "Logging in..." : "Login"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-[var(--border)]" />
            <span className="text-[12px] text-[var(--muted)]">or</span>
            <span className="h-px flex-1 bg-[var(--border)]" />
          </div>

          <button
            type="button"
            disabled
            className="flex h-12 w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[14px] font-medium text-[var(--muted)]"
            title="Google login coming soon"
          >
            <GoogleIcon />
            Login with Google
          </button>

          <div className="mt-10 space-y-1 text-center">
            <p className="text-[13px] text-[var(--muted)]">
              Need help? Contact your HR or administrator.
            </p>
            <p className="text-[12px] text-[var(--muted)]">
              © {new Date().getFullYear()} Ordinify. All rights reserved.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.3 4 24 4 16.1 4 9.2 8.5 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.1 39.5 16 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l.1.1 6.3 5.2C39.3 37.3 44 32 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
