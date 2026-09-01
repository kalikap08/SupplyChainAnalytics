"use client";

import { useState } from "react";
import type { ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  defaultTabId?: string;
}

export default function Tabs({ tabs, defaultTabId }: TabsProps) {
  const [activeId, setActiveId] = useState(defaultTabId ?? tabs[0]?.id);
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  return (
    <div>
      <div className="flex gap-1 border-b border-surface-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveId(tab.id)}
            className={`relative px-3.5 py-2.5 text-[13px] font-medium transition-colors ${
              tab.id === active?.id
                ? "text-ink-900"
                : "text-ink-400 hover:text-ink-600"
            }`}
          >
            {tab.label}
            {tab.id === active?.id && (
              <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-accent-blue" />
            )}
          </button>
        ))}
      </div>
      <div className="pt-5">{active?.content}</div>
    </div>
  );
}
