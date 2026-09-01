"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconGrid,
  IconTrend,
  IconBox,
  IconClipboard,
  IconTruck,
  IconRotate,
  IconMenu,
  IconClose,
  IconLogoMark,
  IconDownload,
} from "@/components/icons";

const SAMPLE_FILES = [
  { label: "Carriers (dim_carrier)", href: "/sample-data/dim_carrier_sample.csv" },
  { label: "Suppliers (dim_supplier)", href: "/sample-data/dim_supplier_sample.csv" },
  { label: "Locations (dim_location)", href: "/sample-data/dim_location_sample.csv" },
] as const;

const NAV_ITEMS = [
  { label: "Executive Overview", href: "/", icon: IconGrid },
  { label: "Sales & Demand", href: "/sales", icon: IconTrend },
  { label: "Inventory", href: "/inventory", icon: IconBox },
  { label: "Procurement", href: "/procurement", icon: IconClipboard },
  { label: "Logistics", href: "/logistics", icon: IconTruck },
  { label: "Returns", href: "/returns", icon: IconRotate },
] as const;

function Brand({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <IconLogoMark width={22} height={22} className="shrink-0 text-accent-blue" />
      <p className="whitespace-nowrap text-[13.5px] font-semibold text-white">
        Supply Chain Analytics
      </p>
    </div>
  );
}

function SidebarFooter() {
  return (
    <div className="border-t border-white/10 px-6 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
        Test Data
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-white/40">
        Download a sample CSV, then upload it back to see the change reflected.
      </p>
      <div className="mt-2.5 space-y-0.5">
        {SAMPLE_FILES.map((file) => (
          <a
            key={file.href}
            href={file.href}
            download
            className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-[12px] font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white/90"
          >
            <IconDownload width={13} height={13} className="shrink-0" />
            {file.label}
          </a>
        ))}
      </div>
      <p className="mt-4 border-t border-white/10 pt-3 text-[11px] leading-relaxed text-white/40">
        Connected to FastAPI backend
      </p>
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
      {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={label}
            href={href}
            onClick={onNavigate}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13.5px] font-medium transition-colors ${
              isActive
                ? "bg-white/10 text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white/90"
            }`}
          >
            <Icon width={17} height={17} className="shrink-0" />
            <span className="flex-1">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-navy-900 lg:flex">
        <div className="flex h-16 items-center border-b border-white/10 px-6">
          <Brand />
        </div>
        <NavLinks />
        <SidebarFooter />
      </aside>

      <div className="fixed inset-x-0 top-0 z-20 flex h-14 items-center justify-between border-b border-white/10 bg-navy-900 px-4 sm:px-6 lg:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open navigation menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <IconMenu width={20} height={20} />
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div
            className="absolute inset-0 bg-navy-950/60 backdrop-blur-[1px]"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-navy-900 shadow-cardHover">
            <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
              <Brand />
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close navigation menu"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <IconClose width={20} height={20} />
              </button>
            </div>
            <NavLinks onNavigate={() => setIsOpen(false)} />
            <SidebarFooter />
          </aside>
        </div>
      )}
    </>
  );
}
