"use client";

import { useState } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/auth/AuthProvider";

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggleShow,
  autoComplete,
  required = true,
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-medium text-[var(--muted)]">
        {label}
      </label>
      <div className="flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 transition focus-within:border-[var(--violet)] focus-within:bg-[var(--surface)]">
        <input
          type={show ? "text" : "password"}
          value={value}
          required={required}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border-0 bg-transparent text-sm text-[var(--text)] outline-none"
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
 * Shared change-password form for Profile Security + Settings Security tabs.
 */
export function ChangePasswordCard({
  onSuccess,
  onError,
  className = "max-w-xl",
}) {
  const { changePassword } = useAuth();
  const [pwdSaving, setPwdSaving] = useState(false);
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
    if (pwd.newPassword !== pwd.confirmPassword) {
      onError?.("New passwords do not match.");
      setPwdSaving(false);
      return;
    }
    try {
      await changePassword({
        currentPassword: pwd.currentPassword,
        newPassword: pwd.newPassword,
      });
      setPwd({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShow({ current: false, next: false, confirm: false });
      onSuccess?.("Password changed successfully.");
    } catch (err) {
      onError?.(err.message || "Failed to change password");
    } finally {
      setPwdSaving(false);
    }
  }

  return (
    <Card className={className}>
      <div className="mb-4 flex items-start gap-2.5">
        <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--lavender-soft)] text-[var(--violet)]">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <div>
          <h3 className="heading-card">Change password</h3>
          <p className="heading-sub">Update your account password securely</p>
        </div>
      </div>
      <form onSubmit={onChangePassword} className="grid max-w-md gap-3">
        <PasswordField
          label="Current Password"
          value={pwd.currentPassword}
          onChange={(v) => setPwd((p) => ({ ...p, currentPassword: v }))}
          show={show.current}
          onToggleShow={() => setShow((s) => ({ ...s, current: !s.current }))}
          autoComplete="current-password"
        />
        <PasswordField
          label="New Password"
          value={pwd.newPassword}
          onChange={(v) => setPwd((p) => ({ ...p, newPassword: v }))}
          show={show.next}
          onToggleShow={() => setShow((s) => ({ ...s, next: !s.next }))}
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm New Password"
          value={pwd.confirmPassword}
          onChange={(v) => setPwd((p) => ({ ...p, confirmPassword: v }))}
          show={show.confirm}
          onToggleShow={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
          autoComplete="new-password"
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
  );
}
