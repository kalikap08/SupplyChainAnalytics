import type { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export default function SectionCard({
  title,
  description,
  children,
  className = "",
}: SectionCardProps) {
  return (
    <section
      className={`rounded-xl2 border border-surface-border bg-surface-card p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-cardHover sm:p-6 ${className}`}
    >
      <h2 className="text-[15px] font-semibold text-ink-900">{title}</h2>
      {description && (
        <p className="mt-1 text-[12.5px] text-ink-400">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}
