import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconRevenue(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h11a4 4 0 0 1 0 8H4" />
      <path d="M4 7V5m0 2v2m0 6v2m0-2v-2" />
      <path d="M8 11h4" />
    </svg>
  );
}

export function IconOrders(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 7h12l-1 12.5a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 6 19.5L5 7Z" />
      <path d="M9 7V5.5A2.5 2.5 0 0 1 11.5 3h1A2.5 2.5 0 0 1 15 5.5V7" />
    </svg>
  );
}

export function IconUnits(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M21 8 12 3 3 8l9 5 9-5Z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </svg>
  );
}

export function IconProcurement(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="7" width="18" height="13" rx="1.5" />
      <path d="M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7" />
      <path d="M3 12h18" />
    </svg>
  );
}

export function IconInventory(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4" width="18" height="5" rx="1" />
      <rect x="3" y="12" width="18" height="8" rx="1" />
      <path d="M7 16h4" />
    </svg>
  );
}

export function IconFillRate(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.3 2.3 4.7-5.1" />
    </svg>
  );
}

export function IconDelivery(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2" y="7" width="12" height="9" rx="1" />
      <path d="M14 10h4l3 3v3h-7" />
      <circle cx="6.5" cy="18" r="1.6" />
      <circle cx="16.5" cy="18" r="1.6" />
    </svg>
  );
}

export function IconReturnRate(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12a8 8 0 1 1 2.6 5.9" />
      <path d="M4 17v-4h4" />
    </svg>
  );
}

export function IconShippingCost(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2" y="7" width="12" height="9" rx="1" />
      <path d="M14 10h4l3 3v3h-7" />
      <path d="M5 10.5h5" />
    </svg>
  );
}

export function IconReturns(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 10h11a4 4 0 0 1 0 8H9" />
      <path d="m6 6-3 4 3 4" />
    </svg>
  );
}

export function IconReturnedUnits(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M21 8 12 3 3 8l9 5 9-5Z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="m9.5 12.5 2 2 3-3" />
    </svg>
  );
}

export function IconStockout(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M10.3 4.3 2.9 18a1.5 1.5 0 0 0 1.3 2.2h15.6a1.5 1.5 0 0 0 1.3-2.2L13.7 4.3a1.5 1.5 0 0 0-2.6 0Z" />
      <path d="M12 10v4" />
      <path d="M12 17.2v.1" />
    </svg>
  );
}

export function IconGrid(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
    </svg>
  );
}

export function IconTrend(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m3 16 6-6 4 4 8-9" />
      <path d="M15 5h6v6" />
    </svg>
  );
}

export function IconBox(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M21 8 12 3 3 8l9 5 9-5Z" />
      <path d="M3 8v8l9 5 9-5V8" />
    </svg>
  );
}

export function IconClipboard(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="4" width="14" height="17" rx="1.5" />
      <rect x="9" y="2.5" width="6" height="3" rx="1" />
      <path d="M8.5 11h7M8.5 15h7" />
    </svg>
  );
}

export function IconTruck(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2" y="7" width="12" height="9" rx="1" />
      <path d="M14 10h4l3 3v3h-7" />
      <circle cx="6.5" cy="18" r="1.6" />
      <circle cx="16.5" cy="18" r="1.6" />
    </svg>
  );
}

export function IconRotate(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12a8 8 0 1 1 2.6 5.9" />
      <path d="M4 17v-4h4" />
    </svg>
  );
}

export function IconRefresh(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M20 12a8 8 0 1 1-2.3-5.6" />
      <path d="M20 4v5h-5" />
    </svg>
  );
}

export function IconAlert(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M10.3 4.3 2.9 18a1.5 1.5 0 0 0 1.3 2.2h15.6a1.5 1.5 0 0 0 1.3-2.2L13.7 4.3a1.5 1.5 0 0 0-2.6 0Z" />
      <path d="M12 10v4" />
      <path d="M12 17.2v.1" />
    </svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

export function IconUpload(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 16.5v1.5A2 2 0 0 0 6 20h12a2 2 0 0 0 2-2v-1.5" />
      <path d="M12 15V4" />
      <path d="m7 8.5 5-5 5 5" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.3 2.3 4.7-5.1" />
    </svg>
  );
}

export function IconDownload(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 16.5v1.5A2 2 0 0 0 6 20h12a2 2 0 0 0 2-2v-1.5" />
      <path d="M12 4v11" />
      <path d="m7 10.5 5 5 5-5" />
    </svg>
  );
}

export function IconLogoMark(props: IconProps) {
  return (
    <svg {...base} viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 5.5 19 17H5L12 5.5Z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <circle cx="12" cy="5.5" r="2.25" fill="currentColor" stroke="none" />
      <circle cx="19" cy="17" r="2.25" fill="currentColor" stroke="none" />
      <circle cx="5" cy="17" r="2.25" fill="currentColor" stroke="none" />
    </svg>
  );
}
