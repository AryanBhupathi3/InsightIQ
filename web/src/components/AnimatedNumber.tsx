import { useEffect, useState } from "react";
import { useMotionValue, useSpring } from "framer-motion";

/** Tweens a number to its new value instead of snapping — the same
 *  "state change should never teleport" idea behind the rest of the
 *  motion work. Critically damped so it settles instead of overshooting
 *  a number that should read as exact, not playful. */
export default function AnimatedNumber({
  value,
  format = (v: number) => v.toFixed(0),
}: {
  value: number;
  format?: (v: number) => string;
}) {
  const motionValue = useMotionValue(value);
  const spring = useSpring(motionValue, { damping: 26, stiffness: 170, mass: 0.6 });
  const [display, setDisplay] = useState(() => format(value));

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  useEffect(() => {
    setDisplay(format(spring.get()));
    return spring.on("change", (v) => setDisplay(format(v)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spring]);

  return <span className="tabular">{display}</span>;
}
