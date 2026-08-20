"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Construction,
  Hourglass,
  Inbox,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";
import { useDashboard } from "@/hooks/useDashboard";
import { REQUEST_TYPES } from "@/lib/request-types";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "soon", label: "Coming soon" },
];

const ACCENTS = [
  "#7b39ec",
  "#2563eb",
  "#059669",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#ca8a04",
  "#e11d48",
];

function accentAt(index) {
  return ACCENTS[index % ACCENTS.length];
}

function FilterPills({ value, onChange, counts }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-1">
      {FILTERS.map((item) => {
        const active = value === item.value;
        const count = counts?.[item.value];
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={`rounded-xl px-3 py-1.5 text-[12px] font-semibold transition ${
              active
                ? "bg-[var(--surface)] text-[var(--violet)] shadow-[var(--card-shadow)]"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            {item.label}
            {typeof count === "number" ? (
              <span
                className={`ml-1.5 tabular-nums ${
                  active ? "text-[var(--violet)]" : "text-[var(--muted)]"
                }`}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function RequestModuleCard({ tile, count, accent, loading }) {
  const Icon = tile.icon || Inbox;
  const pending = Number(count) || 0;
  const hasPending = pending > 0;

  return (
    <Link
      href={tile.href}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-dashed border-[var(--violet)]/35 bg-gradient-to-br from-[var(--lavender-soft)] via-[var(--surface)] to-[var(--violet-soft)] p-4 shadow-[var(--card-shadow)] transition hover:border-[var(--violet)]/55 hover:shadow-[0_10px_28px_rgba(123,57,236,0.1)]"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl"
        style={{ background: `${accent}22` }}
      />

      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ background: accent }}
            >
              <Icon className="h-4 w-4" />
            </span>
            <p className="truncate text-[14px] font-semibold text-[var(--text)]">
              {tile.title}
            </p>
          </div>
          <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-[var(--muted)]">
            {tile.description}
          </p>
        </div>
        {tile.live ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--success)]/20 bg-[var(--success-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--success)]">
            <CheckCircle2 className="h-3 w-3" />
            Live
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--warning)]/20 bg-[var(--warning-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--warning)]">
            <Construction className="h-3 w-3" />
            Soon
          </span>
        )}
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-[var(--surface)]/80 px-3 py-2.5 ring-1 ring-[var(--border)]">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Pending
          </p>
          <p
            className="mt-0.5 text-[16px] font-bold tabular-nums"
            style={{ color: hasPending ? "var(--warning)" : accent }}
          >
            {loading ? "—" : pending}
          </p>
        </div>
        <div className="rounded-xl bg-[var(--surface)]/80 px-3 py-2.5 ring-1 ring-[var(--border)]">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Module
          </p>
          <p className="mt-0.5 text-[16px] font-bold tabular-nums text-[var(--text)]">
            {tile.live ? "Ready" : "Soon"}
          </p>
        </div>
      </div>

      <div className="relative mt-auto flex pt-4">
        <span className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-[var(--btn-outline-border)] bg-[var(--surface)] text-[13px] font-semibold text-[var(--btn-outline-text)] transition group-hover:border-[var(--violet)] group-hover:bg-[var(--lavender-soft)] group-hover:text-[var(--violet)]">
          {tile.live ? "Open" : "Preview"}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

export default function RequestsPage() {
  const { canShowRequestTile, loading: modulesLoading } = useModules();
  const { data, loading: dashLoading, refetch } = useDashboard();
  const [filter, setFilter] = useState("all");

  const pending = data?.pendingRequests || {};
  const visible = useMemo(
    () => REQUEST_TYPES.filter((tile) => canShowRequestTile(tile.key)),
    [canShowRequestTile]
  );

  const liveCount = visible.filter((t) => t.live).length;
  const soonCount = visible.filter((t) => !t.live).length;
  const pendingTotal = visible.reduce(
    (sum, tile) => sum + (Number(pending[tile.key]) || 0),
    0
  );

  const filtered = useMemo(() => {
    if (filter === "live") return visible.filter((t) => t.live);
    if (filter === "soon") return visible.filter((t) => !t.live);
    return visible;
  }, [filter, visible]);

  if (!modulesLoading && visible.length === 0) {
    return (
      <ComingSoon
        title="Requests"
        description="No request modules are enabled for your company yet."
      />
    );
  }

  if (modulesLoading && visible.length === 0) {
    return <PageLoader label="Loading requests" hint="Checking enabled modules…" />;
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--card-shadow)] md:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[var(--lavender-soft)] opacity-70 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-[var(--violet-soft)] opacity-50 blur-2xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--lavender-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--violet)]">
              <Sparkles className="h-3.5 w-3.5" />
              Requests hub
            </div>
            <h1 className="mt-2 font-[family-name:var(--font-heading)] text-[26px] font-semibold tracking-tight text-[var(--text)] md:text-[30px]">
              All requests
            </h1>
            <p className="mt-1 max-w-xl text-[13px] text-[var(--muted)]">
              Same overview style as Leave — pending counts, live modules, and
              quick open for every request type enabled for your company.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl"
              onClick={refetch}
            >
              Refresh
            </Button>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            {
              label: "Pending total",
              value: dashLoading ? "…" : String(pendingTotal),
              icon: Hourglass,
              soft: "bg-[var(--warning-soft)]",
              tone: "text-[var(--warning)]",
            },
            {
              label: "Live modules",
              value: String(liveCount),
              icon: CheckCircle2,
              soft: "bg-[var(--success-soft)]",
              tone: "text-[var(--success)]",
            },
            {
              label: "Coming soon",
              value: String(soonCount),
              icon: Construction,
              soft: "bg-[var(--lavender-soft)]",
              tone: "text-[var(--violet)]",
            },
            {
              label: "Request types",
              value: String(visible.length),
              icon: Layers,
              soft: "bg-[var(--info-soft)]",
              tone: "text-[var(--info)]",
            },
          ].map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 px-3.5 py-3 backdrop-blur"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${kpi.soft} ${kpi.tone}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="text-[11px] font-medium text-[var(--muted)]">
                    {kpi.label}
                  </p>
                </div>
                <p className="mt-2 text-[22px] font-bold tabular-nums leading-none text-[var(--text)]">
                  {kpi.value}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <section>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-heading)] text-[15px] font-semibold text-[var(--text)]">
              Request modules
            </h2>
            <p className="text-[12px] text-[var(--muted)]">
              Open a module to apply or track that request type
            </p>
          </div>
          <FilterPills
            value={filter}
            onChange={setFilter}
            counts={{
              all: visible.length,
              live: liveCount,
              soon: soonCount,
            }}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)]/60 px-6 py-10 text-center">
            <p className="text-[14px] font-semibold text-[var(--text)]">
              No modules in this filter
            </p>
            <p className="mt-1 text-[12px] text-[var(--muted)]">
              Switch to All to see every enabled request type.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((tile) => {
              const index = visible.findIndex((t) => t.key === tile.key);
              return (
                <RequestModuleCard
                  key={tile.key}
                  tile={tile}
                  count={pending[tile.key]}
                  accent={accentAt(index >= 0 ? index : 0)}
                  loading={dashLoading}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
