"use client";

import { useMemo, useState } from "react";
import { Eye, PenLine, SearchX, Target } from "lucide-react";
import { submitKpiSelfScore } from "@/api/kpi";
import { KpiStatusPill, SourcePill } from "@/components/kpi/KpiBadges";
import { KpiPeriodFilterFields } from "@/components/kpi/KpiPeriodFilterFields";
import { KpiScoreDrawer } from "@/components/kpi/KpiScoreDrawer";
import { TeamRowMenu } from "@/components/team/TeamRowMenu";
import {
  DetailField,
  PersonHero,
  SectionCard,
} from "@/components/team/TeamDrawer";
import { Button } from "@/components/ui/Button";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { FlashBanner } from "@/components/ui/FlashBanner";
import { PortalPage } from "@/components/ui/PortalPage";
import { PageLoader } from "@/components/ui/Spinner";
import { SlideOver } from "@/components/ui/SlideOver";
import { SoftStat, SUMMARY_GRID_CLASS } from "@/components/ui/SoftStat";
import { TablePanel } from "@/components/ui/TablePanel";
import { useKpiPeriods, useMyKpiPeriod } from "@/hooks/useKpi";
import { useKpiPeriodFilter } from "@/hooks/useKpiPeriodFilter";
import {
  readQueryString,
  usePersistListQuery,
  usePortalQuery,
} from "@/hooks/usePortalQuery";
import { rowSerial } from "@/lib/format";
import {
  canSelfScore,
  directionLabel,
  formatKpiNumber,
  formatKpiPercent,
  periodMonthLabel,
  sortKpiPeriods,
} from "@/lib/kpi";

