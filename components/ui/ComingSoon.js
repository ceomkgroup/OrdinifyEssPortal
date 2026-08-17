import { Card } from "@/components/ui/Card";

export function ComingSoon({ title, description }) {
  return (
    <div className="mx-auto max-w-2xl pt-10">
      <Card>
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[var(--text)]">
          {title}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {description || "This screen will be built next. Dashboard is ready."}
        </p>
      </Card>
    </div>
  );
}
