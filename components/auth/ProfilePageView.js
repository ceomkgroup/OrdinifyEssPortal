"use client";

import { useMemo, useRef, useState } from "react";
import {
  Briefcase,
  Building2,
  CalendarDays,
  Camera,
  Clock3,
  Hash,
  IdCard,
  Landmark,
  Mail,
  MapPin,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePortalProfile } from "@/hooks/usePortalProfile";
import { formatDate, formatTime, getDisplayName } from "@/lib/format";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "edit", label: "Edit Profile" },
  { id: "security", label: "Security" },
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const MARITAL = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
];

/** PATCH /api/employee/portal/profile allowlist only */
const EDITABLE_KEYS = [
  "firstName",
  "lastName",
  "phoneNumber",
  "maritalStatus",
  "bloodGroup",
  "nationality",
  "religion",
  "dateOfBirth",
  "nationalId",
  "passportNumber",
  "emergencyContactName",
  "emergencyContactPhone",
  "bankAccountNumber",
  "bankAccountTitle",
  "bankName",
  "bankSwiftCode",
  "iban",
  "currentAddress",
  "currentCity",
  "currentCountry",
  "permanentAddress",
  "permanentCity",
  "permanentCountry",
];

function titleCase(value) {
  if (!value) return "—";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function toDateInput(value) {
  if (!value) return "";
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function restDaysLabel(restDays) {
  if (!restDays || typeof restDays !== "object") return "—";
  const map = {
    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
    sat: "Sat",
    sun: "Sun",
  };
  const days = Object.entries(restDays)
    .filter(([, on]) => on)
    .map(([k]) => map[k] || k);
  return days.length ? days.join(", ") : "—";
}

function emptyForm() {
  return Object.fromEntries(EDITABLE_KEYS.map((k) => [k, ""]));
}

function toForm(profile) {
  const form = emptyForm();
  if (!profile) return form;
  for (const key of EDITABLE_KEYS) {
    form[key] =
      key === "dateOfBirth" ? toDateInput(profile[key]) : profile[key] ?? "";
  }
  return form;
}

function Info({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3.5 py-3">
      <p className="text-[11px] text-[var(--muted)]">{label}</p>
      <p
        className="mt-1 break-words text-[13px] font-semibold text-[var(--text)]"
        title={value || "—"}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  as = "input",
  options = [],
}) {
  const base =
    "w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--violet)] focus:bg-[var(--surface)]";

  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-medium text-[var(--muted)]">
        {label}
      </label>
      {as === "select" ? (
        <select
          value={value}
          required={required}
          onChange={(e) => onChange(e.target.value)}
          className={`h-11 ${base}`}
        >
          <option value="">Select</option>
          {options.map((opt) =>
            typeof opt === "string" ? (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ) : (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            )
          )}
        </select>
      ) : as === "textarea" ? (
        <textarea
          value={value}
          required={required}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
          className={`py-2.5 ${base}`}
        />
      ) : (
        <input
          type={type}
          value={value}
          required={required}
          onChange={(e) => onChange(e.target.value)}
          className={`h-11 ${base}`}
        />
      )}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, hint }) {
  return (
    <div className="mb-4 flex items-start gap-2.5">
      <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--lavender-soft)] text-[var(--violet)]">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <h3 className="text-[15px] font-semibold text-[var(--text)]">{title}</h3>
        {hint ? <p className="text-[12px] text-[var(--muted)]">{hint}</p> : null}
      </div>
    </div>
  );
}

