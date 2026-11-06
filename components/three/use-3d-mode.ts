"use client";

import { useSyncExternalStore } from "react";
import { decide3D } from "@/lib/three/capability";

type Mode = "pending" | "3d" | "fallback";

let webglCache: boolean | undefined;
function hasWebGL(): boolean {
  if (webglCache === undefined) {
    try {
      const c = document.createElement("canvas");
      webglCache = !!(c.getContext("webgl2") ?? c.getContext("webgl"));
    } catch {
      webglCache = false;
    }
  }
  return webglCache;
}

type NavigatorExtras = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
};

function snapshot(): Mode {
  const nav = navigator as NavigatorExtras;
  const d = decide3D({
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    saveData: !!nav.connection?.saveData,
    effectiveType: nav.connection?.effectiveType,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: nav.deviceMemory,
    webgl: hasWebGL(),
    forced: new URLSearchParams(window.location.search).get("3d") === "on",
  });
  return d.use3D ? "3d" : "fallback";
}

function subscribe(onChange: () => void) {
  // The reduced-motion preference can change while the page is open.
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * "pending" on the server and during hydration (so the markup matches), then "3d" or "fallback".
 * useSyncExternalStore keeps this hydration-safe without setting state inside an effect.
 */
export function use3DMode(): Mode {
  return useSyncExternalStore(subscribe, snapshot, () => "pending" as const);
}
