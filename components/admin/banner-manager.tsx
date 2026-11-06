"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import Image from "next/image";
import { useActionState } from "react";
import { createBannerAction, deleteBannerAction, moveBannerAction, removeBannerImageAction, setBannerImageAction, updateBannerAction } from "@/app/actions/admin/content";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Uploader } from "@/components/admin/uploader";
import { Badge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import type { FormState } from "@/lib/validators/auth";

const initial: FormState = { ok: false };

type BannerRow = { id: string; title: string; subtitle: string | null; imageUrl: string | null; linkUrl: string | null; linkLabel: string | null; isActive: boolean };

function Fields({ b, errors }: { b?: BannerRow; errors: Record<string, string> }) {
  return (
    <>
      <Field label="Headline" name="title" defaultValue={b?.title} error={errors.title} maxLength={90} required />
      <Field label="Supporting text (optional)" name="subtitle" defaultValue={b?.subtitle ?? ""} error={errors.subtitle} maxLength={200} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Link (optional)" name="linkUrl" defaultValue={b?.linkUrl ?? ""} error={errors.linkUrl} placeholder="/shop or https://…" hint="A page on this site, or a full https:// link." />
        <Field label="Button text" name="linkLabel" defaultValue={b?.linkLabel ?? ""} error={errors.linkLabel} maxLength={30} placeholder="Shop now" />
      </div>
      <label className="flex items-center gap-2 text-sm text-chocolate"><input type="checkbox" name="isActive" defaultChecked={b ? b.isActive : true} /> Show on the home page</label>
    </>
  );
}

export function NewBanner() {
  const [s, action, pending] = useActionState(createBannerAction, initial);
  return (
    <form action={action} className="space-y-3 rounded-card bg-white p-6 shadow-soft" noValidate>
      <h2 className="font-serif text-xl text-forest">New banner</h2>
      <FormMessage ok={s.ok} message={s.message} />
      <Fields errors={s.errors ?? {}} key={s.ok ? "reset" : "keep"} />
      <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create banner"}</Button>
    </form>
  );
}

function BannerCard({ b, index, count }: { b: BannerRow; index: number; count: number }) {
  const [saveState, save, saving] = useActionState(updateBannerAction, initial);
  const [delState, del, deleting] = useActionState(deleteBannerAction, initial);
  const [moveState, move, moving] = useActionState(moveBannerAction, initial);
  const [imgState, removeImg, removingImg] = useActionState(removeBannerImageAction, initial);

  return (
    <li className="rounded-card bg-white p-5 shadow-soft">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-serif text-lg text-chocolate">
          <span className="text-gold-text">{index + 1}</span> {b.title}
          <Badge value={b.isActive ? "ACTIVE" : "INACTIVE"} label={b.isActive ? "Showing" : "Hidden"} />
        </p>
        <div className="flex gap-1">
          <form action={move}>
            <input type="hidden" name="id" value={b.id} /><input type="hidden" name="direction" value="up" />
            <Button type="submit" variant="ghost" size="sm" disabled={index === 0 || moving} aria-label={`Move banner ${index + 1} earlier`}><ArrowUp size={14} aria-hidden /></Button>
          </form>
          <form action={move}>
            <input type="hidden" name="id" value={b.id} /><input type="hidden" name="direction" value="down" />
            <Button type="submit" variant="ghost" size="sm" disabled={index === count - 1 || moving} aria-label={`Move banner ${index + 1} later`}><ArrowDown size={14} aria-hidden /></Button>
          </form>
        </div>
      </div>
      <FormMessage ok={moveState.ok} message={moveState.ok ? undefined : moveState.message} />

      <form action={save} className="space-y-3" noValidate>
        <input type="hidden" name="id" value={b.id} />
        <FormMessage ok={saveState.ok} message={saveState.message} />
        <Fields b={b} errors={saveState.errors ?? {}} />
        <Button type="submit" size="sm" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
      </form>

      <div className="mt-5 border-t border-cashew pt-4">
        <h3 className="font-serif text-base text-chocolate">Image (optional)</h3>
        {b.imageUrl && (
          <form action={removeImg} className="mt-2 flex flex-wrap items-center gap-4">
            <input type="hidden" name="id" value={b.id} />
            <div className="relative h-20 w-28 overflow-hidden rounded-lg bg-cashew/40"><Image src={b.imageUrl} alt="" fill sizes="112px" className="object-cover" unoptimized /></div>
            <ConfirmButton confirmLabel="Remove?" variant="ghost" disabled={removingImg}>Remove image</ConfirmButton>
          </form>
        )}
        <FormMessage ok={imgState.ok} message={imgState.ok ? undefined : imgState.message} />
        <div className="mt-2">
          <Uploader kind="banner-image" label={b.imageUrl ? "Replace image" : "Add an image"} buttonLabel="Choose image…" onUploaded={async (path) => {
            const r = await setBannerImageAction(b.id, path);
            return r.ok ? null : (r.message ?? "Could not save the image.");
          }} />
          <p className="mt-1 text-xs text-brown">Reload this page after uploading to see the new image here.</p>
        </div>
      </div>

      <form action={del} className="mt-5 border-t border-cashew pt-4">
        <input type="hidden" name="id" value={b.id} />
        <FormMessage ok={delState.ok} message={delState.ok ? undefined : delState.message} />
        <ConfirmButton confirmLabel="Yes, delete this banner" disabled={deleting}>Delete banner…</ConfirmButton>
      </form>
    </li>
  );
}

export function BannerList({ banners }: { banners: BannerRow[] }) {
  if (banners.length === 0) return <p className="rounded-card bg-white p-8 text-center text-brown shadow-soft">No banners yet. The home page shows none until you create one.</p>;
  return <ul className="space-y-5">{banners.map((b, i) => <BannerCard key={b.id} b={b} index={i} count={banners.length} />)}</ul>;
}
