"use client";

import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { FilterSelect, FilterDate, REQUEST_STATUS_OPTIONS } from "@/components/ui/ListFilters";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { PortalPage } from "@/components/ui/PortalPage";
import { PageLoader } from "@/components/ui/Spinner";
import { TablePanel } from "@/components/ui/TablePanel";
import { useModules } from "@/components/modules/ModulesProvider";
import { useAllRequests } from "@/hooks/useAllRequests";
import {
  countActiveDateFilters,
  dateInRange,
} from "@/lib/request-date-filter";
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
  const { rows, loading, error, refetch, sources } = useAllRequests();

  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [draftTypeFilter, setDraftTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [draftDateFrom, setDraftDateFrom] = useState("");
  const [draftDateTo, setDraftDateTo] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    setDraftTypeFilter(typeFilter);
  }, [typeFilter]);

  useEffect(() => {
    setDraftDateFrom(dateFrom);
    setDraftDateTo(dateTo);
  }, [dateFrom, dateTo]);

  const statusTabs = REQUEST_STATUS_OPTIONS.map((item) => ({
    value: item.value,
    label: item.value === "all" ? "All" : item.label.split(" / ")[0],
  }));

  const dateFilterCount = countActiveDateFilters(dateFrom, dateTo);
  const activeFilterCount =
    (typeFilter !== "all" ? 1 : 0) + dateFilterCount;

  const pendingCounts = useMemo(() => {
    const counts = {};
    for (const row of rows) {
      const s = String(row.statusBucket || row.status || "").toLowerCase();
      if (s !== "pending" && s !== "submitted" && s !== "in_progress") continue;
      const key = row.typeKey;
      if (!key) continue;
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [rows]);

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
      if (
        (dateFrom || dateTo) &&
        !dateInRange(row.createdAt, dateFrom, dateTo)
      ) {
        return false;
      }
      if (!q) return true;
      return (
        row.typeLabel.toLowerCase().includes(q) ||
        row.summary.toLowerCase().includes(q) ||
        String(row.status).toLowerCase().includes(q) ||
        String(row.period).toLowerCase().includes(q) ||
        String(row.reason).toLowerCase().includes(q)
      );
    });
  }, [rows, statusFilter, typeFilter, dateFrom, dateTo, query]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, typeFilter, dateFrom, dateTo, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / limit) || 1);
  const currentPage = Math.min(page, totalPages);

  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return filtered.slice(start, start + limit);
  }, [filtered, currentPage, limit]);

  const columns = useMemo(
    () => [
      {
        id: "serial",
        header: "#",
        headerClassName: "w-12",
        cellClassName: "whitespace-nowrap tabular-nums text-[var(--muted)]",
        cell: (_row, { index }) => rowSerial(index, currentPage, limit),
      },
      {
        id: "type",
        header: "Type",
        cellClassName: "whitespace-nowrap font-semibold text-[var(--text)]",
        cell: (row) => row.typeLabel.replace(" Request", ""),
      },
      {
        id: "summary",
        header: "Summary",
        cellClassName: "max-w-[220px] text-[var(--text)]",
        cell: (row) => <p className="truncate">{row.summary}</p>,
      },
      {
        id: "period",
        header: "Period",
        cellClassName: "whitespace-nowrap text-[var(--muted)]",
        cell: (row) => row.period,
      },
      {
        id: "submitted",
        header: "Submitted",
        cellClassName: "whitespace-nowrap text-[var(--muted)]",
        cell: (row) =>
          row.createdAt ? formatDateTime(row.createdAt) : "—",
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => (
          <span
            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusTone(row.status)}`}
          >
            {row.status}
          </span>
        ),
      },
      {
        id: "action",
        header: " ",
        cell: (row) => (
          <Link
            href={row.href}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 text-[12px] font-semibold text-[var(--violet)] transition hover:bg-[var(--lavender-soft)]"
          >
            Open
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        ),
      },
    ],
    [currentPage, limit]
  );

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
    <PortalPage
      fill
      title="All requests"
      subtitle="Track every request in one list. Open a type to apply with its own rules and forms."
      actions={
        <>
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
        </>
      }
    >

      <CollapsibleSection title="Summary">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
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
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3"
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
      </CollapsibleSection>

      {/* Apply by type — type-specific pages */}
      <section>
        <div className="mb-3">
          <h2 className="heading-section">
            Apply by type
          </h2>
          <p className="heading-sub">
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
      <TablePanel
        title="Request Logs"
        tabs={statusTabs}
        tab={statusFilter}
        onTabChange={setStatusFilter}
        recordCount={filtered.length}
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search summary, type, reason…"
        filterActive={activeFilterCount > 0}
        activeFilterCount={activeFilterCount}
        drawerFields={
          <>
            <FilterDate
              label="From date"
              value={draftDateFrom}
              onChange={setDraftDateFrom}
              max={draftDateTo || undefined}
              clearable
            />
            <FilterDate
              label="To date"
              value={draftDateTo}
              onChange={setDraftDateTo}
              min={draftDateFrom || undefined}
              clearable
            />
            <FilterSelect
              label="Request type"
              value={draftTypeFilter}
              onChange={setDraftTypeFilter}
              options={typeOptions}
              clearable
              defaultValue="all"
            />
          </>
        }
        onApplyFilters={() => {
          setDateFrom(draftDateFrom);
          setDateTo(draftDateTo);
          setTypeFilter(draftTypeFilter);
          setPage(1);
        }}
        onResetFilters={() => {
          setDraftDateFrom("");
          setDraftDateTo("");
          setDateFrom("");
          setDateTo("");
          setDraftTypeFilter("all");
          setTypeFilter("all");
          setPage(1);
        }}
        onRefresh={refetch}
        columns={columns}
        rows={pagedRows}
        getRowKey={(row) => row.id}
        minWidth="960px"
        loading={loading}
        loadingLabel="Loading requests"
        loadingHint="Pulling leave, encashment, and attendance change…"
        error={error}
        emptyIcon={Inbox}
        emptyTitle="No requests match"
        emptyHint="Try another filter, or start a new request from a module above."
        page={currentPage}
        pageSize={limit}
        total={filtered.length}
        totalPages={totalPages}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setLimit(n);
          setPage(1);
        }}
      />
    </PortalPage>
  );
}