export function ProfilePageView() {
  const { changePassword, employee: authEmployee, mergeLocalEmployee } =
    useAuth();
  const {
    profile,
    loading,
    error: loadError,
    update,
    uploadPhoto,
    setProfile,
  } = usePortalProfile();
  const fileRef = useRef(null);

  const [tab, setTab] = useState("overview");
  const [form, setForm] = useState(emptyForm);
  const [formKey, setFormKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pwd, setPwd] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const profileKey = profile
    ? `${profile.employeeId}|${profile.updatedAt}|${profile.photoUrl}|${profile.phoneNumber}`
    : "";

  if (profile && profileKey !== formKey) {
    setFormKey(profileKey);
    setForm(toForm(profile));
  }

  const displayName = getDisplayName(profile || authEmployee);
  const status = String(profile?.status || "active").toLowerCase();
  const settings = profile?.companySettings || {};
  const dateFormat = settings.dateFormat || "DD/MM/YYYY";
  const timeFormat = settings.timeFormat || "12h";

  const summary = useMemo(
    () => [
      { icon: Hash, label: "Code", value: profile?.employeeCode },
      { icon: Briefcase, label: "Department", value: profile?.departmentName?.trim() },
      { icon: UserRound, label: "Designation", value: profile?.designationName?.trim() },
      { icon: Building2, label: "Branch", value: profile?.branchName?.trim() },
      { icon: IdCard, label: "Type", value: titleCase(profile?.employmentType) },
      { icon: CalendarDays, label: "Joined", value: formatDate(profile?.joinDate, dateFormat) },
      { icon: Clock3, label: "Shift", value: profile?.shiftName },
      { icon: Mail, label: "Verified", value: profile?.emailVerified ? "Yes" : "No" },
    ],
    [profile, dateFormat]
  );

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function syncAuthCache(next) {
    if (!next) return;
    mergeLocalEmployee({
      firstName: next.firstName,
      lastName: next.lastName,
      phoneNumber: next.phoneNumber,
      photoUrl: next.photoUrl,
      email: next.email || authEmployee?.email,
      employeeCode: next.employeeCode || authEmployee?.employeeCode,
      departmentName: next.departmentName,
      designationName: next.designationName,
      branchName: next.branchName,
      status: next.status,
    });
  }

  async function onSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {};
      for (const key of EDITABLE_KEYS) {
        const value = form[key];
        payload[key] = value === "" ? null : value;
      }
      const updated = await update(payload);
      const next = { ...(profile || {}), ...(updated || {}), ...payload };
      setProfile(next);
      syncAuthCache(next);
      setMessage("Profile updated successfully.");
      setTab("overview");
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

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

  async function onPhotoSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be under 5MB.");
      return;
    }
    setPhotoSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await uploadPhoto(file);
      const next = { ...(profile || {}), ...(updated || {}) };
      setProfile(next);
      syncAuthCache(next);
      setMessage("Profile photo updated.");
    } catch (err) {
      setError(err.message || "Failed to upload photo");
    } finally {
      setPhotoSaving(false);
    }
  }

  if (loading && !profile) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!profile && loadError) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-[var(--danger)]">{loadError}</p>
      </div>
    );
  }

  const shiftTiming =
    profile?.shiftStartTime && profile?.shiftEndTime
      ? `${formatTime(profile.shiftStartTime, timeFormat)} - ${formatTime(profile.shiftEndTime, timeFormat)}`
      : "—";

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[var(--text)] md:text-[28px]">
            My Profile
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Detailed employee profile from portal API.
          </p>
        </div>
        {tab === "overview" ? (
          <Button
            type="button"
            className="h-10 rounded-xl"
            onClick={() => setTab("edit")}
          >
            Edit Profile
          </Button>
        ) : null}
      </div>

      {error || loadError ? (
        <p className="rounded-xl bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]">
          {error || loadError}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl bg-[var(--success-soft)] px-3 py-2.5 text-sm text-[var(--success)]">
          {message}
        </p>
      ) : null}

      {/* Hero */}
      <Card>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative w-fit shrink-0">
            <Avatar person={profile} name={displayName} size={88} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={photoSaving}
              className="absolute bottom-0 right-0 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--violet)] shadow-sm transition hover:bg-[var(--lavender-soft)] disabled:opacity-60"
              aria-label="Change profile photo"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPhotoSelected}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-[var(--text)] md:text-2xl">
                {displayName || "Employee"}
              </h2>
              <Badge
                variant={status === "active" ? "success" : "danger"}
                className="rounded-full"
              >
                {titleCase(status)}
              </Badge>
            </div>
            <p className="mt-1 break-all text-sm text-[var(--muted)]">
              {profile?.email || "—"}
              {profile?.phoneNumber ? ` · ${profile.phoneNumber}` : ""}
            </p>
            <p className="mt-1 text-[12px] text-[var(--muted)]">
              {profile?.designationName?.trim() || "—"}
              {profile?.departmentName ? ` · ${profile.departmentName.trim()}` : ""}
            </p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={photoSaving}
              className="mt-2 text-[12px] font-semibold text-[var(--violet)] hover:underline disabled:opacity-60"
            >
              {photoSaving ? "Uploading..." : "Change photo"}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summary.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3.5 py-3"
            >
              <div className="mb-1.5 flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-[var(--violet)]" />
                <span className="text-[11px] text-[var(--muted)]">{label}</span>
              </div>
              <p
                className="truncate text-[13px] font-semibold text-[var(--text)]"
                title={String(value || "—")}
              >
                {value || "—"}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[var(--card-shadow)]">
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setMessage("");
                setError("");
                setTab(item.id);
              }}
              className={`min-w-[120px] flex-1 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition ${active
                ? "bg-[var(--violet)] text-white"
                : "text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--text)]"
                }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <SectionTitle
              icon={Briefcase}
              title="Employment"
              hint="Managed by HR — not editable here"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Contract Type" value={profile?.contractType} />
              <Info label="Registration No" value={profile?.registrationNo} />
              <Info
                label="Confirmation Date"
                value={formatDate(profile?.confirmationDate, dateFormat)}
              />
              <Info
                label="Probation Status"
                value={titleCase(profile?.probationStatus)}
              />
              <Info label="Manager" value={profile?.managerName} />
              <Info label="GPS Allowed" value={profile?.gpsAllowed ? "Yes" : "No"} />
              <Info label="Shift Type" value={titleCase(profile?.shiftType)} />
              <Info label="Shift Timing" value={shiftTiming} />
              <Info label="Rest Days" value={restDaysLabel(profile?.restDays)} />
              <Info
                label="Last Login"
                value={
                  profile?.lastLoginAt
                    ? new Date(profile.lastLoginAt).toLocaleString()
                    : "—"
                }
              />
            </div>
          </Card>

          <Card>
            <SectionTitle icon={UserRound} title="Personal" hint="As on file" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Gender" value={titleCase(profile?.gender)} />
              <Info
                label="Date of Birth"
                value={formatDate(profile?.dateOfBirth, dateFormat)}
              />
              <Info label="Marital Status" value={titleCase(profile?.maritalStatus)} />
              <Info label="Blood Group" value={profile?.bloodGroup} />
              <Info label="Nationality" value={profile?.nationality} />
              <Info label="Religion" value={profile?.religion} />
              <Info label="National ID" value={profile?.nationalId} />
              <Info label="Passport" value={profile?.passportNumber} />
            </div>
          </Card>

          <Card>
            <SectionTitle icon={MapPin} title="Address & Emergency" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Current Address" value={profile?.currentAddress} />
              <Info
                label="Current City / Country"
                value={[profile?.currentCity, profile?.currentCountry]
                  .filter(Boolean)
                  .join(", ")}
              />
              <Info label="Permanent Address" value={profile?.permanentAddress} />
              <Info
                label="Permanent City / Country"
                value={[profile?.permanentCity, profile?.permanentCountry]
                  .filter(Boolean)
                  .join(", ")}
              />
              <Info
                label="Emergency Contact"
                value={profile?.emergencyContactName}
              />
              <Info
                label="Emergency Phone"
                value={profile?.emergencyContactPhone}
              />
            </div>
          </Card>

          <Card>
            <SectionTitle icon={Landmark} title="Bank" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Bank Name" value={profile?.bankName} />
              <Info label="Account Title" value={profile?.bankAccountTitle} />
              <Info label="Account Number" value={profile?.bankAccountNumber} />
              <Info label="IBAN" value={profile?.iban} />
              <Info label="Swift Code" value={profile?.bankSwiftCode} />
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "edit" ? (
        <form onSubmit={onSaveProfile} className="grid gap-5">
          <Card>
            <SectionTitle
              icon={UserRound}
              title="Personal details"
              hint="Only fields allowed by portal PATCH"
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field
                label="First Name"
                value={form.firstName}
                onChange={(v) => setField("firstName", v)}
                required
              />
              <Field
                label="Last Name"
                value={form.lastName}
                onChange={(v) => setField("lastName", v)}
                required
              />
              <Field
                label="Phone"
                value={form.phoneNumber}
                onChange={(v) => setField("phoneNumber", v)}
              />
              <Field
                label="Date of Birth"
                type="date"
                value={form.dateOfBirth}
                onChange={(v) => setField("dateOfBirth", v)}
              />
              <Field
                label="Marital Status"
                as="select"
                options={MARITAL}
                value={form.maritalStatus}
                onChange={(v) => setField("maritalStatus", v)}
              />
              <Field
                label="Blood Group"
                as="select"
                options={BLOOD_GROUPS}
                value={form.bloodGroup}
                onChange={(v) => setField("bloodGroup", v)}
              />
              <Field
                label="Nationality"
                value={form.nationality}
                onChange={(v) => setField("nationality", v)}
              />
              <Field
                label="Religion"
                value={form.religion}
                onChange={(v) => setField("religion", v)}
              />
              <Field
                label="National ID"
                value={form.nationalId}
                onChange={(v) => setField("nationalId", v)}
              />
              <Field
                label="Passport Number"
                value={form.passportNumber}
                onChange={(v) => setField("passportNumber", v)}
              />
              <Field
                label="Emergency Contact Name"
                value={form.emergencyContactName}
                onChange={(v) => setField("emergencyContactName", v)}
              />
              <Field
                label="Emergency Contact Phone"
                value={form.emergencyContactPhone}
                onChange={(v) => setField("emergencyContactPhone", v)}
              />
            </div>
          </Card>

          <Card>
            <SectionTitle icon={MapPin} title="Address" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field
                  label="Current Address"
                  as="textarea"
                  value={form.currentAddress}
                  onChange={(v) => setField("currentAddress", v)}
                />
              </div>
              <Field
                label="Current City"
                value={form.currentCity}
                onChange={(v) => setField("currentCity", v)}
              />
              <Field
                label="Current Country"
                value={form.currentCountry}
                onChange={(v) => setField("currentCountry", v)}
              />
              <div className="sm:col-span-2">
                <Field
                  label="Permanent Address"
                  as="textarea"
                  value={form.permanentAddress}
                  onChange={(v) => setField("permanentAddress", v)}
                />
              </div>
              <Field
                label="Permanent City"
                value={form.permanentCity}
                onChange={(v) => setField("permanentCity", v)}
              />
              <Field
                label="Permanent Country"
                value={form.permanentCountry}
                onChange={(v) => setField("permanentCountry", v)}
              />
            </div>
          </Card>

          <Card>
            <SectionTitle icon={Landmark} title="Bank details" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field
                label="Bank Name"
                value={form.bankName}
                onChange={(v) => setField("bankName", v)}
              />
              <Field
                label="Account Title"
                value={form.bankAccountTitle}
                onChange={(v) => setField("bankAccountTitle", v)}
              />
              <Field
                label="Account Number"
                value={form.bankAccountNumber}
                onChange={(v) => setField("bankAccountNumber", v)}
              />
              <Field label="IBAN" value={form.iban} onChange={(v) => setField("iban", v)} />
              <Field
                label="Swift Code"
                value={form.bankSwiftCode}
                onChange={(v) => setField("bankSwiftCode", v)}
              />
            </div>
          </Card>

          <div className="sticky bottom-4 z-10 flex flex-wrap gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--card-shadow)]">
            <Button type="submit" className="h-11 rounded-xl" disabled={saving}>
              {saving ? "Saving..." : "Save All Changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl"
              onClick={() => {
                setForm(toForm(profile));
                setTab("overview");
                setError("");
                setMessage("");
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {tab === "security" ? (
        <Card className="max-w-xl">
          <SectionTitle
            icon={ShieldCheck}
            title="Change password"
            hint="Uses auth change-password API"
          />
          <form onSubmit={onChangePassword} className="grid max-w-md gap-3">
            <Field
              label="Current Password"
              type="password"
              value={pwd.currentPassword}
              onChange={(v) => setPwd((p) => ({ ...p, currentPassword: v }))}
              required
            />
            <Field
              label="New Password"
              type="password"
              value={pwd.newPassword}
              onChange={(v) => setPwd((p) => ({ ...p, newPassword: v }))}
              required
            />
            <Field
              label="Confirm New Password"
              type="password"
              value={pwd.confirmPassword}
              onChange={(v) => setPwd((p) => ({ ...p, confirmPassword: v }))}
              required
            />
            <Button type="submit" className="mt-1 h-11 rounded-xl" disabled={pwdSaving}>
              {pwdSaving ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
