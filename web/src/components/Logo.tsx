export default function Logo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.5 18 C 7 18, 8 6, 12.5 6 S 18 12, 21.5 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="12.5" cy="6" r="2.1" fill="currentColor" />
    </svg>
  );
}
