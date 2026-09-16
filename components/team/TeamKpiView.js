"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Gauge, SearchX, Star } from "lucide-react";
import { rateTeamKpiScore } from "@/api/team";
import { KpiStatusPill, RatingPill, SourcePill } from "@/components/kpi/KpiBadges";
import { KpiPeriodFilterFields } from "@/components/kpi/KpiPeriodFilterFields";
import { KpiScoreDrawer } from "@/components/kpi/KpiScoreDrawer";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { FlashBanner } from "@/components/ui/FlashBanner";
import { PageLoader } from "@/components/ui/Spinner";
import { PortalPage } from "@/components/ui/PortalPage";
import { SlideOver } from "@/components/ui/SlideOver";
import { SoftStat, SUMMARY_GRID_CLASS } from "@/components/ui/SoftStat";
import { TablePanel } from "@/components/ui/TablePanel";
import {
  DetailField,
  PersonHero,
  SectionCard,
} from "@/components/team/TeamDrawer";
import { TeamRowMenu } from "@/components/team/TeamRowMenu";
import { useTeam } from "@/components/team/TeamCapabilitiesProvider";
import { useKpiPeriods } from "@/hooks/useKpi";
import { useKpiPeriodFilter } from "@/hooks/useKpiPeriodFilter";
import { useTeamKpiList, useTeamMemberKpi } from "@/hooks/useTeamKpi";
import {
  readQueryString,
  usePersistListQuery,
  usePortalQuery,
} from "@/hooks/usePortalQuery";
import { rowSerial } from "@/lib/format";
import {
  canManagerRate,
  formatKpiNumber,
  formatKpiPercent,
  periodMonthLabel,
  sortKpiPeriods,
} from "@/lib/kpi";

