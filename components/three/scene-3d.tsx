"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { CashewFallback } from "@/components/three/cashew-fallback";
import { use3DMode } from "@/components/three/use-3d-mode";
import { cn } from "@/lib/utils";

// The heavy bundle (three.js + react-three-fiber + drei) is a separate chunk,
// requested only when a capable device mounts a scene - never on the server, never for fallback users.
const SCENES = {
  hero: dynamic(() => import("@/components/three/hero-scene"), { ssr: false }),
};

class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("3D scene failed, using the static illustration", error);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function whenIdle(cb: () => void): () => void {
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(cb, { timeout: 1500 });
    return () => cancelIdleCallback(id);
  }
  const id = window.setTimeout(cb, 400);
  return () => window.clearTimeout(id);
}

/**
 * Decorative 3D scene with a graceful static fallback.
 * Always renders the SVG illustration first (no layout shift, instant paint) and cross-fades to
 * WebGL once the scene is ready. Rendering pauses when off-screen or the tab is hidden.
 */
export function Scene3D({ variant, className, hint }: { variant: keyof typeof SCENES; className?: string; hint?: string }) {
  const mode = use3DMode();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Wait until the browser is idle so the page's main content paints first.
  useEffect(() => {
    if (mode !== "3d") return;
    return whenIdle(() => setArmed(true));
  }, [mode]);

  // Pause rendering when scrolled out of view or when the tab is in the background.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    const onVis = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const Scene = SCENES[variant];
  const show3D = mode === "3d" && armed && !failed;

  return (
    <div ref={wrapRef} className={cn("relative", className)} aria-hidden="true" data-3d={show3D && ready ? "on" : mode}>
      <CashewFallback
        variant={variant}
        className={cn("absolute inset-0 transition-opacity duration-700", show3D && ready ? "opacity-0" : "opacity-100")}
      />
      {show3D && (
        <SceneBoundary onError={() => setFailed(true)}>
          <Scene active={inView && tabVisible} onReady={() => setReady(true)} onFail={() => setFailed(true)} />
        </SceneBoundary>
      )}
      {hint && show3D && ready && (
        <p className="pointer-events-none absolute inset-x-0 top-0 text-center text-xs text-brown/70">{hint}</p>
      )}
    </div>
  );
}
