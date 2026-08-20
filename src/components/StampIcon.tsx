import type { SVGProps } from "react";

type StampIconProps = SVGProps<SVGSVGElement> & {
  floor: number;
};

export default function StampIcon({ floor, ...props }: StampIconProps) {
  const paths = {
    1: (
      <>
        <path d="m8 11 2 2 3-3" />
        <path d="M2 12h3l2-2h4l2 2h3" />
        <path d="M5 12v3a2 2 0 0 0 2 2h2" />
        <path d="M19 12v3a2 2 0 0 1-2 2h-3" />
      </>
    ),
    2: (
      <>
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M12 2a7 7 0 0 0-4 12.74V17h8v-2.26A7 7 0 0 0 12 2Z" />
        <path d="M19 4v4" />
        <path d="M17 6h4" />
      </>
    ),
    3: (
      <>
        <path d="m3 7 9-4 9 4-9 4-9-4Z" />
        <path d="M7 9v5c2 2 8 2 10 0V9" />
        <path d="M21 7v6" />
      </>
    ),
    4: (
      <>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M8 6V4h8v2" />
        <path d="M3 11h18" />
        <path d="M10 11v2h4v-2" />
      </>
    ),
    5: (
      <>
        <path d="M5 17 12 3l7 14-7-3-7 3Z" />
        <path d="M12 3v11" />
        <path d="M5 21h14" />
      </>
    ),
  }[floor as 1 | 2 | 3 | 4 | 5];

  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths}
    </svg>
  );
}