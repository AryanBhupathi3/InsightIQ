import type { ReactNode } from "react";

const ICONS: Record<number, ReactNode> = {
  1: (
    <>
      <rect x="3" y="4" width="8" height="8" rx="1.5" />
      <rect x="13" y="4" width="8" height="8" rx="1.5" />
      <rect x="3" y="14" width="8" height="6" rx="1.5" />
      <rect x="13" y="14" width="8" height="6" rx="1.5" />
    </>
  ),
  2: (
    <>
      <path d="M3 17 L9 10 L14 13 L18 6" />
      <path d="M18 6 L21.5 3.5" strokeDasharray="3 3" />
      <path d="M17 4 L22 5 L21 10" strokeDasharray="3 3" opacity={0.5} />
    </>
  ),
  3: (
    <>
      <circle cx="4" cy="5" r="1.8" />
      <circle cx="4" cy="12" r="1.8" />
      <circle cx="4" cy="19" r="1.8" />
      <circle cx="19" cy="12" r="2.4" fill="currentColor" />
      <path d="M6 5 L17 11 M6 12 L17 12 M6 19 L17 13" />
    </>
  ),
  4: (
    <>
      <path d="M4 20 L4 14 L10 8 L14 12 L20 4" />
      <path d="M20 4 L14.5 4 M20 4 L20 9.5" />
    </>
  ),
};

export default function StepIcon({ step, className = "w-[26px] h-[26px]" }: { step: 1 | 2 | 3 | 4; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={step === 4 ? 1.8 : 1.6}
      strokeLinecap="round"
      strokeLinejoin={step === 1 || step === 4 ? "round" : undefined}
      className={className}
      aria-hidden="true"
    >
      {ICONS[step]}
    </svg>
  );
}
