"use client";

import { useMemo } from "react";
import dayjs from "dayjs";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

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

function DateFieldInner({
  label,
  value,
  onChange,
  min,
  max,
  clearable = false,
  className = "",
}) {
  const parsed = useMemo(() => (value ? dayjs(value) : null), [value]);
  const minDate = useMemo(() => (min ? dayjs(min) : undefined), [min]);
  const maxDate = useMemo(() => (max ? dayjs(max) : undefined), [max]);

  return (
    <div className={className}>
      <DatePicker
        label={label}
        value={parsed?.isValid() ? parsed : null}
        minDate={minDate}
        maxDate={maxDate}
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
          },
          field: {
            clearable: Boolean(clearable),
            onClear: () => onChange?.(""),
          },
          openPickerButton: {
            size: "small",
          },
          popper: {
            sx: { zIndex: 1400 },
          },
        }}
      />
    </div>
  );
}

function withPickerProviders(children) {
  return (
    <ThemeProvider theme={pickerTheme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        {children}
      </LocalizationProvider>
    </ThemeProvider>
  );
}

/**
 * MUI DatePicker for filter drawers. Value is YYYY-MM-DD string.
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
      />
      <DateFieldInner
        label={toLabel}
        value={to}
        onChange={onToChange}
        min={from || undefined}
        clearable={clearable}
      />
    </div>
  );
}
