/** Attendance history status filters + CSV helpers (client-side). */

/** @deprecated Prefer live options from useAttendanceTypes / buildAttendanceTypeFilterOptions */
export const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
];

export function buildAttendanceTypeFilterOptions(types = []) {
  return [
    {
      value: "all",
      label: "All statuses",
      name: "All statuses",
      code: null,
      colorCode: null,
    },
    ...(types || []).map((t) => ({
      value: t.key || t.code || t.id,
      label: t.code ? `${t.text} (${t.code})` : t.text,
      name: t.text || t.label || "Type",
      code: t.code || null,
      colorCode: t.colorCode || null,
    })),
  ];
}

/**
 * Match a history/today row (or raw code/name) to a dropdown type.
 */
export function matchAttendanceType(rowOrCode, types = []) {
  const list = Array.isArray(types) ? types : [];
  if (!list.length || rowOrCode == null) return null;

  if (typeof rowOrCode === "string" || typeof rowOrCode === "number") {
    const key = String(rowOrCode).trim().toLowerCase();
    return (
      list.find(
        (t) =>
          String(t.code || "").toLowerCase() === key ||
          String(t.key || "").toLowerCase() === key ||
          String(t.id || "").toLowerCase() === key ||
          String(t.text || "").toLowerCase() === key
      ) || null
    );
  }

  const row = rowOrCode;
  const id = String(
    row.attTypeId || row.attendanceTypeId || row.recno || ""
  ).toLowerCase();
  const code = String(row.attTypeCode || row.code || "")
    .trim()
    .toLowerCase();
  const name = String(
    row.attTypeName || row.statusLabel || row.text || ""
  )
    .trim()
    .toLowerCase();

  return (
    list.find((t) => id && String(t.id || "").toLowerCase() === id) ||
    list.find((t) => code && String(t.code || "").toLowerCase() === code) ||
    list.find((t) => name && String(t.text || "").toLowerCase() === name) ||
    null
  );
}

/** Color + label for a row using live attendance-types when needed. */
export function resolveAttendanceTypeDisplay(row, types = []) {
  const matched = matchAttendanceType(row, types);
  return {
    label:
      row?.attTypeName ||
      row?.statusLabel ||
      matched?.text ||
      "—",
    code: String(row?.attTypeCode || matched?.code || "")
      .trim()
      .toUpperCase() || null,
    colorCode: row?.colorCode || matched?.colorCode || "#a78af9",
    type: matched,
  };
}

/** Lookup type color by code / name (e.g. summary cards: P, A, HD). */
export function getAttendanceTypeColor(codeOrName, types = [], fallback = null) {
  const matched = matchAttendanceType(codeOrName, types);
  return matched?.colorCode || fallback;
}

function statusText(row) {
  return String(
    row?.attTypeName || row?.statusLabel || row?.attTypeCode || ""
  ).toLowerCase();
}

/**
 * Legacy bucket: present | late | absent
 * Kept for older call sites; prefer filterAttendanceByType.
 */
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

/** Filter by live attendance type key (code / id) or legacy present|late|absent. */
export function filterAttendanceByStatus(rows, statusFilter = "all", types = []) {
  const list = Array.isArray(rows) ? rows : [];
  if (!statusFilter || statusFilter === "all") return list;

  const legacy = ["present", "late", "absent"];
  if (legacy.includes(statusFilter)) {
    return list.filter((row) => getAttendanceStatusBucket(row) === statusFilter);
  }

  const key = String(statusFilter).trim().toLowerCase();
  return list.filter((row) => {
    const matched = matchAttendanceType(row, types);
    if (matched) {
      return (
        String(matched.key || "").toLowerCase() === key ||
        String(matched.code || "").toLowerCase() === key ||
        String(matched.id || "").toLowerCase() === key
      );
    }
    const code = String(row.attTypeCode || "")
      .trim()
      .toLowerCase();
    const name = String(row.attTypeName || row.statusLabel || "")
      .trim()
      .toLowerCase();
    return code === key || name === key;
  });
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
    "Code",
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
      row.attTypeCode || "",
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
