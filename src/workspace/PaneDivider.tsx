import { useRef } from "react";
export function PaneDivider({
  label,
  value,
  onChange,
  min,
  max,
  reverse = false,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  reverse?: boolean;
}) {
  const drag = useRef<{ x: number; value: number } | null>(null);
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div
      className="pane-divider"
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, value };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (drag.current)
          onChange(
            clamp(
              drag.current.value +
                (e.clientX - drag.current.x) * (reverse ? -1 : 1),
            ),
          );
      }}
      onPointerUp={(e) => {
        drag.current = null;
        e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          onChange(
            clamp(
              value + (e.key === "ArrowLeft" ? -24 : 24) * (reverse ? -1 : 1),
            ),
          );
        }
        if (e.key === "Home") onChange(min);
        if (e.key === "End") onChange(max);
      }}
    />
  );
}
