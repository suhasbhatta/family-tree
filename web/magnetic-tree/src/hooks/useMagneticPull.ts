import { useRef } from 'react';
import { useMotionValue, useSpring } from 'framer-motion';

const PULL_RADIUS = 90;
const PULL_STRENGTH = 0.35;

/** Attracts an element toward the cursor when it comes within PULL_RADIUS. */
export function useMagneticPull() {
  const ref = useRef<HTMLElement | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });

  const onMouseMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist < PULL_RADIUS) {
      const pull = (1 - dist / PULL_RADIUS) * PULL_STRENGTH;
      x.set(dx * pull);
      y.set(dy * pull);
    } else {
      x.set(0);
      y.set(0);
    }
  };

  const onMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return { ref, x: springX, y: springY, onMouseMove, onMouseLeave };
}
