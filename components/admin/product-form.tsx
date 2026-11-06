"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { saveProductAction } from "@/app/actions/admin/products";
import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { FORM_LABELS, FORMS, GRADE_LABELS, GRADES } from "@/lib/validators/catalog";
import type { FormState } from "@/lib/validators/auth";
import { cn } from "@/lib/utils";

export type VariantRow = {
  id?: string;
  label: string;
  weightGrams: string;
  price: string; // rupees
  compareAt: string;
  sku: string;
  quantity: string;
  lowStockThreshold: string;
  isActive: boolean;
  /** units held by unpaid orders (read-only info) */
  reserved?: number;
};

export type ProductDefaults = {
  id?: string;
  name: string;
  slug: string;
  categoryId: string;
  form: string;
  grade: string;
  shortDescription: string;
  description: string;
  origin: string;
  ingredients: string;
  allergenInfo: string;
  storageInstruction: string;
  deliveryInfo: string;
  nutritionProfileId: string;
  isFeatured: boolean;
  isActive: boolean;
  seoTitle: string;
  seoDescription: string;
  variants: VariantRow[];
};

export const EMPTY_PRODUCT: ProductDefaults = {
  name: "", slug: "", categoryId: "", form: "", grade: "NA", shortDescription: "", description: "", origin: "", ingredients: "",
  allergenInfo: "", storageInstruction: "", deliveryInfo: "", nutritionProfileId: "", isFeatured: false, isActive: true, seoTitle: "", seoDescription: "",
  variants: [{ label: "250 g", weightGrams: "250", price: "", compareAt: "", sku: "", quantity: "0", lowStockThreshold: "10", isActive: true }],
};

const input = "w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-chocolate";
const initial: FormState = { ok: false };

