"use client";

import { ProfileCard } from "@/components/dashboard/ProfileCard";
import { ShiftCard } from "@/components/dashboard/ShiftCard";
import { PunchPermissionsCard } from "@/components/dashboard/PunchPermissionsCard";
import { TodayStatusCard } from "@/components/dashboard/TodayStatusCard";
import { LeaveBalanceCard } from "@/components/dashboard/LeaveBalanceCard";
import { AttendanceMonthCard } from "@/components/dashboard/AttendanceMonthCard";
import { WeeklyHoursCard } from "@/components/dashboard/WeeklyHoursCard";
import { PendingRequestsCard } from "@/components/dashboard/PendingRequestsCard";
import { UpcomingHolidayCard } from "@/components/dashboard/UpcomingHolidayCard";
import { TeamMembersCard } from "@/components/dashboard/TeamMembersCard";
import { LastPayslipBar } from "@/components/dashboard/LastPayslipBar";
import { CompanySettingsCard } from "@/components/dashboard/CompanySettingsCard";
import { PunchWidget } from "@/components/dashboard/PunchWidget";
import { Button } from "@/components/ui/Button";
import { PageLoader } from "@/components/ui/Spinner";
import { useDashboard } from "@/hooks/useDashboard";
import { useAttendanceLive } from "@/hooks/useAttendance";
import { useAuth } from "@/components/auth/AuthProvider";
import { useModules } from "@/components/modules/ModulesProvider";
import { greetingByHour } from "@/lib/format";

