"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { addStageImageAction, removeMainVideoAction, removeStageMediaAction, saveStageAction, setMainVideoAction } from "@/app/actions/admin/media";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Uploader } from "@/components/admin/uploader";
import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import type { FormState } from "@/lib/validators/auth";
import type { ProcessData, ProcessStage } from "@/services/manufacturing";

const initial: FormState = { ok: false };
const area = "w-full rounded-lg border border-cashew bg-white px-3 py-2.5 text-sm text-chocolate";

export function MainVideoEditor({ current }: { current: ProcessData["mainVideo"] }) {
  const [state, action, pending] = useActionState(setMainVideoAction, initial);
  const [removeState, removeAction, removing] = useActionState(removeMainVideoAction, initial);
  const [video, setVideo] = useState("");
  const [poster, setPoster] = useState("");
  const [captions, setCaptions] = useState("");

  return (
    <section className="space-y-5 rounded-card bg-white p-6 shadow-soft" aria-labelledby="video-h">
      <h2 id="video-h" className="font-serif text-xl text-forest">Main process video</h2>

      {current ? (
        <div className="rounded-lg bg-cashew/40 p-4 text-sm text-chocolate">
          <p><strong>A video is live on the process page.</strong></p>
          <p className="mt-1 text-xs text-brown">
            {current.isIllustrative ? "Marked as illustrative footage." : "Marked as your own footage."} {current.captionsUrl ? "Captions: yes." : "Captions: none."} {current.posterUrl ? "Poster: yes." : "Poster: none."}
          </p>
          <form action={removeAction} className="mt-3">
            <FormMessage ok={removeState.ok} message={removeState.message} />
            <ConfirmButton confirmLabel="Yes, remove the video" disabled={removing}>Remove video…</ConfirmButton>
          </form>
        </div>
      ) : (
        <p className="rounded-lg bg-cashew/40 p-4 text-sm text-brown">No video yet - the process page shows &quot;Process video coming soon&quot;.</p>
      )}

      <form action={action} className="space-y-5" noValidate>
        <h3 className="font-serif text-lg text-chocolate">{current ? "Replace the video" : "Add a video"}</h3>
        <input type="hidden" name="videoPath" value={video} />
        <input type="hidden" name="posterPath" value={poster} />
        <input type="hidden" name="captionsPath" value={captions} />
        <FormMessage ok={state.ok} message={state.message} />

        <div className="grid gap-5 md:grid-cols-3">
          <Uploader kind="process-video" label="1. Video file" buttonLabel={video ? "Replace file…" : "Choose video…"} onUploaded={async (p) => { setVideo(p); return null; }} />
          <Uploader kind="process-poster" label="2. Poster image (optional)" buttonLabel={poster ? "Replace image…" : "Choose image…"} onUploaded={async (p) => { setPoster(p); return null; }} />
          <Uploader kind="captions" label="3. Captions (optional)" buttonLabel={captions ? "Replace file…" : "Choose .vtt…"} onUploaded={async (p) => { setCaptions(p); return null; }} />
        </div>

        <Field label="Caption shown under the video (optional)" name="caption" maxLength={200} />
        <label className="flex items-start gap-2 text-sm text-chocolate">
          <input type="checkbox" name="isIllustrative" defaultChecked className="mt-1" />
          <span>This is stock / illustrative footage, <strong>not</strong> filmed at our own facility. <span className="text-brown">(Untick only for your own footage - visitors are told which it is.)</span></span>
        </label>
        <p className="text-xs text-brown">Files upload first; the video only goes live when you press the button below.</p>
        <Button type="submit" disabled={pending || !video}>{pending ? "Saving…" : "Publish video"}</Button>
      </form>
    </section>
  );
}

