import { BarChart3, Clock3, ShieldCheck } from "lucide-react";
import { OrdinifyLogo } from "@/components/ui/OrdinifyLogo";

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

export function AuthSplitLayout({ children }) {
  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
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

      <section className="flex min-h-screen flex-col justify-center bg-[var(--surface)] px-6 py-10 sm:px-10 md:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-[440px]">
          <div className="mb-8 lg:hidden">
            <OrdinifyLogo />
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}

export function AuthFooter() {
  return (
    <div className="mt-10 space-y-1 text-center">
      <p className="text-[13px] text-[var(--muted)]">
        Need help? Contact your HR or administrator.
      </p>
      <p className="text-[12px] text-[var(--muted)]">
        © {new Date().getFullYear()} Ordinify. All rights reserved.
      </p>
    </div>
  );
}

export const AUTH_FIELD_WRAP =
  "flex h-12 items-center gap-2.5 rounded-[10px] border border-[var(--border)] bg-[var(--input-bg)] px-3.5 transition focus-within:border-[var(--violet)] focus-within:bg-[var(--surface)] focus-within:ring-4 focus-within:ring-[rgba(123,57,236,0.15)]";

export const AUTH_FIELD_INPUT =
  "w-full border-0 bg-transparent text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-60";
