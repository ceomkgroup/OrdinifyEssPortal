"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Construction,
  Hourglass,
  Inbox,
  Layers,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { FlashBanner } from "@/components/ui/FlashBanner";
import {
  ListFiltersBar,
  REQUEST_STATUS_OPTIONS,
} from "@/components/ui/ListFilters";
import { PageLoader } from "@/components/ui/Spinner";
import { useModules } from "@/components/modules/ModulesProvider";
import { useAllRequests } from "@/hooks/useAllRequests";
import { useDashboard } from "@/hooks/useDashboard";
import { formatDateTime, rowSerial } from "@/lib/format";
import { REQUEST_TYPES } from "@/lib/request-types";

function statusTone(status) {
  const s = String(status || "").toLowerCase();
  if (s === "approved") {
    return "border-[var(--success)]/20 bg-[var(--success-soft)] text-[var(--success)]";
  }
  if (s === "rejected" || s === "cancelled" || s === "canceled") {
    return "border-[var(--danger)]/20 bg-[var(--danger-soft)] text-[var(--danger)]";
  }
  if (s === "pending" || s === "submitted" || s === "in_progress") {
    return "border-[var(--violet)]/20 bg-[var(--lavender-soft)] text-[var(--violet)]";
  }
  return "border-[var(--border)] bg-[var(--panel-soft)] text-[var(--muted)]";
}

