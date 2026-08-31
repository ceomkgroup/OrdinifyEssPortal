"use client";

import { useCallback, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function normalizeQuery(qs) {
  const params = new URLSearchParams(qs);
  return [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

/**
 * Read/write portal list filters in the URL (persist across refresh).
 * Defaults are omitted so URLs stay clean.
 * Skips router.replace when the query is unchanged (avoids update loops).
 */
export function usePortalQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  const replaceQuery = useCallback(
    (patch, defaults = {}) => {
      const current = searchParamsRef.current;
      const next = new URLSearchParams(current.toString());
      for (const [key, value] of Object.entries(patch)) {
        const str = value == null ? "" : String(value);
        const def = defaults[key] != null ? String(defaults[key]) : "";
        if (!str || str === def) next.delete(key);
        else next.set(key, str);
      }
      const qs = next.toString();
      if (normalizeQuery(qs) === normalizeQuery(current.toString())) {
        return;
      }
      const href = qs ? `${pathname}?${qs}` : pathname;
      router.replace(href, { scroll: false });
    },
    [router, pathname]
  );

  return { searchParams, replaceQuery };
}

export function readQueryInt(searchParams, key, fallback) {
  const raw = Number(searchParams?.get(key));
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

export function readQueryString(searchParams, key, fallback = "") {
  const raw = searchParams?.get(key);
  return raw != null && raw !== "" ? raw : fallback;
}
