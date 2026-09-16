"use client";

import { useMemo } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "dayjs/locale/en-gb";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { useCompanySettings } from "@/hooks/useCompanySettings";

dayjs.extend(customParseFormat);

const pickerTheme = createTheme({
  palette: {
    primary: {
      main: "#7b39ec",
      light: "#a78af9",
      dark: "#4b1d94",
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "var(--font-body), system-ui, sans-serif",
    fontSize: 13,
  },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "var(--surface)",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "var(--border)",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(123, 57, 236, 0.45)",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#7b39ec",
            borderWidth: 1.5,
          },
        },
        input: {
          paddingTop: 10,
          paddingBottom: 10,
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text)",
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: 13,
          fontWeight: 600,
          color: "var(--muted)",
          "&.Mui-focused": { color: "#7b39ec" },
        },
      },
    },
  },
});

/** Company dateFormat → picker display. Default always day/month/year. */
export function toPickerDateFormat(dateFormat = "DD/MM/YYYY") {
  const key = String(dateFormat || "DD/MM/YYYY")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  if (key === "MM/DD/YYYY") return "MM/DD/YYYY";
  if (key === "YYYY-MM-DD" || key === "YYYY/MM/DD") return "YYYY-MM-DD";
  if (key === "DD-MM-YYYY") return "DD-MM-YYYY";
  return "DD/MM/YYYY";
}

function parseApiDate(value) {
  if (!value) return null;
  const raw = String(value).trim();
  // API / form value is always YYYY-MM-DD
  const iso = dayjs(raw, "YYYY-MM-DD", true);
  if (iso.isValid()) return iso;
  const loose = dayjs(raw);
  return loose.isValid() ? loose : null;
}

function DateFieldInner({
  label,
  value,
  onChange,
  min,
  max,
  clearable = false,
  required = false,
  disabled = false,
  dateFormat,
  className = "",
}) {
  const { settings } = useCompanySettings();
  const displayFormat = toPickerDateFormat(
    dateFormat || settings.dateFormat || "DD/MM/YYYY"
  );
  const parsed = useMemo(() => parseApiDate(value), [value]);
  const minDate = useMemo(() => (min ? parseApiDate(min) : undefined), [min]);
  const maxDate = useMemo(() => (max ? parseApiDate(max) : undefined), [max]);

  return (
    <div className={className}>
      <DatePicker
        label={label}
        format={displayFormat}
        views={["year", "month", "day"]}
        openTo="day"
        value={parsed}
        minDate={minDate || undefined}
        maxDate={maxDate || undefined}
        disabled={disabled}
        onChange={(next) => {
          if (!next || !next.isValid()) {
            onChange?.("");
            return;
          }
          onChange?.(next.format("YYYY-MM-DD"));
        }}
        slotProps={{
          textField: {
            size: "small",
            fullWidth: true,
            required,
            placeholder: displayFormat,
          },
          field: {
            clearable: Boolean(clearable),
            onClear: () => onChange?.(""),
          },
          openPickerButton: {
            size: "small",
          },
          popper: {
            sx: { zIndex: 2000 },
          },
        }}
      />
    </div>
  );
}

function withPickerProviders(children) {
  return (
    <ThemeProvider theme={pickerTheme}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
        {children}
      </LocalizationProvider>
    </ThemeProvider>
  );
}

/**
 * MUI DatePicker. Value is always YYYY-MM-DD for APIs.
 * Display defaults to DD/MM/YYYY (day / month / year).
 */
export function MuiDateField(props) {
  return withPickerProviders(<DateFieldInner {...props} />);
}

/** From + To pair for attendance / request filter drawers. */
export function MuiDateRangeFields({
  from,
  to,
  onFromChange,
  onToChange,
  fromLabel = "From",
  toLabel = "To",
  clearable = true,
  required = false,
  dateFormat,
  className = "",
}) {
  return withPickerProviders(
    <div className={`grid gap-3 sm:grid-cols-2 ${className}`}>
      <DateFieldInner
        label={fromLabel}
        value={from}
        onChange={onFromChange}
        max={to || undefined}
        clearable={clearable}
        required={required}
        dateFormat={dateFormat}
      />
      <DateFieldInner
        label={toLabel}
        value={to}
        onChange={onToChange}
        min={from || undefined}
        clearable={clearable}
        required={required}
        dateFormat={dateFormat}
      />
    </div>
  );
}
