"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { addStageImageAction, removeStageMediaAction, saveStageAction } from "@/app/actions/admin/media";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Uploader } from "@/components/admin/uploader";
import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import type { FormState } from "@/lib/validators/auth";
import type { FlowStep } from "@/services/manufacturing";

const initial: FormState = { ok: false };
const area = "w-full rounded-lg border border-cashew bg-white px-3 py-2.5 text-sm text-chocolate";

function StepCard({ step }: { step: FlowStep }) {
  const [saveState, save, saving] = useActionState(saveStageAction, initial);
  const [removeState, remove, removing] = useActionState(removeStageMediaAction, initial);
  const [caption, setCaption] = useState("");
  const [illustrative, setIllustrative] = useState(true);
  const [imageSaved, setImageSaved] = useState(false);
  const e = saveState.errors ?? {};

  return (
    <details className="rounded-card bg-white shadow-soft">
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4">
        <span className="font-serif text-lg text-chocolate"><span className="mr-2 text-gold-text">{String(step.step).padStart(2, "0")}</span>{step.title}</span>
        <span className="flex gap-2">
          {step.isDemo && <span className="rounded-full bg-gold/40 px-2 py-0.5 text-xs text-chocolate">Placeholder text</span>}
          <span className={step.imageUrl ? "rounded-full bg-forest/10 px-2 py-0.5 text-xs text-forest" : "rounded-full bg-cashew px-2 py-0.5 text-xs text-brown"}>{step.imageUrl ? "Has picture" : "No picture"}</span>
        </span>
      </summary>

      <div className="space-y-6 border-t border-cashew p-5">
        <form action={save} className="space-y-3" noValidate>
          <input type="hidden" name="id" value={step.id} />
          <FormMessage ok={saveState.ok} message={saveState.message} />
          <Field label="Step title" id={`title-${step.id}`} name="title" defaultValue={step.title} error={e.title} maxLength={80} />
          <div>
            <label htmlFor={`sum-${step.id}`} className="mb-1 block text-sm text-brown">What happens in this step</label>
            <textarea id={`sum-${step.id}`} name="summary" rows={3} maxLength={300} defaultValue={step.summary} className={area} />
            {e.summary && <p className="mt-1 text-xs text-red-700">{e.summary}</p>}
          </div>
          <Button type="submit" size="sm" disabled={saving}>{saving ? "Saving…" : "Save step"}</Button>
        </form>

        <div>
          <h3 className="font-serif text-lg text-chocolate">Picture</h3>
          {step.imageUrl ? (
            <form action={remove} className="mt-2 flex flex-wrap items-start gap-4">
              <input type="hidden" name="mediaId" value={step.mediaId ?? ""} />
              <div className="relative h-24 w-32 overflow-hidden rounded-lg bg-cashew/40"><Image src={step.imageUrl} alt={step.imageAlt} fill sizes="128px" className="object-cover" unoptimized /></div>
              <p className="text-xs text-brown">{step.imageIsIllustrative ? "Marked as illustrative" : "Marked as our own picture"}</p>
              <ConfirmButton confirmLabel="Remove?" variant="ghost" disabled={removing}>Remove picture</ConfirmButton>
              <FormMessage ok={removeState.ok} message={removeState.message} />
            </form>
          ) : (
            <p className="mt-1 text-sm text-brown">No picture yet - this step shows a plain numbered tile.</p>
          )}

          <div className="mt-3 space-y-3 rounded-lg border border-cashew p-4">
            <p className="text-sm text-chocolate">{step.imageUrl ? "Replace the picture" : "Add a picture"}</p>
            <div>
              <label htmlFor={`cap-${step.id}`} className="mb-1 block text-xs text-brown">Short description of the picture (for screen readers, optional)</label>
              <input id={`cap-${step.id}`} value={caption} onChange={(ev) => setCaption(ev.target.value)} maxLength={200} className={area} />
            </div>
            <label className="flex items-start gap-2 text-sm text-chocolate">
              <input type="checkbox" checked={illustrative} onChange={(ev) => setIllustrative(ev.target.checked)} className="mt-1" />
              <span>Stock / illustrative picture, <strong>not</strong> taken at our own facility <span className="text-brown">(visitors see an &quot;Illustrative&quot; label. Untick for your own photos.)</span></span>
            </label>
            <Uploader
              kind="stage-image"
              label="Photo"
              buttonLabel="Choose photo…"
              onUploaded={async (path) => {
                const r = await addStageImageAction(step.id, path, caption, illustrative);
                setImageSaved(r.ok);
                return r.ok ? null : (r.message ?? "Could not save the picture.");
              }}
            />
            {imageSaved && <p role="status" className="text-xs text-forest">Picture saved and live on the home page. Reload this page to see it here.</p>}
          </div>
        </div>
      </div>
    </details>
  );
}

export function ProcessFlowEditor({ steps }: { steps: FlowStep[] }) {
  return (
    <section aria-labelledby="steps-h" className="space-y-3">
      <h2 id="steps-h" className="font-serif text-xl text-forest">The steps</h2>
      <p className="text-xs text-brown">
        Steps marked &quot;Placeholder text&quot; still contain general wording. Once you save a step it counts as your own text.
        Landscape photos (4:3) look best.
      </p>
      {steps.map((s) => <StepCard key={s.id} step={s} />)}
    </section>
  );
}
