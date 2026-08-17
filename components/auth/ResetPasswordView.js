"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Lock } from "lucide-react";
import { OrdinifyLogo } from "@/components/ui/OrdinifyLogo";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";

export function ResetPasswordView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resetPassword } = useAuth();

  const token = useMemo(
    () => searchParams.get("token") || searchParams.get("resetToken") || "",
    [searchParams]
  );

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("Reset token is missing from the link.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword({
        token,
        password,
        newPassword: password,
        confirmPassword,
      });
      setSuccess(res?.message || "Password reset successfully.");
      setTimeout(() => router.replace("/login"), 1200);
    } catch (err) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-md rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--card-shadow)] sm:p-8">
        <OrdinifyLogo />
        <h1 className="mt-6 font-[family-name:var(--font-heading)] text-2xl font-semibold text-[var(--text)]">
          Reset Password
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Create a new password for your account.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[var(--text)]">
              New Password
            </label>
            <div className="flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-3">
              <Lock className="h-4 w-4 text-[var(--muted)]" />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-0 bg-transparent text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-[var(--muted)]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[var(--text)]">
              Confirm Password
            </label>
            <div className="flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-3">
              <Lock className="h-4 w-4 text-[var(--muted)]" />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border-0 bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          {error ? (
            <p className="rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-[13px] text-[var(--danger)]">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="rounded-lg bg-[var(--success-soft)] px-3 py-2 text-[13px] text-[var(--success)]">
              {success}
            </p>
          ) : null}

          <Button type="submit" className="h-11 w-full" disabled={loading}>
            {loading ? "Saving..." : "Reset Password"}
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
