"use client";

import { Captions, Maximize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";

function fmt(s: number) {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/**
 * Accessible custom video player.
 *  - `preload="none"` + poster: nothing is downloaded until the visitor presses play (lazy loading, light on mobile data)
 *  - `playsInline`: plays inside the page on phones instead of forcing fullscreen
 *  - every control is a real button / range input with a label, so it works with keyboard and screen readers
 *  - captions use a standard <track> (WebVTT) and can be toggled
 */
export function VideoPlayer({
  src,
  poster,
  captionsUrl,
  title,
  videoRef,
}: {
  src: string;
  poster?: string | null;
  captionsUrl?: string | null;
  title: string;
  videoRef: RefObject<HTMLVideoElement | null>;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState(false);

  // Keep React state in sync with the real <video> element and the fullscreen API.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const sync = () => {
      setPlaying(!v.paused && !v.ended);
      setTime(v.currentTime);
      setDuration(Number.isFinite(v.duration) ? v.duration : 0);
      setVolume(v.volume);
      setMuted(v.muted);
    };
    const events = ["play", "pause", "ended", "timeupdate", "loadedmetadata", "durationchange", "volumechange", "seeked"] as const;
    events.forEach((e) => v.addEventListener(e, sync));
    const onFs = () => setFullscreen(document.fullscreenElement === wrapRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      events.forEach((e) => v.removeEventListener(e, sync));
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [videoRef, src]);

  // Captions track mode follows the toggle.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    for (const t of Array.from(v.textTracks)) t.mode = captionsOn ? "showing" : "hidden";
  }, [captionsOn, videoRef, captionsUrl]);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => setError(true));
    else v.pause();
  };

  const toggleFullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };

  return (
    <div ref={wrapRef} className={cn("group relative overflow-hidden rounded-card bg-chocolate", fullscreen && "rounded-none")}>
      <video
        ref={videoRef}
        src={src}
        poster={poster ?? undefined}
        preload="none"
        playsInline
        aria-label={title}
        onClick={toggle}
        onError={() => setError(true)}
        onLoadedData={() => setError(false)}
        className="aspect-video w-full cursor-pointer bg-chocolate object-contain"
        crossOrigin={captionsUrl ? "anonymous" : undefined}
      >
        {captionsUrl && <track kind="captions" src={captionsUrl} srcLang="en" label="English" />}
        Your browser does not support embedded video.
      </video>

      {error && (
        <p role="alert" className="absolute inset-x-0 top-0 bg-red-900/90 p-3 text-center text-sm text-white">
          This video could not be played. Please try again later.
        </p>
      )}

      {!playing && !error && time === 0 && (
        <button
          type="button"
          onClick={toggle}
          aria-label={`Play video: ${title}`}
          className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-cream/90 text-forest shadow-soft transition-transform hover:scale-105"
        >
          <Play size={28} aria-hidden className="ml-1" />
        </button>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-chocolate px-3 py-2 text-cream">
        <button type="button" onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="rounded-full p-1.5 hover:bg-cream/15">
          {playing ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}
        </button>

        <span className="text-xs tabular-nums" aria-hidden>{fmt(time)} / {fmt(duration)}</span>

        <input
          type="range"
          aria-label="Video progress"
          aria-valuetext={`${fmt(time)} of ${fmt(duration)}`}
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(time, duration || 0)}
          disabled={!duration}
          onChange={(e) => {
            const v = videoRef.current;
            if (v) v.currentTime = Number(e.target.value);
          }}
          className="h-1 min-w-24 flex-1 accent-gold"
        />

        <button
          type="button"
          onClick={() => {
            const v = videoRef.current;
            if (v) v.muted = !v.muted;
          }}
          aria-label={muted || volume === 0 ? "Unmute" : "Mute"}
          className="rounded-full p-1.5 hover:bg-cream/15"
        >
          {muted || volume === 0 ? <VolumeX size={18} aria-hidden /> : <Volume2 size={18} aria-hidden />}
        </button>
        <input
          type="range"
          aria-label="Volume"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          onChange={(e) => {
            const v = videoRef.current;
            if (!v) return;
            v.volume = Number(e.target.value);
            v.muted = Number(e.target.value) === 0;
          }}
          className="h-1 w-20 accent-gold"
        />

        {captionsUrl && (
          <button
            type="button"
            onClick={() => setCaptionsOn((c) => !c)}
            aria-pressed={captionsOn}
            aria-label="Captions"
            className={cn("rounded-full p-1.5 hover:bg-cream/15", captionsOn && "bg-cream/25")}
          >
            <Captions size={18} aria-hidden />
          </button>
        )}

        <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? "Exit full screen" : "Full screen"} className="rounded-full p-1.5 hover:bg-cream/15">
          <Maximize size={18} aria-hidden />
        </button>
      </div>
    </div>
  );
}
