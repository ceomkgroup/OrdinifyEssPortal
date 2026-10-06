"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "dayjs/locale/en-gb";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { useCompanySettings } from "@/hooks/useCompanySettings";

dayjs.extend(customParseFormat);

/** Hex-only palette — MUI color utils reject CSS `var(--…)`. */
function createPickerTheme(mode = "light") {
  const dark = mode === "dark";
  return createTheme({
    palette: {
      mode,
      primary: {
        main: dark ? "#8b5cf6" : "#7b39ec",
        light: "#a78af9",
        dark: "#4b1d94",
      },
      text: {
        primary: dark ? "#f5f3ff" : "#1f2937",
        secondary: dark ? "#c4bdd9" : "#7b738f",
        disabled: dark ? "#c4bdd9" : "#8b849c",
      },
      action: {
        active: dark ? "#c4b5fd" : "#6b6287",
      },
      background: {
        paper: dark ? "#221c38" : "#ffffff",
        default: dark ? "#0b0914" : "#f3f2f8",
      },
      divider: dark ? "#4a3f6b" : "#e8e6ef",
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
              borderColor: dark ? "#8b5cf6" : "#7b39ec",
              borderWidth: 1.5,
            },
          },
          input: {
            paddingTop: 10,
            paddingBottom: 10,
            fontSize: 13,
            fontWeight: 600,
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontSize: 13,
            fontWeight: 600,
            "&.Mui-focused": { color: dark ? "#8b5cf6" : "#7b39ec" },
          },
        },
      },
    },
  });
}

function useDocumentColorMode() {
  const [mode, setMode] = useState("light");

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      setMode(root.getAttribute("data-theme") === "dark" ? "dark" : "light");
    };
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  return mode;
}

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

function PickerProviders({ children }) {
  const mode = useDocumentColorMode();
  const theme = useMemo(() => createPickerTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
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
  return (
    <PickerProviders>
      <DateFieldInner {...props} />
    </PickerProviders>
  );
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
  linked = true,
}) {
  return (
    <PickerProviders>
      <div className={`grid gap-3 sm:grid-cols-2 ${className}`}>
        <DateFieldInner
          label={fromLabel}
          value={from}
          onChange={onFromChange}
          max={linked ? to || undefined : undefined}
          clearable={clearable}
          required={required}
          dateFormat={dateFormat}
        />
        <DateFieldInner
          label={toLabel}
          value={to}
          onChange={onToChange}
          min={linked ? from || undefined : undefined}
          clearable={clearable}
          required={required}
          dateFormat={dateFormat}
        />
      </div>
    </PickerProviders>
  );
}