function Select({ label, name, value, onChange, error, children }: { label: string; name: string; value: string; onChange: (v: string) => void; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={`p-${name}`} className="mb-1 block text-sm text-brown">{label}</label>
      <select id={`p-${name}`} name={name} value={value} onChange={(e) => onChange(e.target.value)} className={cn(input, error ? "border-red-700" : "border-cashew")}>
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}

function Area({ label, name, value, onChange, rows = 3, error, hint }: { label: string; name: string; value: string; onChange: (v: string) => void; rows?: number; error?: string; hint?: string }) {
  return (
    <div>
      <label htmlFor={`p-${name}`} className="mb-1 block text-sm text-brown">{label}</label>
      <textarea id={`p-${name}`} name={name} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className={cn(input, error ? "border-red-700" : "border-cashew")} />
      {hint && !error && <p className="mt-1 text-xs text-brown/70">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}

export function ProductForm({
  defaults,
  options,
}: {
  defaults: ProductDefaults;
  options: { categories: { id: string; name: string }[]; nutritionProfiles: { id: string; name: string }[] };
}) {
  const [s, action, pending] = useActionState(saveProductAction, initial);
  // Fully controlled: a failed save can never wipe what the admin typed.
  const [f, setF] = useState(defaults);
  const set = <K extends keyof ProductDefaults>(k: K) => (v: ProductDefaults[K]) => setF((p) => ({ ...p, [k]: v }));
  const e = s.errors ?? {};
  const isEdit = !!defaults.id;

  const setVariant = (i: number, patch: Partial<VariantRow>) =>
    setF((p) => ({ ...p, variants: p.variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)) }));
  const addVariant = () =>
    setF((p) => ({ ...p, variants: [...p.variants, { label: "", weightGrams: "", price: "", compareAt: "", sku: "", quantity: "0", lowStockThreshold: "10", isActive: true }] }));
  const removeVariant = (i: number) => setF((p) => ({ ...p, variants: p.variants.filter((_, idx) => idx !== i) }));

  // Strip UI-only fields before sending.
  const variantsJson = JSON.stringify(
    f.variants.map((v) => ({ id: v.id, label: v.label, weightGrams: v.weightGrams, price: v.price, compareAt: v.compareAt, sku: v.sku, quantity: v.quantity, lowStockThreshold: v.lowStockThreshold, isActive: v.isActive })),
  );

  return (
    <form action={action} className="space-y-8" noValidate>
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      <input type="hidden" name="variants" value={variantsJson} />
      <FormMessage ok={s.ok} message={s.message} />

      <section className="space-y-4 rounded-card bg-white p-6 shadow-soft">
        <h2 className="font-serif text-xl text-forest">Basics</h2>
        <Field label="Product name" name="name" value={f.name} onChange={(ev) => set("name")(ev.target.value)} error={e.name} required />
        <Field label="Web address (slug)" name="slug" value={f.slug} onChange={(ev) => set("slug")(ev.target.value)} hint="Leave empty to create it from the name. Changing it later changes the product's link." error={e.slug} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Category" name="categoryId" value={f.categoryId} onChange={set("categoryId")} error={e.categoryId}>
            <option value="">Choose…</option>
            {options.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label="Type" name="form" value={f.form} onChange={set("form")} error={e.form}>
            <option value="">Choose…</option>
            {FORMS.map((x) => <option key={x} value={x}>{FORM_LABELS[x]}</option>)}
          </Select>
          <Select label="Grade" name="grade" value={f.grade} onChange={set("grade")} error={e.grade}>
            <option value="NA">Not applicable</option>
            {GRADES.map((g) => <option key={g} value={g}>{GRADE_LABELS[g]}</option>)}
          </Select>
        </div>
        <div className="flex flex-wrap gap-6 text-sm text-chocolate">
          <label className="flex items-center gap-2"><input type="checkbox" name="isActive" checked={f.isActive} onChange={(ev) => set("isActive")(ev.target.checked)} /> Visible in the shop</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="isFeatured" checked={f.isFeatured} onChange={(ev) => set("isFeatured")(ev.target.checked)} /> Featured on the homepage</label>
        </div>
      </section>

      <section className="space-y-4 rounded-card bg-white p-6 shadow-soft">
        <h2 className="font-serif text-xl text-forest">Pack sizes, prices &amp; stock</h2>
        <p className="text-xs text-brown">
          Prices are in rupees. Stock is what you have on the shelf; units held by unpaid orders are shown and cannot be removed.
          Removing a pack size hides it from the shop but keeps it in past orders.
        </p>
        {e.variants && <p role="alert" className="text-xs text-red-700">{e.variants}</p>}
        <div className="space-y-4">
          {f.variants.map((v, i) => {
            const ve = (k: string) => e[`variants.${i}.${k}`];
            return (
              <fieldset key={v.id ?? `new-${i}`} className="rounded-lg border border-cashew p-4">
                <legend className="px-1 text-xs uppercase tracking-widest text-gold">Pack {i + 1}{v.id ? "" : " (new)"}</legend>
                <div className="grid gap-3 sm:grid-cols-4">
                  <Field label="Label" name={`v${i}-label`} value={v.label} onChange={(ev) => setVariant(i, { label: ev.target.value })} error={ve("label")} placeholder="250 g" />
                  <Field label="Weight (g)" name={`v${i}-w`} inputMode="numeric" value={v.weightGrams} onChange={(ev) => setVariant(i, { weightGrams: ev.target.value })} error={ve("weightGrams")} />
                  <Field label="Price (₹)" name={`v${i}-price`} inputMode="decimal" value={v.price} onChange={(ev) => setVariant(i, { price: ev.target.value })} error={ve("price")} />
                  <Field label="Was price (₹)" name={`v${i}-cmp`} inputMode="decimal" value={v.compareAt} onChange={(ev) => setVariant(i, { compareAt: ev.target.value })} error={ve("compareAt")} hint="Optional" />
                  <Field label="SKU" name={`v${i}-sku`} value={v.sku} onChange={(ev) => setVariant(i, { sku: ev.target.value })} error={ve("sku")} />
                  <Field label="Stock (units)" name={`v${i}-qty`} inputMode="numeric" value={v.quantity} onChange={(ev) => setVariant(i, { quantity: ev.target.value })} error={ve("quantity")} hint={v.reserved ? `${v.reserved} held by unpaid orders` : undefined} />
                  <Field label="Low-stock alert at" name={`v${i}-low`} inputMode="numeric" value={v.lowStockThreshold} onChange={(ev) => setVariant(i, { lowStockThreshold: ev.target.value })} error={ve("lowStockThreshold")} />
                  <div className="flex items-end justify-between gap-2">
                    <label className="flex items-center gap-2 pb-2.5 text-sm text-chocolate"><input type="checkbox" checked={v.isActive} onChange={(ev) => setVariant(i, { isActive: ev.target.checked })} /> On sale</label>
                    {f.variants.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" aria-label={`Remove pack ${i + 1}`} onClick={() => removeVariant(i)}><Trash2 size={14} aria-hidden /></Button>
                    )}
                  </div>
                </div>
              </fieldset>
            );
          })}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addVariant}><Plus size={14} aria-hidden /> Add a pack size</Button>
      </section>

      <section className="space-y-4 rounded-card bg-white p-6 shadow-soft">
        <h2 className="font-serif text-xl text-forest">Description</h2>
        <Area label="Short description" name="shortDescription" value={f.shortDescription} onChange={set("shortDescription")} rows={2} error={e.shortDescription} hint="One line for cards and search results (max 200 characters)." />
        <Area label="Full description" name="description" value={f.description} onChange={set("description")} rows={6} error={e.description} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Origin" name="origin" value={f.origin} onChange={(ev) => set("origin")(ev.target.value)} error={e.origin} hint="Only fill this in if you can verify it." />
          <Select label="Nutrition profile" name="nutritionProfileId" value={f.nutritionProfileId} onChange={set("nutritionProfileId")} error={e.nutritionProfileId}>
            <option value="">None</option>
            {options.nutritionProfiles.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
          </Select>
        </div>
        <Area label="Ingredients" name="ingredients" value={f.ingredients} onChange={set("ingredients")} rows={2} error={e.ingredients} />
        <Area label="Allergen information" name="allergenInfo" value={f.allergenInfo} onChange={set("allergenInfo")} rows={2} error={e.allergenInfo} hint="Cashews are tree nuts - say so, and mention any 'may contain' statements." />
        <Area label="Storage instructions" name="storageInstruction" value={f.storageInstruction} onChange={set("storageInstruction")} rows={2} error={e.storageInstruction} />
        <Area label="Delivery information" name="deliveryInfo" value={f.deliveryInfo} onChange={set("deliveryInfo")} rows={2} error={e.deliveryInfo} />
      </section>

      <section className="space-y-4 rounded-card bg-white p-6 shadow-soft">
        <h2 className="font-serif text-xl text-forest">Search engines</h2>
        <Field label="Page title" name="seoTitle" value={f.seoTitle} onChange={(ev) => set("seoTitle")(ev.target.value)} error={e.seoTitle} hint="Up to 70 characters. Empty = product name." />
        <Area label="Meta description" name="seoDescription" value={f.seoDescription} onChange={set("seoDescription")} rows={2} error={e.seoDescription} hint="Up to 160 characters." />
      </section>

      <div className="flex items-center gap-4">
        <Button type="submit" size="lg" disabled={pending}>{pending ? "Saving…" : isEdit ? "Save changes" : "Create product"}</Button>
        <p className="text-xs text-brown">{isEdit ? "Photos are managed in the Photos section above." : "After creating the product you can add photos."}</p>
      </div>
    </form>
  );
}
