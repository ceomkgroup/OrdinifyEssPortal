"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardPen, Eye, Plus, SearchX, Target, Users } from "lucide-react";
import { SearchableFilter } from "@/components/attendance/AttendanceStatusFilter";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { FlashBanner } from "@/components/ui/FlashBanner";
import { PortalPage } from "@/components/ui/PortalPage";
import { TablePanel } from "@/components/ui/TablePanel";
import { PageLoader } from "@/components/ui/Spinner";
import { SlideOver } from "@/components/ui/SlideOver";
import {
  DetailField,
  PersonHero,
  SectionCard,
} from "@/components/team/TeamDrawer";
import { TeamPunchDrawer } from "@/components/team/TeamPunchDrawer";
import { TeamRowMenu } from "@/components/team/TeamRowMenu";
import { useTeam } from "@/components/team/TeamCapabilitiesProvider";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { formatDate, rowSerial } from "@/lib/format";
import { useCompanySettings } from "@/hooks/useCompanySettings";

function hasAny(rows, key) {
  return (rows || []).some((row) => String(row?.[key] || "").trim());
}

function uniqueFilterOptions(rows, key) {
  const seen = new Map();
  for (const row of rows || []) {
    const raw = String(row?.[key] || "").trim();
    if (!raw) continue;
    const id = raw.toLowerCase();
    if (!seen.has(id)) {
      seen.set(id, { value: raw, label: raw, name: raw });
    }
  }
  const items = [...seen.values()].sort((a, b) =>
    a.label.localeCompare(b.label)
  );
  if (!items.length) return [];
  return [{ value: "all", label: "All", name: "All" }, ...items];
}

