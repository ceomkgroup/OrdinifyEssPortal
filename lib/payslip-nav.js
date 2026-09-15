import { FileBadge, Receipt } from "lucide-react";

/**
 * Payslip section children (sidebar submenu).
 * screens: company-modules screenControllers (payroll).
 */
export const PAYSLIP_NAV = [
  {
    key: "payslips",
    href: "/payslip",
    title: "My Payslips",
    description: "View monthly payslips, earnings, and deductions.",
    icon: Receipt,
    screens: ["payroll"],
  },
  {
    key: "taxCertificate",
    href: "/payslip/tax-certificate",
    title: "Tax Certificate",
    description: "Income-tax deduction certificate for a tax year.",
    icon: FileBadge,
    screens: ["payroll"],
  },
];

export function getPayslipNavByHref(href) {
  return PAYSLIP_NAV.find((item) => item.href === href) || null;
}

export function getPayslipNavByKey(key) {
  return PAYSLIP_NAV.find((item) => item.key === key) || null;
}
