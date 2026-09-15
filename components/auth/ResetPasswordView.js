"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Lock } from "lucide-react";
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

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggle,
  disabled,
  autoComplete,
  placeholder,
}) {
  return (
    <div>
      <label className="mb-2 block text-[13px] font-medium text-[var(--text)]">
        {label}
      </label>
      <div className={AUTH_FIELD_WRAP}>
        <Lock className="h-4 w-4 text-[var(--muted)]" />
        <input
          type={visible ? "text" : "password"}
          required
          minLength={6}
          autoComplete={autoComplete}
          disabled={disabled}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={AUTH_FIELD_INPUT}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={onToggle}
          className="text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-50"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

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
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setSuccess("");

    if (!token) {
      setError("This reset link is invalid or incomplete.");
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
    <AuthSplitLayout>
      <h1 className="font-[family-name:var(--font-heading)] text-[32px] font-semibold leading-tight text-[var(--text)] md:text-[36px]">
        Reset Password
      </h1>
      <p className="mt-2 text-[15px] text-[var(--muted)]">
        {token
          ? "Create a new password for your account."
          : "This reset link is missing or incomplete."}
      </p>

      {!token ? (
        <div className="mt-9 space-y-5">
          <FlashBanner
            message="Open the reset link from your email, or request a new one. This page cannot reset a password without a valid token."
            tone="warning"
            compact
            className="rounded-[10px]"
            autoDismiss={false}
          />
          <Link
            href="/forgot-password"
            className="inline-flex h-12 w-full items-center justify-center rounded-[10px] bg-[var(--btn-primary-bg)] text-[15px] font-semibold text-[var(--btn-primary-text)] shadow-[0_10px_24px_rgba(123,57,236,0.28)]"
          >
            Request a new reset link
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-9 space-y-5" aria-busy={loading}>
          <PasswordField
            label="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            visible={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
            disabled={loading}
            autoComplete="new-password"
            placeholder="At least 6 characters"
          />
          <PasswordField
            label="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            visible={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
            disabled={loading}
            autoComplete="new-password"
            placeholder="Re-enter your new password"
          />

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
              duration={5000}
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
                Saving…
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </form>
      )}

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
