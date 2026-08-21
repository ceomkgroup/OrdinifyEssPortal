const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatTime(time24, timeFormat = "12h") {
  if (!time24) return "—";

  // ISO datetime → extract local clock time
  if (String(time24).includes("T") || String(time24).endsWith("Z")) {
    const date = new Date(time24);
    if (!Number.isNaN(date.getTime())) {
      const h = date.getHours();
      const m = date.getMinutes();
      if (timeFormat === "24h") {
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      }
      const period = h >= 12 ? "PM" : "AM";
      const hour12 = h % 12 || 12;
      return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
    }
  }

  const [h, m] = String(time24).split(":").map(Number);
  if (Number.isNaN(h)) return time24;
  if (timeFormat === "24h") {
    return `${String(h).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
  }
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${String(m || 0).padStart(2, "0")} ${period}`;
}

export function formatDateTime(iso, dateFormat = "DD/MM/YYYY", timeFormat = "12h") {
  if (!iso) return "—";
  return `${formatDate(iso, dateFormat)} ${formatTime(iso, timeFormat)}`;
}

export function formatDate(dateStr, dateFormat = "DD/MM/YYYY") {
  if (!dateStr) return "—";

  // Parse YYYY-MM-DD as a calendar date to avoid timezone day-shift.
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  let yyyy;
  let mm;
  let dd;

  if (match) {
    yyyy = match[1];
    mm = match[2];
    dd = match[3];
  } else {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    yyyy = String(date.getFullYear());
    mm = String(date.getMonth() + 1).padStart(2, "0");
    dd = String(date.getDate()).padStart(2, "0");
  }

  switch (dateFormat) {
    case "MM/DD/YYYY":
      return `${mm}/${dd}/${yyyy}`;
    case "YYYY-MM-DD":
      return `${yyyy}-${mm}-${dd}`;
    default:
      return `${dd}/${mm}/${yyyy}`;
  }
}

export function formatMonthYear(year, month) {
  if (!year || !month) return "";
  return `${MONTHS[month - 1]} ${year}`;
}

export function formatCurrency(amount, currency = "PKR") {
  if (amount == null) return "—";
  const formatted = Number(amount).toLocaleString("en-PK");
  return `${currency} ${formatted}`;
}

export function formatHoursMinutes(totalHours) {
  const hours = Math.floor(totalHours || 0);
  const minutes = Math.round(((totalHours || 0) - hours) * 60);
  return `${hours}h ${minutes}m`;
}

export function formatWorkedTimer(workedMinutes = 0) {
  const totalSeconds = Math.max(0, Math.floor(Number(workedMinutes) * 60));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function greetingByHour(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function getDisplayName(person) {
  if (!person) return "";
  if (person.fullName) return person.fullName;
  const joined = [person.firstName, person.lastName].filter(Boolean).join(" ");
  return joined || person.email || person.employeeCode || "";
}

export function getInitials(name = "") {
  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "U";

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** 1-based row number; respects pagination when page + limit provided. */
export function rowSerial(index, page = 1, limit = 0) {
  const i = Number(index) || 0;
  const p = Math.max(1, Number(page) || 1);
  const l = Math.max(0, Number(limit) || 0);
  if (!l) return i + 1;
  return (p - 1) * l + i + 1;
}
