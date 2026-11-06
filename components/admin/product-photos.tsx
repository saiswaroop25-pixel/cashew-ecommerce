"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import Image from "next/image";
import { useActionState } from "react";
import { addProductImageAction, moveProductImageAction, removeProductImageAction, updateProductImageAltAction } from "@/app/actions/admin/media";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Uploader } from "@/components/admin/uploader";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import type { FormState } from "@/lib/validators/auth";

const initial: FormState = { ok: false };

type Photo = { id: string; url: string; alt: string };

function PhotoRow({ productId, photo, index, count }: { productId: string; photo: Photo; index: number; count: number }) {
  const [moveState, move, moving] = useActionState(moveProductImageAction, initial);
  const [removeState, remove, removing] = useActionState(removeProductImageAction, initial);
  const [altState, saveAlt, savingAlt] = useActionState(updateProductImageAltAction, initial);
  return (
    <li className="flex flex-wrap items-start gap-4 rounded-lg border border-cashew p-3">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-cashew/40">
        <Image src={photo.url} alt={photo.alt} fill sizes="96px" className="object-cover" unoptimized />
      </div>
      <div className="min-w-48 flex-1 space-y-2">
        {index === 0 && <span className="rounded-full bg-forest/10 px-2 py-0.5 text-xs text-forest">Main photo</span>}
        <form action={saveAlt} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="imageId" value={photo.id} />
          <input type="hidden" name="productId" value={productId} />
          <div className="min-w-40 flex-1">
            <label htmlFor={`alt-${photo.id}`} className="mb-1 block text-xs text-brown">Description (for screen readers and search)</label>
            <input id={`alt-${photo.id}`} name="alt" defaultValue={photo.alt} maxLength={200} className="w-full rounded-lg border border-cashew bg-white px-3 py-2 text-sm text-chocolate" />
          </div>
          <Button type="submit" size="sm" variant="outline" disabled={savingAlt}>Save</Button>
        </form>
        <FormMessage ok={altState.ok} message={altState.message ?? altState.errors?.alt} />
        <FormMessage ok={moveState.ok} message={moveState.ok ? undefined : moveState.message} />
        <FormMessage ok={removeState.ok} message={removeState.ok ? undefined : removeState.message} />
      </div>
      <div className="flex gap-1">
        <form action={move}>
          <input type="hidden" name="imageId" value={photo.id} /><input type="hidden" name="productId" value={productId} /><input type="hidden" name="direction" value="up" />
          <Button type="submit" variant="ghost" size="sm" disabled={index === 0 || moving} aria-label={`Move photo ${index + 1} earlier`}><ArrowUp size={14} aria-hidden /></Button>
        </form>
        <form action={move}>
          <input type="hidden" name="imageId" value={photo.id} /><input type="hidden" name="productId" value={productId} /><input type="hidden" name="direction" value="down" />
          <Button type="submit" variant="ghost" size="sm" disabled={index === count - 1 || moving} aria-label={`Move photo ${index + 1} later`}><ArrowDown size={14} aria-hidden /></Button>
        </form>
        <form action={remove}>
          <input type="hidden" name="imageId" value={photo.id} /><input type="hidden" name="productId" value={productId} />
          <ConfirmButton confirmLabel="Delete?" variant="ghost" disabled={removing}><Trash2 size={14} aria-label={`Delete photo ${index + 1}`} /></ConfirmButton>
        </form>
      </div>
    </li>
  );
}

export function ProductPhotos({ productId, photos }: { productId: string; photos: Photo[] }) {
  return (
    <section className="space-y-4 rounded-card bg-white p-6 shadow-soft" aria-labelledby="photos-h">
      <h2 id="photos-h" className="font-serif text-xl text-forest">Photos</h2>
      <p className="text-xs text-brown">The first photo is the main one shown on shop cards and at the top of the product page. Use the arrows to reorder. Photos are saved as soon as they upload.</p>
      {photos.length === 0 ? (
        <p className="rounded-lg bg-cashew/40 p-4 text-sm text-brown">No photos yet. Products without photos show an &quot;Image coming soon&quot; placeholder.</p>
      ) : (
        <ul className="space-y-3">
          {photos.map((p, i) => <PhotoRow key={p.id} productId={productId} photo={p} index={i} count={photos.length} />)}
        </ul>
      )}
      <Uploader
        kind="product-image"
        label="Add a photo"
        buttonLabel="Choose a photo…"
        onUploaded={async (path) => {
          const r = await addProductImageAction(productId, path, "");
          return r.ok ? null : (r.message ?? "Could not save the photo.");
        }}
      />
    </section>
  );
}
