import type { ComponentType, SVGProps } from "react";

type Accent = "blue" | "emerald" | "violet" | "amber" | "cyan" | "rose";

const accentStyles: Record<Accent, { bar: string; iconBg: string; text: string }> = {
  blue: {
    bar: "bg-accent-blue",
    iconBg: "bg-gradient-to-br from-accent-blue/20 to-accent-blue/5",
    text: "text-accent-blue",
  },
  emerald: {
    bar: "bg-accent-emerald",
    iconBg: "bg-gradient-to-br from-accent-emerald/20 to-accent-emerald/5",
    text: "text-accent-emerald",
  },
  violet: {
    bar: "bg-accent-violet",
    iconBg: "bg-gradient-to-br from-accent-violet/20 to-accent-violet/5",
    text: "text-accent-violet",
  },
  amber: {
    bar: "bg-accent-amber",
    iconBg: "bg-gradient-to-br from-accent-amber/20 to-accent-amber/5",
    text: "text-accent-amber",
  },
  cyan: {
    bar: "bg-accent-cyan",
    iconBg: "bg-gradient-to-br from-accent-cyan/20 to-accent-cyan/5",
    text: "text-accent-cyan",
  },
  rose: {
    bar: "bg-accent-rose",
    iconBg: "bg-gradient-to-br from-accent-rose/20 to-accent-rose/5",
    text: "text-accent-rose",
  },
};

export interface KpiCardProps {
  label: string;
  value: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  accent: Accent;
  /** When provided, the card becomes clickable (e.g. to open a drill-down of the underlying records). */
  onClick?: () => void;
}

export default function KpiCard({
  label,
  value,
  description,
  icon: Icon,
  accent,
  onClick,
}: KpiCardProps) {
  const style = accentStyles[accent];

  const content = (
    <>
      <span className={`absolute inset-x-0 top-0 h-[3px] ${style.bar}`} />
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-medium text-ink-600">{label}</p>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.iconBg} ${style.text}`}
        >
          <Icon width={18} height={18} />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-ink-900">
        {value}
      </p>
      <p className="mt-1.5 text-[12.5px] leading-snug text-ink-400">
        {description}
      </p>
      {onClick && (
        <span className="mt-2 block text-[11.5px] font-medium text-ink-400 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          View all records &rarr;
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group relative w-full overflow-hidden rounded-xl2 border border-surface-border bg-surface-card p-5 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-cardHover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-xl2 border border-surface-border bg-surface-card p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-cardHover">
      {content}
    </div>
  );
}