function NewRequestMenu({ tiles }) {
  const [open, setOpen] = useState(false);
  const live = tiles.filter((t) => t.live);

  if (!live.length) return null;

  return (
    <div className="relative">
      <Button
        type="button"
        className="h-10 rounded-xl"
        onClick={() => setOpen((v) => !v)}
      >
        <Plus className="h-4 w-4" />
        New request
        <ChevronDown
          className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`}
        />
      </Button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10 cursor-default"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-1.5 w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
            {live.map((tile) => {
              const Icon = tile.icon || Inbox;
              return (
                <Link
                  key={tile.key}
                  href={tile.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-semibold text-[var(--text)] hover:bg-[var(--panel-soft)]"
                >
                  <Icon className="h-4 w-4 text-[var(--violet)]" />
                  <span className="truncate">{tile.title}</span>
                </Link>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function RequestsHubView() {
  const { canShowRequestTile, loading: modulesLoading } = useModules();
  const { data: dashData } = useDashboard();
  const { rows, loading, error, refetch, sources } = useAllRequests();

  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [filterBusy, setFilterBusy] = useState(false);

  const pendingCounts = dashData?.pendingRequests || {};
  const visibleTiles = useMemo(
    () => REQUEST_TYPES.filter((t) => canShowRequestTile(t.key)),
    [canShowRequestTile]
  );
  const liveTiles = visibleTiles.filter((t) => t.live);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.statusBucket !== statusFilter) {
        return false;
      }
      if (typeFilter !== "all" && row.typeKey !== typeFilter) return false;
      if (!q) return true;
      return (
        row.typeLabel.toLowerCase().includes(q) ||
        row.summary.toLowerCase().includes(q) ||
        String(row.status).toLowerCase().includes(q) ||
        String(row.period).toLowerCase().includes(q) ||
        String(row.reason).toLowerCase().includes(q)
      );
    });
  }, [rows, statusFilter, typeFilter, query]);

  const pendingTotal = rows.filter((r) => r.statusBucket === "pending").length;
  const approvedTotal = rows.filter((r) => r.statusBucket === "approved").length;

  const typeOptions = useMemo(() => {
    // Prefer live modules from config so dropdown grows as types go live.
    const typeKeys =
      sources.length > 0
        ? sources
        : liveTiles.map((t) => t.key);

    return [
      { value: "all", label: "All types", count: rows.length },
      ...typeKeys.map((key) => {
        const tile = REQUEST_TYPES.find((t) => t.key === key);
        return {
          value: key,
          label: tile?.title || key,
          count: rows.filter((r) => r.typeKey === key).length,
        };
      }),
    ];
  }, [rows, sources, liveTiles]);

  const statusOptions = REQUEST_STATUS_OPTIONS.map((item) => ({
    ...item,
    count:
      item.value === "all"
        ? rows.length
        : rows.filter((r) => r.statusBucket === item.value).length,
  }));

  if (!modulesLoading && visibleTiles.length === 0) {
    return (
      <ComingSoon
        title="Requests"
        description="No request modules are enabled for your company yet."
      />
    );
  }

  if (modulesLoading && visibleTiles.length === 0) {
    return (
      <PageLoader label="Loading requests" hint="Checking enabled modules…" />
    );
  }

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Hero + KPIs */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--card-shadow)] md:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[var(--lavender-soft)] opacity-70 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-[var(--violet-soft)] opacity-50 blur-2xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--lavender-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--violet)]">
              <Sparkles className="h-3.5 w-3.5" />
              My requests
            </div>
            <h1 className="mt-2 font-[family-name:var(--font-heading)] text-[26px] font-semibold tracking-tight text-[var(--text)] md:text-[30px]">
              All requests
            </h1>
            <p className="mt-1 max-w-xl text-[13px] text-[var(--muted)]">
              Track every request in one list. Open a type to apply with its own
              rules and forms.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl"
              onClick={refetch}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <NewRequestMenu tiles={liveTiles} />
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            {
              label: "In this list",
              value: loading ? "…" : String(rows.length),
              icon: Inbox,
              soft: "bg-[var(--info-soft)]",
              tone: "text-[var(--info)]",
            },
            {
              label: "Pending",
              value: loading ? "…" : String(pendingTotal),
              icon: Hourglass,
              soft: "bg-[var(--warning-soft)]",
              tone: "text-[var(--warning)]",
            },
            {
              label: "Approved",
              value: loading ? "…" : String(approvedTotal),
              icon: CheckCircle2,
              soft: "bg-[var(--success-soft)]",
              tone: "text-[var(--success)]",
            },
            {
              label: "Live modules",
              value: String(liveTiles.length),
              icon: Layers,
              soft: "bg-[var(--lavender-soft)]",
              tone: "text-[var(--violet)]",
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

      {/* Apply by type — type-specific pages */}
      <section>
        <div className="mb-3">
          <h2 className="font-[family-name:var(--font-heading)] text-[15px] font-semibold text-[var(--text)]">
            Apply by type
          </h2>
          <p className="text-[12px] text-[var(--muted)]">
            Forms, balances, and rules live on each module page
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {visibleTiles.map((tile) => {
            const Icon = tile.icon || Inbox;
            const pending = Number(pendingCounts[tile.key]) || 0;
            return (
              <Link
                key={tile.key}
                href={tile.href}
                className="group flex min-w-[148px] shrink-0 items-center gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 shadow-[var(--card-shadow)] transition hover:border-[var(--violet)]/40 hover:bg-[var(--lavender-soft)]/40"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--lavender-soft)] text-[var(--violet)]">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-[var(--text)]">
                    {tile.title.replace(" Request", "")}
                  </p>
                  <p className="text-[10px] text-[var(--muted)]">
                    {tile.live ? (
                      pending > 0 ? (
                        <span className="text-[var(--warning)]">
                          {pending} pending
                        </span>
                      ) : (
                        "Open"
                      )
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[var(--warning)]">
                        <Construction className="h-2.5 w-2.5" />
                        Soon
                      </span>
                    )}
                  </p>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[var(--muted)] group-hover:text-[var(--violet)]" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* Unified list */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--card-shadow)]">
        <div className="border-b border-[var(--border)] p-4 md:p-5">
          <div className="mb-4">
            <h2 className="font-[family-name:var(--font-heading)] text-[15px] font-semibold text-[var(--text)]">
              Request history
            </h2>
            <p className="text-[12px] text-[var(--muted)]">
              Leave, encashment, attendance change — one table
            </p>
          </div>

          <ListFiltersBar
            search={query}
            onSearchChange={setQuery}
            searchPlaceholder="Search summary, type, reason…"
            status={statusFilter}
            onStatusChange={setStatusFilter}
            statusOptions={statusOptions}
            type={typeFilter}
            onTypeChange={setTypeFilter}
            typeOptions={typeOptions}
            typeLabel="Request type"
            loading={loading}
            onBusyChange={setFilterBusy}
          />
        </div>

        {error ? (
          <div className="px-4 py-3 md:px-5">
            <FlashBanner message={error} tone="danger" autoDismiss={false} />
          </div>
        ) : null}

        {loading || filterBusy ? (
          <div className="p-4 md:p-5">
            <PageLoader
              compact
              label={loading ? "Loading requests" : "Updating results"}
              hint={
                loading
                  ? "Pulling leave, encashment, and attendance change…"
                  : "Applying your search and filters…"
              }
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center px-6 py-12 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--lavender-soft)] text-[var(--violet)]">
              <Inbox className="h-6 w-6" />
            </span>
            <p className="mt-3 text-[14px] font-semibold text-[var(--text)]">
              No requests match
            </p>
            <p className="mt-1 max-w-sm text-[12px] text-[var(--muted)]">
              Try another filter, or start a new request from a module above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--panel-soft)] text-[11px] uppercase tracking-wide text-[var(--muted)]">
                  <th className="w-12 px-4 py-2.5 font-semibold md:px-5">#</th>
                  <th className="px-4 py-2.5 font-semibold">Type</th>
                  <th className="px-4 py-2.5 font-semibold">Summary</th>
                  <th className="px-4 py-2.5 font-semibold">Period</th>
                  <th className="px-4 py-2.5 font-semibold">Submitted</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold md:px-5"> </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, index) => (
                  <tr
                    key={row.id}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--panel-soft)]/50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-[var(--muted)] md:px-5">
                      {rowSerial(index)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-[var(--text)]">
                      {row.typeLabel.replace(" Request", "")}
                    </td>
                    <td className="max-w-[220px] px-4 py-3 text-[var(--text)]">
                      <p className="truncate">{row.summary}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">
                      {row.period}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">
                      {row.createdAt
                        ? formatDateTime(row.createdAt)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusTone(row.status)}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 md:px-5">
                      <Link
                        href={row.href}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 text-[12px] font-semibold text-[var(--violet)] transition hover:bg-[var(--lavender-soft)]"
                      >
                        Open
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