export function TeamKpiView() {
  const { capabilities } = useTeam();
  const kpiCap = capabilities?.kpi || {};
  const canRate = Boolean(kpiCap.rate || kpiCap.apply || kpiCap.view);

  const { searchParams } = usePortalQuery();
  const periodFromUrl = readQueryString(searchParams, "periodId", "");
  const employeeFromUrl = readQueryString(searchParams, "employeeId", "");

  const periods = useKpiPeriods({ enabled: true });
  const periodRows = useMemo(
    () => sortKpiPeriods(periods.rows),
    [periods.rows]
  );
  const periodFilter = useKpiPeriodFilter(periodRows, periodFromUrl);
  const { selectedPeriodId, activePeriod } = periodFilter;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [flash, setFlash] = useState("");
  const [selected, setSelected] = useState(null);
  const [rateKpi, setRateKpi] = useState(null);
  const [saving, setSaving] = useState(false);

  usePersistListQuery(
    { periodId: selectedPeriodId, employeeId: selected?.employeeId || "" },
    { periodId: "", employeeId: "" },
    [selectedPeriodId, selected?.employeeId]
  );

  const list = useTeamKpiList({
    periodId: selectedPeriodId,
    enabled: Boolean(selectedPeriodId),
  });

  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      if (!alive || !employeeFromUrl || selected) return;
      const match = list.rows.find((row) => row.employeeId === employeeFromUrl);
      if (match) setSelected(match);
    });
    return () => {
      alive = false;
    };
  }, [employeeFromUrl, list.rows, selected]);

  const memberKpi = useTeamMemberKpi({
    employeeId: selected?.employeeId,
    periodId: selectedPeriodId,
    enabled: Boolean(selected?.employeeId && selectedPeriodId),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list.rows;
    return list.rows.filter((row) =>
      [row.employeeName, row.employeeCode, row.designation, row.rating]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [list.rows, search]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(page, totalPages);
  const displayRows = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );
  const avgScore = list.rows.length
    ? list.rows.reduce((sum, row) => sum + (Number(row.overallScore) || 0), 0) /
      list.rows.length
    : 0;

  const columns = useMemo(
    () => [
      {
        id: "serial",
        header: "#",
        headerClassName: "w-12",
        cellClassName: "tabular-nums text-[var(--muted)]",
        cell: (_row, { index }) => rowSerial(index, safePage, pageSize),
      },
      {
        id: "employee",
        header: "Employee",
        cell: (row) => (
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar
              name={row.employeeName}
              person={row}
              src={row.photoUrl}
              size={36}
            />
            <div className="min-w-0">
              <p className="truncate font-semibold text-[var(--text)]">
                {row.employeeName}
              </p>
              <p className="truncate text-[11px] text-[var(--muted)]">
                {row.designation || "—"}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "code",
        header: "Code",
        cell: (row) =>
          row.employeeCode ? (
            <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-2.5 py-1 text-[11px] font-semibold tabular-nums text-[var(--text)]">
              {row.employeeCode}
            </span>
          ) : (
            <span className="text-[var(--muted)]">—</span>
          ),
      },
      {
        id: "score",
        header: "Overall",
        cellClassName: "tabular-nums font-semibold",
        cell: (row) => formatKpiNumber(row.overallScore),
      },
      {
        id: "rating",
        header: "Rating",
        cell: (row) => <RatingPill rating={row.rating} />,
      },
      {
        id: "count",
        header: "KPIs",
        cellClassName: "tabular-nums",
        cell: (row) => row.kpiCount ?? 0,
      },
      {
        id: "action",
        header: "Action",
        headerClassName: "w-16 text-right",
        cellClassName: "text-right",
        cell: (row) => (
          <TeamRowMenu
            menuId={row.employeeId}
            items={[
              {
                label: "View KPIs",
                icon: <Eye className="h-4 w-4 text-[var(--violet)]" />,
                onClick: () => setSelected(row),
              },
            ]}
          />
        ),
      },
    ],
    [pageSize, safePage]
  );

  async function saveRating({ score, comment }) {
    if (!rateKpi?.scoreId) return;
    setSaving(true);
    try {
      await rateTeamKpiScore(rateKpi.scoreId, {
        managerScore: score,
        managerComment: comment,
      });
      setFlash("Manager rating saved.");
      setRateKpi(null);
      memberKpi.refetch();
      list.refetch();
    } finally {
      setSaving(false);
    }
  }

  if (periods.loading && !periods.rows.length) {
    return (
      <PageLoader
        label="Loading team KPIs"
        hint="Fetching KPI periods for your reports…"
      />
    );
  }

  if (periods.meta.allowed === false) {
    return (
      <ComingSoon
        title="Team KPI"
        badge="Not enabled"
        description="Team KPI will show here when it is enabled for managers and you have direct reports."
        icon={Gauge}
        secondaryHref="/team"
        secondaryLabel="Open members"
      />
    );
  }

  const memberKpis = memberKpi.summary?.kpis || [];

  return (
    <PortalPage
      fill
      title="Team KPI"
      subtitle={
        activePeriod
          ? `Team scores for ${periodMonthLabel(activePeriod)}. Open a member to view breakdown and rate manual KPIs.`
          : "Overall scores for people who report to you."
      }
      error={periods.error || (list.meta.allowed === false ? "" : list.error)}
      actions={
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            periods.refetch();
            list.refetch();
          }}
          disabled={periods.loading || list.loading}
        >
          Refresh
        </Button>
      }
    >
      {flash ? (
        <FlashBanner
          message={flash}
          tone="success"
          duration={4000}
          onDismiss={() => setFlash("")}
        />
      ) : null}

      <CollapsibleSection title="Overview">
        <div className={SUMMARY_GRID_CLASS}>
          <SoftStat label="Team members" value={list.rows.length} color="#7b39ec" />
          <SoftStat
            label="Avg score"
            value={formatKpiNumber(avgScore, "0")}
          />
          <SoftStat
            label="Month"
            value={activePeriod ? periodMonthLabel(activePeriod) : "—"}
          />
        </div>
      </CollapsibleSection>

      <TablePanel
        title="Direct reports"
        titleCount={total}
        titleCountLabel="Team members"
        search={search}
        onSearchChange={(next) => {
          setSearch(next);
          setPage(1);
        }}
        searchPlaceholder="Search name, code, rating…"
        filterTitle="Filters"
        filterSubtitle="KPI period dates"
        filterActive={periodFilter.filterActive}
        activeFilterCount={periodFilter.filterActive ? 1 : 0}
        drawerFields={
          <KpiPeriodFilterFields
            periodOptions={periodFilter.periodOptions}
            periodValue={periodFilter.draftPeriodId}
            onPeriodChange={periodFilter.onDraftPeriodChange}
            defaultPeriodId={periodFilter.defaultPeriodId}
            from={periodFilter.draftFrom}
            to={periodFilter.draftTo}
            onFromChange={periodFilter.onDraftFromChange}
            onToChange={periodFilter.onDraftToChange}
          />
        }
        onApplyFilters={() => {
          periodFilter.apply(list.refetch);
          setPage(1);
        }}
        onResetFilters={() => {
          periodFilter.reset(list.refetch);
          setPage(1);
        }}
        onRefresh={list.refetch}
        columns={columns}
        rows={displayRows}
        getRowKey={(row) => row.employeeId}
        minWidth="980px"
        loading={list.loading}
        loadingLabel="Loading team KPIs"
        emptyIcon={search.trim() ? SearchX : Gauge}
        emptyTitle={
          list.meta.allowed === false
            ? "Team KPI not available"
            : search.trim()
              ? "Data not found"
              : "No team KPIs"
        }
        emptyHint={
          list.meta.allowed === false
            ? "This appears when KPI is enabled for managers and you have direct reports."
            : search.trim()
              ? "No members match your search."
              : "When your reports have KPIs in this period, they will show here."
        }
        page={safePage}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
        onPageChange={setPage}
        onPageSizeChange={(next) => {
          setPageSize(next);
          setPage(1);
        }}
      />

      <SlideOver
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        wide
        title="Member KPIs"
        subtitle={selected?.employeeName || ""}
      >
        {selected ? (
          <div className="space-y-4 pb-2">
            <PersonHero
              person={selected}
              badge={<RatingPill rating={selected.rating} />}
            />
            {memberKpi.error ? (
              <p className="rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-[13px] text-[var(--danger)]">
                {memberKpi.error}
              </p>
            ) : null}
            {memberKpi.loading ? (
              <PageLoader
                compact
                label="Loading breakdown"
                hint="Fetching this member’s KPIs…"
              />
            ) : memberKpi.summary ? (
              <>
                <div className={SUMMARY_GRID_CLASS}>
                  <SoftStat
                    label="Overall"
                    value={formatKpiNumber(memberKpi.summary.overallScore, "0")}
                    color="#7b39ec"
                  />
                  <SoftStat
                    label="Rating"
                    value={memberKpi.summary.rating || "—"}
                  />
                  <SoftStat
                    label="Weight"
                    value={formatKpiNumber(memberKpi.summary.totalWeight, "0")}
                  />
                </div>
                <SectionCard kicker="Breakdown" title="KPIs">
                  {memberKpis.length ? (
                    <div className="space-y-3">
                      {memberKpis.map((kpi) => (
                        <div
                          key={kpi.scoreId}
                          className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-3.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-[14px] font-semibold text-[var(--text)]">
                                {kpi.kpiName}
                              </p>
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                <KpiStatusPill status={kpi.status} />
                                <SourcePill source={kpi.measurementSource} />
                              </div>
                            </div>
                            {canRate && canManagerRate(kpi) ? (
                              <Button
                                type="button"
                                variant="outline"
                                className="h-9 shrink-0 rounded-xl px-3 text-[12px]"
                                onClick={() => setRateKpi(kpi)}
                              >
                                <Star className="h-3.5 w-3.5" />
                                Rate
                              </Button>
                            ) : null}
                          </div>
                          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
                            <DetailField label="Weight">
                              {formatKpiNumber(kpi.weight)}
                            </DetailField>
                            <DetailField label="Target">
                              {formatKpiNumber(kpi.target)}
                            </DetailField>
                            <DetailField label="Actual">
                              {formatKpiNumber(kpi.actual)}
                            </DetailField>
                            <DetailField label="Achievement">
                              {formatKpiPercent(kpi.achievementPct)}
                            </DetailField>
                            <DetailField label="Self">
                              {formatKpiNumber(kpi.selfScore)}
                            </DetailField>
                            <DetailField label="Manager">
                              {formatKpiNumber(kpi.managerScore)}
                            </DetailField>
                            <DetailField label="Self comment" className="col-span-2">
                              {kpi.selfComment || null}
                            </DetailField>
                            <DetailField label="Manager comment" className="col-span-2">
                              {kpi.managerComment || null}
                            </DetailField>
                          </dl>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[13px] text-[var(--muted)]">
                      No KPIs assigned for this period.
                    </p>
                  )}
                </SectionCard>
              </>
            ) : null}
          </div>
        ) : null}
      </SlideOver>

      <KpiScoreDrawer
        open={Boolean(rateKpi)}
        mode="manager"
        kpi={rateKpi}
        saving={saving}
        onClose={() => setRateKpi(null)}
        onSubmit={saveRating}
      />
    </PortalPage>
  );
}
