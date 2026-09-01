"use client";

import { useEffect, useMemo, useState } from "react";
import {
  readQueryInt,
  readQueryString,
  REQUEST_LIST_QUERY_DEFAULTS,
  usePersistListQuery,
  usePortalQuery,
} from "@/hooks/usePortalQuery";

/**
 * Attendance-style URL persistence for request list pages.
 * Pass `withType: true` for hub pages that filter by request type.
 */
export function useRequestListQuery({ withType = false } = {}) {
  const { searchParams } = usePortalQuery();
  const defaults = useMemo(
    () =>
      withType
        ? { ...REQUEST_LIST_QUERY_DEFAULTS, type: "all" }
        : REQUEST_LIST_QUERY_DEFAULTS,
    [withType]
  );

  const [status, setStatus] = useState(() =>
    readQueryString(searchParams, "status", defaults.status)
  );
  const [page, setPage] = useState(() =>
    readQueryInt(searchParams, "page", Number(defaults.page) || 1)
  );
  const [limit, setLimit] = useState(() =>
    readQueryInt(searchParams, "limit", Number(defaults.limit) || 10)
  );
  const [listQuery, setListQuery] = useState(() =>
    readQueryString(searchParams, "q", defaults.q)
  );
  const [dateFrom, setDateFrom] = useState(() =>
    readQueryString(searchParams, "from", defaults.from)
  );
  const [dateTo, setDateTo] = useState(() =>
    readQueryString(searchParams, "to", defaults.to)
  );
  const [draftDateFrom, setDraftDateFrom] = useState(() =>
    readQueryString(searchParams, "from", defaults.from)
  );
  const [draftDateTo, setDraftDateTo] = useState(() =>
    readQueryString(searchParams, "to", defaults.to)
  );
  const [typeFilter, setTypeFilter] = useState(() =>
    readQueryString(searchParams, "type", defaults.type || "all")
  );
  const [draftTypeFilter, setDraftTypeFilter] = useState(() =>
    readQueryString(searchParams, "type", defaults.type || "all")
  );

  useEffect(() => {
    setDraftDateFrom(dateFrom);
    setDraftDateTo(dateTo);
  }, [dateFrom, dateTo]);

  useEffect(() => {
    setDraftTypeFilter(typeFilter);
  }, [typeFilter]);

  const queryPatch = useMemo(() => {
    const patch = {
      status,
      q: listQuery,
      from: dateFrom,
      to: dateTo,
      page,
      limit,
    };
    if (withType) patch.type = typeFilter;
    return patch;
  }, [
    status,
    listQuery,
    dateFrom,
    dateTo,
    page,
    limit,
    typeFilter,
    withType,
  ]);

  const queryDeps = withType
    ? [status, listQuery, dateFrom, dateTo, page, limit, typeFilter]
    : [status, listQuery, dateFrom, dateTo, page, limit];

  usePersistListQuery(queryPatch, defaults, queryDeps);

  return {
    status,
    setStatus,
    page,
    setPage,
    limit,
    setLimit,
    listQuery,
    setListQuery,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    draftDateFrom,
    setDraftDateFrom,
    draftDateTo,
    setDraftDateTo,
    typeFilter,
    setTypeFilter,
    draftTypeFilter,
    setDraftTypeFilter,
  };
}
