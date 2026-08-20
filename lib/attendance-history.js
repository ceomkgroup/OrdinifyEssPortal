/** Attendance history status buckets + CSV helpers (client-side). */

export const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
];

function statusText(row) {
  return String(
    row?.attTypeName || row?.statusLabel || row?.attTypeCode || ""
  ).toLowerCase();
}

/** Map a history row to present | late | absent */
export function getAttendanceStatusBucket(row) {
  if (!row) return "absent";
  const text = statusText(row);
  const lateMinutes = Number(row.lateMinutes) || 0;

  if (text.includes("absent") || text === "a" || text.includes("no show")) {
    return "absent";
  }
  if (
    text.includes("late") ||
    lateMinutes > 0 ||
    text.includes("late present")
  ) {
    return "late";
  }
  if (
    text.includes("present") ||
    text.includes("half") ||
    text.includes("holiday work") ||
    text.includes("wfh") ||
    text.includes("on duty") ||
    row.checkInTime
  ) {
    return "present";
  }
  if (!row.checkInTime && !row.checkOutTime) return "absent";
  return "present";
}

export function filterAttendanceByStatus(rows, statusFilter = "all") {
  const list = Array.isArray(rows) ? rows : [];
  if (!statusFilter || statusFilter === "all") return list;
  return list.filter((row) => getAttendanceStatusBucket(row) === statusFilter);
}

function csvEscape(value) {
  if (value == null) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function formatCsvTime(value) {
  if (!value) return "";
  return String(value);
}

/** Build CSV string for attendance history rows */
export function attendanceRowsToCsv(rows, { includeBreak = false } = {}) {
  const headers = [
    "Date",
    "Status",
    "Check In",
    "Check Out",
    "Shift",
    "Working Hours",
    "Overtime Hours",
    "Late Minutes",
    "Early Exit Minutes",
    ...(includeBreak ? ["Break Minutes", "Break Count"] : []),
    "Punch Source",
    "Holiday Work",
    "Manual Override",
    "Remarks",
  ];

  const lines = [headers.join(",")];

  for (const row of rows || []) {
    const cols = [
      row.attendanceDate || "",
      row.attTypeName || row.statusLabel || "",
      formatCsvTime(row.checkInTime),
      formatCsvTime(row.checkOutTime),
      row.shiftName || "",
      row.workingHours ?? "",
      row.overtimeHours ?? "",
      row.lateMinutes ?? "",
      row.earlyExitMinutes ?? "",
      ...(includeBreak
        ? [row.breakMinutes ?? "", row.breakCount ?? ""]
        : []),
      row.punchSource || "",
      row.isHolidayWork ? "Yes" : "No",
      row.isManualOverride ? "Yes" : "No",
      row.remarks || "",
    ];
    lines.push(cols.map(csvEscape).join(","));
  }

  return lines.join("\r\n");
}

export function downloadCsv(filename, csvText) {
  const blob = new Blob([`\uFEFF${csvText}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function monthRange(year, month) {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const last = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { from, to };
}
