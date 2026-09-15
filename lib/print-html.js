/**
 * Open server-rendered HTML (payslip / tax certificate print APIs)
 * in a new tab and trigger the browser print dialog → Save as PDF.
 */
export function openPrintHtml(html) {
  if (typeof window === "undefined") {
    throw new Error("Print is only available in the browser.");
  }
  const markup = String(html || "").trim();
  if (!markup) {
    throw new Error("Print document was empty.");
  }

  const blob = new Blob([markup], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const popup = window.open(url, "_blank", "noopener,noreferrer");

  if (!popup) {
    URL.revokeObjectURL(url);
    throw new Error("Popup blocked. Allow popups to print this document.");
  }

  const printWhenReady = () => {
    try {
      popup.focus();
      popup.print();
    } catch {
      // User can still print from the opened tab.
    }
  };

  popup.addEventListener("load", printWhenReady);
  window.setTimeout(printWhenReady, 600);
  window.setTimeout(() => URL.revokeObjectURL(url), 120000);
}

export function formatPayslipMoney(amount, currency = "PKR") {
  if (amount == null || amount === "") return "—";
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  const formatted = n.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${currency}`;
}

export function formatCompanyAddress(address) {
  if (!address) return "";
  if (typeof address === "string") return address.trim();
  return [
    address.line1,
    address.line2,
    address.city,
    address.stateProvince,
    address.country,
    address.zipCode,
  ]
    .map((part) => (part == null ? "" : String(part).trim()))
    .filter(Boolean)
    .join(", ");
}
