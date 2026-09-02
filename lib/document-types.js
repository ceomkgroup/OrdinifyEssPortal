import { Building2, FileStack } from "lucide-react";

/**
 * Documents section children (sidebar submenu), like REQUEST_TYPES.
 * screens: company-modules screenControllers required for each child.
 */
export const DOCUMENT_TYPES = [
  {
    key: "myDocuments",
    href: "/documents/my",
    title: "My Documents",
    description: "Upload and manage your HR documents.",
    icon: FileStack,
    screens: null, // always show
  },
  {
    key: "companyDocuments",
    href: "/documents/company",
    title: "Company Documents",
    description: "Browse published company policies and files.",
    icon: Building2,
    screens: null, // always show
  },
];

export function getDocumentTypeByHref(href) {
  return DOCUMENT_TYPES.find((item) => item.href === href) || null;
}

export function getDocumentTypeByKey(key) {
  return DOCUMENT_TYPES.find((item) => item.key === key) || null;
}
