"use client";

import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import ErrorCard from "@/components/ErrorCard";
import { useDashboardData } from "@/hooks/useDashboardData";

interface PageShellProps<T> {
  title: string;
  subtitle: string;
  fetcher: () => Promise<T>;
  children: (data: T) => ReactNode;
}

export default function PageShell<T>({
  title,
  subtitle,
  fetcher,
  children,
}: PageShellProps<T>) {
  const { state, lastUpdated, isRefreshing, refresh, retry } =
    useDashboardData(fetcher);

  return (
    <div className="min-h-screen bg-app-gradient">
      <Sidebar />

      <main className="pt-14 lg:pl-64 lg:pt-0">
        <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <Header
            title={title}
            subtitle={subtitle}
            lastUpdated={lastUpdated}
            onRefresh={refresh}
            isRefreshing={isRefreshing}
          />

          <div className="mt-6 sm:mt-8">
            {state.status === "loading" && <LoadingSkeleton />}
            {state.status === "error" && (
              <ErrorCard message={state.message} onRetry={retry} />
            )}
            {state.status === "success" && children(state.data)}
          </div>
        </div>
      </main>
    </div>
  );
}
