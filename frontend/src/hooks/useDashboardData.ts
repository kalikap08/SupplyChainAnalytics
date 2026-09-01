"use client";

import { useCallback, useEffect, useState } from "react";
import type { FetchState } from "@/types/analytics";

export function useDashboardData<T>(fetcher: () => Promise<T>) {
  const [state, setState] = useState<FetchState<T>>({ status: "loading" });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setState({ status: "loading" });
      }

      try {
        const data = await fetcher();
        setState({ status: "success", data });
        setLastUpdated(new Date());
      } catch (err) {
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Unknown error.",
        });
      } finally {
        setIsRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  return { state, lastUpdated, isRefreshing, refresh: () => load(true), retry: () => load() };
}