function StageCard({ stage }: { stage: ProcessStage }) {
  const [saveState, save, saving] = useActionState(saveStageAction, initial);
  const [removeState, remove, removing] = useActionState(removeStageMediaAction, initial);
  const [caption, setCaption] = useState("");
  const [illustrative, setIllustrative] = useState(true);
  const [imgMsg, setImgMsg] = useState<string | null>(null);
  const e = saveState.errors ?? {};
  const image = stage.media.find((m) => m.kind === "IMAGE");

  return (
    <details className="rounded-card bg-white shadow-soft">
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4">
        <span className="font-serif text-lg text-chocolate"><span className="mr-2 text-gold">{String(stage.step).padStart(2, "0")}</span>{stage.title}</span>
        <span className="flex gap-2">
          {stage.isDemo && <span className="rounded-full bg-gold/40 px-2 py-0.5 text-xs text-chocolate">Placeholder text</span>}
          {image && <span className="rounded-full bg-forest/10 px-2 py-0.5 text-xs text-forest">Has image</span>}
        </span>
      </summary>
      <div className="space-y-6 border-t border-cashew p-5">
        <form action={save} className="space-y-3" noValidate>
          <input type="hidden" name="id" value={stage.id} />
          <FormMessage ok={saveState.ok} message={saveState.message} />
          {/* unique id per stage keeps labels working; name matches what the server action reads */}
          <Field label="Title" id={`title-${stage.id}`} name="title" defaultValue={stage.title} error={e.title} />
          <StageFields stage={stage} errors={e} pending={saving} />
        </form>

        <div>
          <h3 className="font-serif text-lg text-chocolate">Image</h3>
          {image ? (
            <form action={remove} className="mt-2 flex flex-wrap items-start gap-4">
              <input type="hidden" name="mediaId" value={image.id} />
              <div className="relative h-24 w-32 overflow-hidden rounded-lg bg-cashew/40"><Image src={image.url} alt={image.caption ?? stage.title} fill sizes="128px" className="object-cover" unoptimized /></div>
              <div className="text-xs text-brown">{image.isIllustrative ? "Illustrative image" : "Our own image"}{image.caption ? ` · ${image.caption}` : ""}</div>
              <ConfirmButton confirmLabel="Remove?" variant="ghost" disabled={removing}>Remove image</ConfirmButton>
              <FormMessage ok={removeState.ok} message={removeState.ok ? undefined : removeState.message} />
            </form>
          ) : (
            <p className="mt-1 text-sm text-brown">No image yet.</p>
          )}
          <div className="mt-3 space-y-3 rounded-lg border border-cashew p-4">
            <p className="text-sm text-chocolate">{image ? "Replace the image" : "Add an image"}</p>
            <div>
              <label htmlFor={`cap-${stage.id}`} className="mb-1 block text-xs text-brown">Caption (optional)</label>
              <input id={`cap-${stage.id}`} value={caption} onChange={(ev) => setCaption(ev.target.value)} maxLength={200} className={area} />
            </div>
            <label className="flex items-center gap-2 text-sm text-chocolate"><input type="checkbox" checked={illustrative} onChange={(ev) => setIllustrative(ev.target.checked)} /> Stock / illustrative (not from our facility)</label>
            <Uploader
              kind="stage-image"
              label="Photo"
              buttonLabel="Choose photo…"
              onUploaded={async (path) => {
                const r = await addStageImageAction(stage.id, path, caption, illustrative);
                setImgMsg(r.ok ? "Image saved." : null);
                return r.ok ? null : (r.message ?? "Could not save the image.");
              }}
            />
            {imgMsg && <p role="status" className="text-xs text-forest">{imgMsg} Reload to see it here.</p>}
          </div>
        </div>
      </div>
    </details>
  );
}

/** Summary / quality note / start time, using the exact field names the server action expects. */
function StageFields({ stage, errors, pending }: { stage: ProcessStage; errors: Record<string, string>; pending: boolean }) {
  return (
    <>
      <div>
        <label htmlFor={`sum-${stage.id}`} className="mb-1 block text-sm text-brown">What happens in this step</label>
        <textarea id={`sum-${stage.id}`} name="summary" rows={2} maxLength={400} defaultValue={stage.summary} className={area} />
        {errors.summary && <p className="mt-1 text-xs text-red-700">{errors.summary}</p>}
      </div>
      <div>
        <label htmlFor={`qn-${stage.id}`} className="mb-1 block text-sm text-brown">Why it matters for quality</label>
        <textarea id={`qn-${stage.id}`} name="qualityNote" rows={2} maxLength={400} defaultValue={stage.qualityNote} className={area} />
        {errors.qualityNote && <p className="mt-1 text-xs text-red-700">{errors.qualityNote}</p>}
      </div>
      <div className="max-w-xs">
        <Field label="Starts at (seconds into the main video)" name="startSecond" inputMode="numeric" defaultValue={stage.startSecond === null ? "" : String(stage.startSecond)} error={errors.startSecond} hint="Optional. Adds a 'Watch this stage' button." />
      </div>
      <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Save step"}</Button>
    </>
  );
}

export function StageEditors({ stages }: { stages: ProcessStage[] }) {
  return (
    <section aria-labelledby="stages-h" className="space-y-3">
      <h2 id="stages-h" className="font-serif text-xl text-forest">The 13 steps</h2>
      <p className="text-xs text-brown">Steps marked &quot;Placeholder text&quot; still contain general demo wording. Once you save a step it counts as your own text.</p>
      {stages.map((s) => <StageCard key={s.id} stage={s} />)}
    </section>
  );
}
