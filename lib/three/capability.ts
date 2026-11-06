/**
 * Decides whether the page should load the 3D scene at all. Pure so it can be unit tested;
 * the browser-facing probing lives in components/three/use-3d-mode.ts.
 *
 * 3D is skipped (static illustration shown instead) when:
 *  - the visitor prefers reduced motion,
 *  - they asked to save data (Save-Data / slow connection),
 *  - the device looks weak (<= 2 CPU cores or <= 2 GB memory),
 *  - WebGL is not available.
 */
export type CapabilitySignals = {
  reducedMotion: boolean;
  saveData: boolean;
  /** navigator.connection.effectiveType, e.g. "4g" | "3g" | "2g" | "slow-2g" */
  effectiveType?: string;
  hardwareConcurrency?: number;
  /** navigator.deviceMemory in GB (Chromium only) */
  deviceMemory?: number;
  webgl: boolean;
  /**
   * QA override (?3d=on). Skips only the device-power and network *heuristics*, which can misjudge.
   * Never overrides reduced motion, data-saver or missing WebGL.
   */
  forced?: boolean;
};

export type Decision = { use3D: true } | { use3D: false; reason: "reduced-motion" | "save-data" | "slow-network" | "weak-device" | "no-webgl" };

export function decide3D(s: CapabilitySignals): Decision {
  if (s.reducedMotion) return { use3D: false, reason: "reduced-motion" };
  if (s.saveData) return { use3D: false, reason: "save-data" };
  if (!s.forced) {
    if (s.effectiveType && ["slow-2g", "2g", "3g"].includes(s.effectiveType)) return { use3D: false, reason: "slow-network" };
    if ((s.hardwareConcurrency !== undefined && s.hardwareConcurrency <= 2) || (s.deviceMemory !== undefined && s.deviceMemory <= 2)) {
      return { use3D: false, reason: "weak-device" };
    }
  }
  if (!s.webgl) return { use3D: false, reason: "no-webgl" };
  return { use3D: true };
}

/** Small deterministic PRNG so scene layouts are identical on every render (pure, no Math.random). */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
