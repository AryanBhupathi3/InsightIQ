import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

function ChevronIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" aria-hidden="true">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Progressive-disclosure section: a plain-language question as the
 *  trigger, collapsed by default, so the deeper explanation (formulas,
 *  proofs, ...) is a click away rather than the first thing on screen. */
export default function Disclosure({
  label,
  defaultOpen = false,
  nested = false,
  children,
}: {
  label: ReactNode;
  defaultOpen?: boolean;
  /** Slightly quieter styling for a disclosure nested inside another. */
  nested?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={nested ? "border-t border-border" : "glass rounded-2xl px-5"}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`pressable w-full flex items-center justify-between gap-3 text-left cursor-pointer ${nested ? "py-3" : "py-4"}`}
      >
        <span className={nested ? "text-[0.82rem] font-medium text-ink-soft" : "text-[0.95rem] font-semibold text-ink"}>
          {label}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: "spring", bounce: 0, duration: 0.3 }}
          className="text-ink-muted flex-shrink-0"
        >
          <ChevronIcon />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.35 }}
            className="overflow-hidden"
          >
            <div className={nested ? "pb-4" : "pb-5"}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
