import { useCallback, useEffect, useState } from "react";
import { buildApiHeaders } from "@/utils/utils.js";

const PAGE_SIZE = 18;

export function useMatches(currentUser, appliedFilters) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchMatches = useCallback(
    async (options = {}) => {
      const { append = false, requestOffset = 0, silent = false } = options;

      if (!currentUser) return;

      if (append) setLoadingMore(true);
      else if (!silent) setLoading(true);

      try {
        const params = new URLSearchParams();

        // Convert filter object to URL parameters
        Object.entries(appliedFilters).forEach(([key, val]) => {
          if (Array.isArray(val)) {
            if (val.length) params.append(key, val.join(","));
          } else if (val !== "" && val != null) {
            params.append(key, val);
          }
        });

        // Add pagination parameters
        params.append("limit", PAGE_SIZE);
        params.append("offset", requestOffset);

        const res = await fetch(`/api/matches?${params}`, {
          headers: buildApiHeaders(currentUser),
        });

        const data = await res.json();

        setHasMore(Array.isArray(data) && data.length === PAGE_SIZE);
        setUsers((prev) => (append ? [...prev, ...data] : data));
        setOffset(requestOffset + (data.length || 0));
      } catch {
        if (!append) setUsers([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [currentUser, appliedFilters],
  );

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  return {
    users,
    setUsers,
    loading,
    loadingMore,
    offset,
    hasMore,
    fetchMatches,
    setOffset,
  };
}