export function KpisView() {
  const { searchParams } = usePortalQuery();
  const periodFromUrl = readQueryString(searchParams, "periodId", "");

  const periods = useKpiPeriods();
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
  const [viewKpi, setViewKpi] = useState(null);
  const [scoreKpi, setScoreKpi] = useState(null);
  const [saving, setSaving] = useState(false);

  usePersistListQuery(
    { periodId: selectedPeriodId },
    { periodId: "" },
    [selectedPeriodId]
  );

  const mine = useMyKpiPeriod({
    periodId: selectedPeriodId,
    enabled: Boolean(selectedPeriodId) && periods.meta.allowed !== false,
  });
  const kpis = mine.summary?.kpis || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return kpis;
    return kpis.filter((row) =>
      [row.kpiName, row.status, row.measurementSource]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [kpis, search]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(page, totalPages);
  const displayRows = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

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
        id: "name",
        header: "KPI",
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-[var(--text)]">
              {row.kpiName}
            </p>
            <p className="text-[11px] text-[var(--muted)]">
              {directionLabel(row.direction)}
            </p>
          </div>
        ),
      },
      {
        id: "weight",
        header: "Weight",
        cellClassName: "tabular-nums",
        cell: (row) => formatKpiNumber(row.weight),
      },
      {
        id: "target",
        header: "Target",
        cellClassName: "tabular-nums",
        cell: (row) => formatKpiNumber(row.target),
      },
      {
        id: "actual",
        header: "Actual",
        cellClassName: "tabular-nums",
        cell: (row) => formatKpiNumber(row.actual),
      },
      {
        id: "achievement",
        header: "Achievement",
        cell: (row) => formatKpiPercent(row.achievementPct),
      },
      {
        id: "self",
        header: "Self",
        cellClassName: "tabular-nums",
        cell: (row) => formatKpiNumber(row.selfScore),
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => <KpiStatusPill status={row.status} />,
      },
      {
        id: "source",
        header: "Source",
        cell: (row) => <SourcePill source={row.measurementSource} />,
      },
      {
        id: "action",
        header: "Action",
        headerClassName: "w-16 text-right",
        cellClassName: "text-right",
        cell: (row) => {
          const items = [
            {
              label: "View",
              icon: <Eye className="h-4 w-4 text-[var(--violet)]" />,
              onClick: () => setViewKpi(row),
            },
          ];
          if (canSelfScore(row)) {
            items.push({
              label: "Self-assess",
              icon: <PenLine className="h-4 w-4 text-[var(--violet)]" />,
              onClick: () => setScoreKpi(row),
            });
          }
          return <TeamRowMenu menuId={row.scoreId} items={items} />;
        },
      },
    ],
    [pageSize, safePage]
  );

  async function saveSelfScore({ score, comment }) {
    if (!scoreKpi?.scoreId) return;
    setSaving(true);
    try {
      await submitKpiSelfScore(scoreKpi.scoreId, {
        selfScore: score,
        selfComment: comment,
      });
      setFlash("Self-assessment saved.");
      setScoreKpi(null);
      mine.refetch();
    } finally {
      setSaving(false);
    }
  }

  if (periods.loading && !periods.rows.length) {
    return (
      <PageLoader
        label="Loading KPIs"
        hint="Fetching your KPI periods…"
      />
    );
  }

  if (periods.meta.allowed === false) {
    return (
      <ComingSoon
        title="KPI"
        badge="Not enabled"
        description="KPI is not enabled for your account yet. It will show here once your company turns it on and a period is calculated."
        icon={Target}
      />
    );
  }

  return (
    <PortalPage
      fill
      title="My KPIs"
      subtitle={
        activePeriod
          ? `Your scores for ${periodMonthLabel(activePeriod)}. Manual KPIs can be self-assessed from the 3-dot menu.`
          : "Use the table filters to pick a KPI period."
      }
      error={periods.error || mine.error}
      actions={
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            periods.refetch();
            mine.refetch();
          }}
          disabled={periods.loading || mine.loading}
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
          <SoftStat
            label="Overall"
            value={formatKpiNumber(mine.summary?.overallScore, "0")}
            color="#7b39ec"
          />
          <SoftStat label="Rating" value={mine.summary?.rating || "—"} />
          <SoftStat
            label="Total weight"
            value={formatKpiNumber(mine.summary?.totalWeight, "0")}
          />
          <SoftStat label="KPIs" value={kpis.length} />
          <SoftStat
            label="Month"
            value={activePeriod ? periodMonthLabel(activePeriod) : "—"}
          />
        </div>
      </CollapsibleSection>

      <TablePanel
        title="KPI scores"
        titleCount={total}
        titleCountLabel="KPIs"
        search={search}
        onSearchChange={(next) => {
          setSearch(next);
          setPage(1);
        }}
        searchPlaceholder="Search KPI name or status…"
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
          periodFilter.apply(mine.refetch);
          setPage(1);
        }}
        onResetFilters={() => {
          periodFilter.reset(mine.refetch);
          setPage(1);
        }}
        onRefresh={mine.refetch}
        columns={columns}
        rows={displayRows}
        getRowKey={(row) => row.scoreId}
        minWidth="1080px"
        loading={mine.loading}
        loadingLabel="Loading KPIs"
        emptyIcon={search.trim() ? SearchX : Target}
        emptyTitle={
          mine.meta.allowed === false
            ? "KPI not available"
            : search.trim()
              ? "Data not found"
              : periods.rows.length
                ? "No KPIs in this period"
                : "No KPI periods"
        }
        emptyHint={
          mine.meta.allowed === false
            ? "KPI is turned off for your account."
            : search.trim()
              ? "No KPIs match your search."
              : periods.rows.length
                ? "HR has not assigned KPIs for this period yet."
                : "When a period is calculated, your KPIs will show here."
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
        open={Boolean(viewKpi)}
        onClose={() => setViewKpi(null)}
        wide
        title="KPI details"
        subtitle={viewKpi?.kpiName || ""}
        footer={
          canSelfScore(viewKpi) ? (
            <div className="flex justify-end">
              <Button
                type="button"
                className="h-11 rounded-xl"
                onClick={() => {
                  setScoreKpi(viewKpi);
                  setViewKpi(null);
                }}
              >
                <PenLine className="h-4 w-4" />
                Self-assess
              </Button>
            </div>
          ) : null
        }
      >
        {viewKpi ? (
          <div className="space-y-4 pb-2">
            <PersonHero
              person={{ employeeName: viewKpi.kpiName }}
              badge={<KpiStatusPill status={viewKpi.status} />}
            />
            <SectionCard kicker="Overview" title="Score">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <DetailField label="Weight">
                  {formatKpiNumber(viewKpi.weight)}
                </DetailField>
                <DetailField label="Target">
                  {formatKpiNumber(viewKpi.target)}
                </DetailField>
                <DetailField label="Actual">
                  {formatKpiNumber(viewKpi.actual)}
                </DetailField>
                <DetailField label="Achievement">
                  {formatKpiPercent(viewKpi.achievementPct)}
                </DetailField>
                <DetailField label="Weighted score">
                  {formatKpiNumber(viewKpi.weightedScore)}
                </DetailField>
                <DetailField label="Self score">
                  {formatKpiNumber(viewKpi.selfScore)}
                </DetailField>
                <DetailField label="Manager score">
                  {formatKpiNumber(viewKpi.managerScore)}
                </DetailField>
                <DetailField label="Source">
                  <SourcePill source={viewKpi.measurementSource} />
                </DetailField>
                <DetailField label="Direction" className="sm:col-span-2">
                  {directionLabel(viewKpi.direction)}
                </DetailField>
                <DetailField label="Self comment" className="sm:col-span-2">
                  {viewKpi.selfComment || null}
                </DetailField>
                <DetailField label="Manager comment" className="sm:col-span-2">
                  {viewKpi.managerComment || null}
                </DetailField>
              </dl>
            </SectionCard>
          </div>
        ) : null}
      </SlideOver>

      <KpiScoreDrawer
        open={Boolean(scoreKpi)}
        mode="self"
        kpi={scoreKpi}
        saving={saving}
        onClose={() => setScoreKpi(null)}
        onSubmit={saveSelfScore}
      />
    </PortalPage>
  );
}