export function TeamMembersView() {
  const router = useRouter();
  const { rows, meta, loading, error, refetch } = useTeamMembers();
  const { settings } = useCompanySettings();
  const { capabilities } = useTeam();
  const attendanceCap = capabilities?.attendance || {};
  const canMark = Boolean(attendanceCap.markAttendance);
  const canRegularize = Boolean(attendanceCap.apply);
  const dateFormat = settings.dateFormat || "DD/MM/YYYY";

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [designation, setDesignation] = useState("all");
  const [department, setDepartment] = useState("all");
  const [branch, setBranch] = useState("all");
  const [relationship, setRelationship] = useState("all");
  const [draftDesignation, setDraftDesignation] = useState("all");
  const [draftDepartment, setDraftDepartment] = useState("all");
  const [draftBranch, setDraftBranch] = useState("all");
  const [draftRelationship, setDraftRelationship] = useState("all");
  const [selectedMember, setSelectedMember] = useState(null);
  const [flash, setFlash] = useState("");
  const [punch, setPunch] = useState({
    open: false,
    mode: "mark",
    member: null,
  });

  function openPunch(mode, member) {
    setSelectedMember(null);
    setPunch({ open: true, mode, member });
  }

  const designationOptions = useMemo(
    () => uniqueFilterOptions(rows, "designation"),
    [rows]
  );
  const departmentOptions = useMemo(
    () => uniqueFilterOptions(rows, "department"),
    [rows]
  );
  const branchOptions = useMemo(
    () => uniqueFilterOptions(rows, "branch"),
    [rows]
  );
  const relationshipOptions = useMemo(
    () => uniqueFilterOptions(rows, "relationship"),
    [rows]
  );

  const showDepartment = hasAny(rows, "department");
  const showBranch = hasAny(rows, "branch");
  const showShift = hasAny(rows, "shift");
  const showEmail = hasAny(rows, "email");
  const showPhone = hasAny(rows, "phone");
  const showJoinDate = hasAny(rows, "joinDate");
  const showRelationship = hasAny(rows, "relationship");

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows || []).filter((row) => {
      if (designation !== "all" && row.designation !== designation) return false;
      if (department !== "all" && row.department !== department) return false;
      if (branch !== "all" && row.branch !== branch) return false;
      if (relationship !== "all" && row.relationship !== relationship) {
        return false;
      }
      if (!q) return true;
      return [
        row.employeeName,
        row.employeeCode,
        row.designation,
        row.department,
        row.branch,
        row.shift,
        row.email,
        row.phone,
        row.relationship,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, search, designation, department, branch, relationship]);

  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(page, totalPages);
  const displayRows = filteredRows.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const filterCount =
    (designation !== "all" ? 1 : 0) +
    (department !== "all" ? 1 : 0) +
    (branch !== "all" ? 1 : 0) +
    (relationship !== "all" ? 1 : 0);
  const hasSearchOrFilter = Boolean(search.trim()) || filterCount > 0;

  const hasDrawerFilters =
    designationOptions.length > 1 ||
    departmentOptions.length > 1 ||
    branchOptions.length > 1 ||
    relationshipOptions.length > 1;

  function applyFilters() {
    setDesignation(draftDesignation);
    setDepartment(draftDepartment);
    setBranch(draftBranch);
    setRelationship(draftRelationship);
    setPage(1);
  }

  function resetFilters() {
    setDraftDesignation("all");
    setDraftDepartment("all");
    setDraftBranch("all");
    setDraftRelationship("all");
    setDesignation("all");
    setDepartment("all");
    setBranch("all");
    setRelationship("all");
    setSearch("");
    setPage(1);
  }

  const columns = useMemo(() => {
    const cols = [
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
            <p className="truncate font-semibold text-[var(--text)]">
              {row.employeeName || "Employee"}
            </p>
          </div>
        ),
      },
      {
        id: "code",
        header: "Employee code",
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
        id: "designation",
        header: "Designation",
        cellClassName: "max-w-[220px] text-[var(--text)]",
        cell: (row) => row.designation || "—",
      },
    ];

    if (showDepartment) {
      cols.push({
        id: "department",
        header: "Department",
        cellClassName: "max-w-[180px] text-[var(--text)]",
        cell: (row) => row.department || "—",
      });
    }
    if (showBranch) {
      cols.push({
        id: "branch",
        header: "Branch",
        cellClassName: "max-w-[180px] text-[var(--muted)]",
        cell: (row) => row.branch || "—",
      });
    }
    if (showShift) {
      cols.push({
        id: "shift",
        header: "Shift",
        cellClassName: "max-w-[140px] text-[var(--muted)]",
        cell: (row) => row.shift || "—",
      });
    }
    if (showEmail) {
      cols.push({
        id: "email",
        header: "Email",
        cellClassName: "max-w-[220px] truncate text-[var(--muted)]",
        cell: (row) => row.email || "—",
      });
    }
    if (showPhone) {
      cols.push({
        id: "phone",
        header: "Phone",
        cellClassName: "whitespace-nowrap tabular-nums text-[var(--text)]",
        cell: (row) => row.phone || "—",
      });
    }
    if (showJoinDate) {
      cols.push({
        id: "joinDate",
        header: "Join date",
        cellClassName: "whitespace-nowrap text-[var(--muted)]",
        cell: (row) => formatDate(row.joinDate, dateFormat),
      });
    }
    if (showRelationship) {
      cols.push({
        id: "relationship",
        header: "Reports as",
        cell: (row) =>
          row.relationship ? (
            <span className="inline-flex rounded-full bg-[var(--lavender-soft)] px-2.5 py-1 text-[11px] font-semibold capitalize text-[var(--violet)]">
              {row.relationship}
            </span>
          ) : (
            <span className="text-[var(--muted)]">—</span>
          ),
      });
    }

    cols.push({
      id: "action",
      header: "Action",
      headerClassName: "w-16 text-right",
      cellClassName: "text-right",
      cell: (row) => {
        const items = [
          {
            label: "View",
            icon: <Eye className="h-4 w-4 text-[var(--violet)]" />,
            onClick: () => setSelectedMember(row),
          },
        ];
        if (canMark) {
          items.push({
            label: "Mark punch",
            icon: <Plus className="h-4 w-4 text-[var(--success)]" />,
            onClick: () => openPunch("mark", row),
          });
        }
        if (canRegularize) {
          items.push({
            label: "Request correction",
            icon: <ClipboardPen className="h-4 w-4 text-[var(--violet)]" />,
            onClick: () => openPunch("regularize", row),
          });
        }
        items.push({
          label: "View KPIs",
          icon: <Target className="h-4 w-4 text-[var(--violet)]" />,
          onClick: () =>
            router.push(
              `/team/kpi?employeeId=${encodeURIComponent(row.employeeId || "")}`
            ),
        });
        return (
          <TeamRowMenu
            menuId={row.employeeId || row.employeeCode}
            items={items}
          />
        );
      },
    });

    return cols;
  }, [
    canMark,
    canRegularize,
    dateFormat,
    pageSize,
    router,
    safePage,
    showBranch,
    showDepartment,
    showEmail,
    showJoinDate,
    showPhone,
    showRelationship,
    showShift,
  ]);

  if (loading && !rows.length) {
    return (
      <PageLoader
        label="Loading team"
        hint="Fetching people who report to you…"
      />
    );
  }

  return (
    <PortalPage
      fill
      title="Team members"
      subtitle="People who report to you. Use the 3-dot menu to view a member, mark a missing punch, or request a correction for any day."
      error={error}
      actions={
        <Button type="button" variant="outline" onClick={refetch}>
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

      <TablePanel
        title="Direct reports"
        titleCount={total}
        titleCountLabel="Team members"
        search={search}
        onSearchChange={(next) => {
          setSearch(next);
          setPage(1);
        }}
        searchPlaceholder="Search name, code, designation…"
        filterTitle="Filters"
        filterSubtitle="Narrow your team list"
        filterActive={filterCount > 0}
        activeFilterCount={filterCount}
        drawerFields={
          hasDrawerFilters ? (
            <div className="space-y-5">
              {designationOptions.length > 1 ? (
                <SearchableFilter
                  label="Designation"
                  value={draftDesignation}
                  onChange={setDraftDesignation}
                  options={designationOptions}
                  defaultValue="all"
                />
              ) : null}
              {departmentOptions.length > 1 ? (
                <SearchableFilter
                  label="Department"
                  value={draftDepartment}
                  onChange={setDraftDepartment}
                  options={departmentOptions}
                  defaultValue="all"
                />
              ) : null}
              {branchOptions.length > 1 ? (
                <SearchableFilter
                  label="Branch"
                  value={draftBranch}
                  onChange={setDraftBranch}
                  options={branchOptions}
                  defaultValue="all"
                />
              ) : null}
              {relationshipOptions.length > 1 ? (
                <SearchableFilter
                  label="Reports as"
                  value={draftRelationship}
                  onChange={setDraftRelationship}
                  options={relationshipOptions}
                  defaultValue="all"
                />
              ) : null}
            </div>
          ) : null
        }
        onApplyFilters={hasDrawerFilters ? applyFilters : undefined}
        onResetFilters={hasDrawerFilters ? resetFilters : undefined}
        onRefresh={refetch}
        columns={columns}
        rows={displayRows}
        getRowKey={(row, index) =>
          row.employeeId || row.employeeCode || `m-${index}`
        }
        minWidth="980px"
        loading={loading}
        loadingLabel="Loading members"
        emptyIcon={hasSearchOrFilter ? SearchX : Users}
        emptyTitle={
          meta.allowed === false
            ? "Members not available"
            : hasSearchOrFilter
              ? "Data not found"
              : "No direct reports"
        }
        emptyHint={
          meta.allowed === false
            ? "You do not have access to the team members list."
            : hasSearchOrFilter
              ? "No members match your search or filters. Try a different name, code, or clear filters."
              : "When employees report to you, they will appear here."
        }
        emptyAction={
          hasSearchOrFilter ? (
            <Button type="button" variant="outline" onClick={resetFilters}>
              Clear search & filters
            </Button>
          ) : null
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
        open={Boolean(selectedMember)}
        onClose={() => setSelectedMember(null)}
        wide
        title="Member details"
        subtitle={selectedMember?.employeeName || ""}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl"
              onClick={() =>
                router.push(
                  `/team/kpi?employeeId=${encodeURIComponent(selectedMember?.employeeId || "")}`
                )
              }
            >
              <Target className="h-4 w-4" />
              View KPIs
            </Button>
            {canMark ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => openPunch("mark", selectedMember)}
              >
                <Plus className="h-4 w-4" />
                Mark punch
              </Button>
            ) : null}
            {canRegularize ? (
              <Button
                type="button"
                className="h-11 rounded-xl"
                onClick={() => openPunch("regularize", selectedMember)}
              >
                <ClipboardPen className="h-4 w-4" />
                Request correction
              </Button>
            ) : null}
          </div>
        }
      >
        {selectedMember ? (
          <div className="space-y-4 pb-2">
            <PersonHero
              person={selectedMember}
              meta={selectedMember.designation}
              badge={
                selectedMember.relationship ? (
                  <span className="inline-flex rounded-full bg-[var(--lavender-soft)] px-2.5 py-1 text-[11px] font-semibold capitalize text-[var(--violet)]">
                    {selectedMember.relationship}
                  </span>
                ) : null
              }
            />
            <SectionCard kicker="Overview" title="Profile">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <DetailField label="Employee code">
                  {selectedMember.employeeCode}
                </DetailField>
                <DetailField label="Designation">
                  {selectedMember.designation}
                </DetailField>
                <DetailField label="Department">
                  {selectedMember.department}
                </DetailField>
                <DetailField label="Branch">
                  {selectedMember.branch}
                </DetailField>
                <DetailField label="Shift">{selectedMember.shift}</DetailField>
                <DetailField label="Email">{selectedMember.email}</DetailField>
                <DetailField label="Phone">{selectedMember.phone}</DetailField>
                <DetailField label="Join date">
                  {selectedMember.joinDate
                    ? formatDate(selectedMember.joinDate, dateFormat)
                    : null}
                </DetailField>
                <DetailField label="Reports as">
                  {selectedMember.relationship}
                </DetailField>
              </dl>
            </SectionCard>
          </div>
        ) : null}
      </SlideOver>

      <TeamPunchDrawer
        open={punch.open}
        mode={punch.mode}
        member={punch.member}
        members={rows}
        onClose={() =>
          setPunch({ open: false, mode: "mark", member: null })
        }
        onSuccess={(message) => setFlash(message)}
      />
    </PortalPage>
  );
}
