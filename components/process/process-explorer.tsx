"use client";

import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { VideoPlayer } from "@/components/process/video-player";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProcessData } from "@/services/manufacturing";

export function ProcessExplorer({ data }: { data: ProcessData }) {
  const { stages, mainVideo } = data;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [index, setIndex] = useState(0);
  const stage = stages[index];

  if (!stage) {
    return <p className="rounded-card bg-white p-8 text-brown shadow-soft">The process steps will appear here once they have been added.</p>;
  }

  const stageMedia = stage.media.find((m) => m.kind === "IMAGE" || m.kind === "VIDEO");
  const canSeek = !!mainVideo && stage.startSecond !== null;

  function playFromHere() {
    const v = videoRef.current;
    if (!v || stage.startSecond === null) return;
    v.currentTime = stage.startSecond;
    void v.play().catch(() => {});
    v.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="space-y-8">
      {/* ───────── Authenticity notices ───────── */}
      {stages.some((s) => s.isDemo) && (
        <p role="note" className="rounded-card bg-gold/20 p-4 text-sm text-chocolate">
          <strong>Illustrative content:</strong> these step descriptions are general information about how cashews are processed
          (demo text). They are not a record of our own facility.
        </p>
      )}

      {/* ───────── Video ───────── */}
      {mainVideo ? (
        <div>
          <VideoPlayer
            src={mainVideo.url}
            poster={mainVideo.posterUrl}
            captionsUrl={mainVideo.captionsUrl}
            title={mainVideo.caption ?? "Cashew processing video"}
            videoRef={videoRef}
          />
          {mainVideo.isIllustrative && (
            <p className="mt-2 text-xs text-brown">Illustrative footage – it does not show our own facility.</p>
          )}
          {mainVideo.caption && <p className="mt-1 text-sm text-brown">{mainVideo.caption}</p>}
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-card bg-chocolate/90 p-6 text-center text-cream">
          <div>
            <Play size={36} aria-hidden className="mx-auto text-gold" />
            <p className="mt-3 font-serif text-xl">Process video coming soon</p>
            <p className="mt-1 text-sm text-cream/70">In the meantime, explore each stage below.</p>
          </div>
        </div>
      )}

      {/* ───────── Timeline ───────── */}
      <nav aria-label="Processing stages">
        <ol className="flex snap-x gap-2 overflow-x-auto pb-3">
          {stages.map((s, i) => (
            <li key={s.id} className="snap-start">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-current={i === index ? "step" : undefined}
                className={cn(
                  "flex w-36 flex-col rounded-lg border px-3 py-2 text-left transition-colors",
                  i === index ? "border-forest bg-forest text-cream" : "border-cashew bg-white text-chocolate hover:border-forest",
                )}
              >
                <span className={cn("font-serif text-lg", i === index ? "text-gold" : "text-gold")}>{String(s.step).padStart(2, "0")}</span>
                <span className="text-xs leading-snug">{s.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {/* ───────── Stage detail ───────── */}
      <article aria-live="polite" className="grid gap-6 rounded-card bg-white p-6 shadow-soft md:grid-cols-[1fr_18rem]">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Step {stage.step} of {stages.length}</p>
          <h2 className="mt-1 font-serif text-3xl text-forest">{stage.title}</h2>
          <p className="mt-3 text-brown">{stage.summary}</p>
          <h3 className="mt-5 font-serif text-lg text-chocolate">Why it matters for quality</h3>
          <p className="mt-1 text-brown">{stage.qualityNote}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            {canSeek && (
              <Button type="button" size="sm" onClick={playFromHere}>
                <Play size={14} aria-hidden /> Watch this stage
              </Button>
            )}
            <Button type="button" size="sm" variant="outline" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
              <ChevronLeft size={14} aria-hidden /> Previous
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={index === stages.length - 1} onClick={() => setIndex((i) => i + 1)}>
              Next <ChevronRight size={14} aria-hidden />
            </Button>
          </div>
        </div>

        <figure className="self-start">
          {stageMedia?.kind === "IMAGE" ? (
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-cashew/40">
              <Image src={stageMedia.url} alt={stageMedia.caption ?? stage.title} fill sizes="288px" className="object-cover" unoptimized />
            </div>
          ) : stageMedia?.kind === "VIDEO" ? (
            <video src={stageMedia.url} poster={stageMedia.posterUrl ?? undefined} controls playsInline preload="none" aria-label={stage.title} className="aspect-[4/3] w-full rounded-lg bg-chocolate object-cover" />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-cashew/40 text-sm text-brown/70">Image coming soon</div>
          )}
          {stageMedia?.isIllustrative && <figcaption className="mt-1 text-xs text-brown">Illustrative image</figcaption>}
          {stageMedia?.caption && <figcaption className="mt-1 text-xs text-brown">{stageMedia.caption}</figcaption>}
        </figure>
      </article>
    </div>
  );
}
