import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps, children: React.ReactNode) {
  const { width = 18, height = 18, ...rest } = props;
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const DashboardIcon = (p: IconProps) =>
  base(
    p,
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>,
  );

export const LeadsIcon = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
    </>,
  );

export const PipelineIcon = (p: IconProps) =>
  base(
    p,
    <>
      <rect x="3" y="4" width="5" height="16" rx="1.5" />
      <rect x="10" y="4" width="5" height="11" rx="1.5" />
      <rect x="17" y="4" width="5" height="7" rx="1.5" />
    </>,
  );

export const TeamIcon = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </>,
  );

export const QuotationIcon = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
      <path d="M14 2v5h5M9 13h6M9 17h4" />
    </>,
  );

export const WhatsAppIcon = (p: IconProps) => {
  const { width = 18, height = 18, fill = "currentColor", ...rest } = p;
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill={fill} {...rest}>
      <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2z" />
    </svg>
  );
};

export const WaFlowIcon = (p: IconProps) =>
  base(
    p,
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.5 9.5 0 0 1-3.9-.8L3 21l1.9-5a8.4 8.4 0 0 1-.8-3.6 8.4 8.4 0 0 1 8.4-8.4 8.4 8.4 0 0 1 8.5 8.5z" />,
  );

export const StatisticsIcon = (p: IconProps) =>
  base(p, <path d="M4 20V10M10 20V4M16 20v-7M22 20V7" />);

export const SettingsIcon = (p: IconProps) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M20 12a8 8 0 0 1-.2 1.8l2 1.5-2 3.4-2.3-1a8 8 0 0 1-1.6.9l-.3 2.4h-4l-.3-2.4a8 8 0 0 1-1.6-.9l-2.3 1-2-3.4 2-1.5A8 8 0 0 1 4 12z" />
    </>,
  );

export const SignOutIcon = (p: IconProps) =>
  base(p, <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />);

export const MeIcon = (p: IconProps) =>
  base(
    p,
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>,
  );

export const SunIcon = (p: IconProps) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
    </>,
  );

export const MoonIcon = (p: IconProps) =>
  base(p, <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />);

export const ChevronDownIcon = (p: IconProps) => base(p, <path d="M6 9l6 6 6-6" />);
export const CheckIcon = (p: IconProps) => base(p, <path d="M20 6 9 17l-5-5" />);
export const ChevronRightIcon = (p: IconProps) => base(p, <path d="M9 6l6 6-6 6" />);

export const SearchIcon = (p: IconProps) =>
  base(
    p,
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>,
  );

export const AlertIcon = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.9 2.4 17a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </>,
  );

export const ClockIcon = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>,
  );

export const PhoneIcon = (p: IconProps) =>
  base(
    p,
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />,
  );
