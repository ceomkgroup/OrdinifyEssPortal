"use client";

import { useState } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FlashBanner } from "@/components/ui/FlashBanner";
import { useAuth } from "@/components/auth/AuthProvider";

function PasswordField({
  label,
  value,
  onChange,
  required = false,
  autoComplete,
  show,
  onToggleShow,
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-medium text-[var(--muted)]">
        {label}
      </label>
      <div className="flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 transition focus-within:border-[var(--violet)] focus-within:bg-[var(--surface)] focus-within:ring-2 focus-within:ring-[var(--lavender-soft)]">
        <input
          type={show ? "text" : "password"}
          value={value}
          required={required}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--text)] outline-none"
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="shrink-0 text-[var(--muted)] hover:text-[var(--text)]"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

/**
 * Change-password form with show/hide toggles.
 * Used under Profile → Security and Settings → Security.
 */
export function SecurityPasswordView({
  title = "Security",
  subtitle = "Update your account password.",
}) {
  const { changePassword } = useAuth();
  const [pwdSaving, setPwdSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pwd, setPwd] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [show, setShow] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  async function onChangePassword(e) {
    e.preventDefault();
    setPwdSaving(true);
    setError("");
    setMessage("");
    if (pwd.newPassword !== pwd.confirmPassword) {
      setError("New passwords do not match.");
      setPwdSaving(false);
      return;
    }
    try {
      await changePassword({
        currentPassword: pwd.currentPassword,
        newPassword: pwd.newPassword,
      });
      setMessage("Password changed successfully.");
      setPwd({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setError(err.message || "Failed to change password");
    } finally {
      setPwdSaving(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[var(--text)] md:text-[28px]">
          {title}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
      </div>

      {error ? (
        <FlashBanner
          message={error}
          tone="danger"
          duration={5000}
          onDismiss={() => setError("")}
        />
      ) : null}
      {message ? (
        <FlashBanner
          message={message}
          tone="success"
          duration={4000}
          onDismiss={() => setMessage("")}
        />
      ) : null}

      <Card className="max-w-xl">
        <div className="mb-4 flex items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--lavender-soft)] text-[var(--violet)]">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <h3 className="heading-card">Change password</h3>
            <p className="heading-sub">
              Use show/hide to verify what you type
            </p>
          </div>
        </div>
        <form onSubmit={onChangePassword} className="grid max-w-md gap-3">
          <PasswordField
            label="Current Password"
            value={pwd.currentPassword}
            onChange={(v) => setPwd((p) => ({ ...p, currentPassword: v }))}
            required
            autoComplete="current-password"
            show={show.current}
            onToggleShow={() =>
              setShow((s) => ({ ...s, current: !s.current }))
            }
          />
          <PasswordField
            label="New Password"
            value={pwd.newPassword}
            onChange={(v) => setPwd((p) => ({ ...p, newPassword: v }))}
            required
            autoComplete="new-password"
            show={show.next}
            onToggleShow={() => setShow((s) => ({ ...s, next: !s.next }))}
          />
          <PasswordField
            label="Confirm New Password"
            value={pwd.confirmPassword}
            onChange={(v) => setPwd((p) => ({ ...p, confirmPassword: v }))}
            required
            autoComplete="new-password"
            show={show.confirm}
            onToggleShow={() =>
              setShow((s) => ({ ...s, confirm: !s.confirm }))
            }
          />
          <Button
            type="submit"
            className="mt-1 h-11 rounded-xl"
            disabled={pwdSaving}
          >
            {pwdSaving ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
