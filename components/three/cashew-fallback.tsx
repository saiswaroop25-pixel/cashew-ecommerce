import { cn } from "@/lib/utils";

/**
 * Static illustration used (a) instantly while the 3D scene loads, (b) when 3D is skipped
 * (reduced motion, weak device, data saver, no WebGL) or fails. Pure SVG: zero JavaScript weight.
 * The gentle float animation is removed automatically for reduced-motion visitors (see globals.css).
 */
const KERNEL =
  "M14 44 C10 22 34 6 62 8 C92 10 112 28 108 52 C106 66 90 72 80 62 C72 54 62 50 50 52 C38 54 36 72 24 70 C16 68 15 54 14 44 Z";

const HERO_NUTS = [
  { x: 4, y: 12, s: 1.0, r: -18, d: 0 },
  { x: 52, y: 4, s: 0.7, r: 24, d: 1.2 },
  { x: 66, y: 38, s: 1.15, r: -8, d: 0.6 },
  { x: 12, y: 58, s: 0.8, r: 32, d: 1.8 },
  { x: 40, y: 68, s: 1.05, r: -28, d: 0.3 },
  { x: 74, y: 76, s: 0.6, r: 14, d: 2.1 },
];

export function CashewFallback({ className }: { variant?: "hero"; className?: string }) {
  return (
    <svg viewBox="0 0 120 100" className={cn("h-full w-full", className)} role="presentation">
      <defs>
        <linearGradient id="kernel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F4E7CF" />
          <stop offset="1" stopColor="#D9BE95" />
        </linearGradient>
      </defs>
      {HERO_NUTS.map((n, i) => (
        <g key={i} transform={`translate(${n.x} ${n.y}) rotate(${n.r} 60 45) scale(${n.s * 0.42})`}>
          <g className="motion-safe:animate-[float_6s_ease-in-out_infinite]" style={{ animationDelay: `${n.d}s` }}>
            <path d={KERNEL} fill="url(#kernel)" stroke="#C5A46D" strokeWidth="1.2" strokeOpacity="0.6" />
          </g>
        </g>
      ))}
    </svg>
  );
}