export function DashboardView() {
  const { logout, employee: authEmployee } = useAuth();
  const { canShowWidget } = useModules();
  const { data, loading, error, refetch } = useDashboard();
  const {
    today: liveToday,
    summary: liveSummary,
    geofence,
    geofenceEnabled,
    refetch: refetchAttendance,
    applyCheckInResult,
    applyCheckOutResult,
    applyBreakResult,
  } = useAttendanceLive({
    // Dashboard payload already has today + month — only geo on mount.
    fetchTodayOnMount: false,
    fetchSummaryOnMount: false,
  });

  if (loading && !data) {
    return <PageLoader label="Loading dashboard" hint="Pulling your day overview…" />;
  }

  if ((error || !data) && !loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <p className="heading-sub text-[var(--danger)]">
          {error || "Unable to load dashboard"}
        </p>
        <div className="flex gap-2">
          <Button onClick={refetch}>Try again</Button>
          <Button variant="outline" onClick={logout}>
            Logout
          </Button>
        </div>
      </div>
    );
  }

  const settings = data.companySettings || {};
  const firstName = data.employee?.firstName || data.employee?.fullName || "";

  const showLeave = canShowWidget("leaveBalance");
  const showAttendance = canShowWidget("attendanceMonth");
  const showWeekly = canShowWidget("weeklyHours");
  const showPending = canShowWidget("pendingRequests");
  const showHolidays = canShowWidget("upcomingHolidays");
  const showTeam = canShowWidget("teamMembers");
  const showPayslip = canShowWidget("lastPayslip") && Boolean(data.lastPayslip);
  const showSettings = canShowWidget("companySettings");
  const showPunch = canShowWidget("punchWidget");
  const showPunchPerms = canShowWidget("punchPermissions");
  const showToday = canShowWidget("todayStatus");
  const showShift = canShowWidget("shift");
  const todayForUi = liveToday !== undefined ? liveToday : data.today;
  const monthForUi = liveSummary || data.attendance;

  const midCount = [showLeave, showAttendance, showWeekly].filter(Boolean).length;
  const bottomCount = [showPending, showHolidays, showTeam].filter(Boolean).length;

  return (
    <>
      <div className="mb-3 flex min-w-0 flex-col gap-1 sm:mb-4 md:mb-5">
        <h1 className="heading-page">
          {greetingByHour()}, {firstName}
        </h1>
        <p className="heading-sub">
          Here&apos;s what&apos;s happening with you today.
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-3 sm:gap-4">
        <div className="grid grid-cols-1 items-stretch gap-3 sm:gap-4 lg:grid-cols-2 2xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)]">
          <ProfileCard
            employee={data.employee}
            dateFormat={settings.dateFormat}
          />
          {showShift ? (
            <ShiftCard
              shift={data.shift}
              company={data.company}
              timeFormat={settings.timeFormat}
            />
          ) : null}
          {showPunchPerms ? (
            <PunchPermissionsCard punchPermissions={data.punchPermissions} />
          ) : null}
          {showToday ? (
            <TodayStatusCard
              today={todayForUi}
              timeFormat={settings.timeFormat}
              emptyMessage={
                liveToday === null ? "Not checked in today" : undefined
              }
            />
          ) : null}
        </div>

        {showPunch ? (
          <PunchWidget
            timer={data.timer}
            shift={data.shift}
            punchPermissions={data.punchPermissions}
            employee={data.employee || authEmployee}
            todayAttendance={todayForUi}
            geofence={geofenceEnabled ? geofence : null}
            timeFormat={settings.timeFormat}
            onCheckedIn={(result) => {
              applyCheckInResult(result);
              // Refresh today/month only — avoid a full dashboard reload.
              refetchAttendance();
            }}
            onCheckedOut={(result) => {
              applyCheckOutResult(result);
              refetchAttendance();
            }}
            onBreakChanged={(result, action) => {
              applyBreakResult(result, action);
              refetchAttendance();
            }}
          />
        ) : null}

        {midCount > 0 ? (
          <div
            className={`grid grid-cols-1 items-stretch gap-3 sm:gap-4 ${
              midCount >= 2 ? "md:grid-cols-2" : ""
            } ${
              midCount >= 3
                ? "2xl:grid-cols-3"
                : midCount === 2
                  ? "xl:grid-cols-2"
                  : ""
            }`}
          >
            {showLeave ? <LeaveBalanceCard leave={data.leave} /> : null}
            {showAttendance ? (
              <AttendanceMonthCard attendance={monthForUi} />
            ) : null}
            {showWeekly ? (
              <WeeklyHoursCard weekHours={data.attendance?.weekHours} />
            ) : null}
          </div>
        ) : null}

        {bottomCount > 0 ? (
          <div
            className={`grid grid-cols-1 items-stretch gap-3 sm:gap-4 ${
              bottomCount >= 2 ? "lg:grid-cols-2" : ""
            } ${
              bottomCount >= 3
                ? "2xl:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)_minmax(0,1.35fr)]"
                : bottomCount === 2
                  ? "xl:grid-cols-2"
                  : ""
            }`}
          >
            {showPending ? (
              <PendingRequestsCard pendingRequests={data.pendingRequests} />
            ) : null}
            {showHolidays ? (
              <UpcomingHolidayCard
                holidays={data.upcomingHolidays}
                dateFormat={settings.dateFormat}
              />
            ) : null}
            {showTeam ? <TeamMembersCard teamMembers={data.teamMembers} /> : null}
          </div>
        ) : null}

        {showPayslip || showSettings ? (
          <div
            className={`grid grid-cols-1 items-stretch gap-3 sm:gap-4 ${
              showPayslip && showSettings
                ? "lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]"
                : ""
            }`}
          >
            {showPayslip ? (
              <LastPayslipBar
                lastPayslip={data.lastPayslip}
                dateFormat={settings.dateFormat}
              />
            ) : null}
            {showSettings ? (
              <CompanySettingsCard companySettings={settings} />
            ) : null}
          </div>
        ) : null}

        {Array.isArray(data.birthdaysToday) && data.birthdaysToday.length > 0 ? (
          <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4 text-[13px] text-[var(--text)] shadow-[var(--card-shadow)]">
            {data.birthdaysToday.length} birthday
            {data.birthdaysToday.length > 1 ? "s" : ""} today
          </div>
        ) : null}
      </div>
    </>
  );
}
