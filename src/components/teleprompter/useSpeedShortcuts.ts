import { useEffect } from "react";

export const SPEED_MIN = 10;
export const SPEED_MAX = 200;
export const SPEED_STEP = 5;

export function clampSpeed(value: number) {
  return Math.min(SPEED_MAX, Math.max(SPEED_MIN, value));
}

/**
 * Arrow keys adjust the teleprompter speed while recording (desktop).
 * Mobile browsers never expose the physical volume keys to web pages,
 * so on phones the on-screen +/- buttons cover the same need.
 */
export function useSpeedShortcuts(
  active: boolean,
  onAdjust: (delta: number) => void,
) {
  useEffect(() => {
    if (!active) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }

      event.preventDefault();
      onAdjust(event.key === "ArrowRight" ? SPEED_STEP : -SPEED_STEP);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, onAdjust]);
}
