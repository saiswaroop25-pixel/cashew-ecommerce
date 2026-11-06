import type { Metadata } from "next";
import { Suspense } from "react";
import { ProcessExplorer } from "@/components/process/process-explorer";
import { Scene3D } from "@/components/three/scene-3d";
import { getProcessData } from "@/services/manufacturing";

export const metadata: Metadata = {
  title: "From cashew fruit to finished pack",
  description: "Follow the journey of cashews step by step, from the tree to the packed product, and why each stage matters for quality.",
  alternates: { canonical: "/process" },
};

export default function ProcessPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <div className="grid items-center gap-8 md:grid-cols-[1fr_16rem]">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Our process</p>
          <h1 className="mt-2 font-serif text-4xl text-forest md:text-5xl">From fruit to finished pack</h1>
          <p className="mt-4 max-w-2xl text-lg text-brown">
            Follow the journey in thirteen steps and see why each one matters for quality.
          </p>
        </div>
        <figure>
          <Scene3D variant="fruit" hint="Drag to rotate" className="mx-auto aspect-square w-56 md:w-full" />
          <figcaption className="mt-1 text-center text-xs text-brown">
            Illustration: the cashew nut grows outside the fruit, hanging from the bottom of the cashew apple.
          </figcaption>
        </figure>
      </div>
      <div className="mt-10">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-cashew/40" aria-hidden />}>
          <Body />
        </Suspense>
      </div>
    </main>
  );
}

async function Body() {
  return <ProcessExplorer data={await getProcessData()} />;
}
