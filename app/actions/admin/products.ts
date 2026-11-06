"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { deepErrors } from "@/lib/admin/forms";
import { requireAdmin } from "@/lib/auth/dal";
import { productFormToRaw, productSchema } from "@/lib/validators/admin-product";
import type { FormState } from "@/lib/validators/auth";
import { AdminError, deleteProduct, saveProduct, setProductActive } from "@/services/admin/products";

/** Create or update a product (hidden field `id` present = update). */
export async function saveProductAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin(); // first line: nothing below runs for non-admins

  const parsed = productSchema.safeParse(productFormToRaw(fd));
  if (!parsed.success) return { ok: false, errors: deepErrors(parsed.error), message: "Please fix the highlighted fields." };

  const id = String(fd.get("id") ?? "") || null;
  let savedId: string;
  try {
    savedId = (await saveProduct(parsed.data, id, { id: admin.id, email: admin.email })).id;
  } catch (e) {
    if (e instanceof AdminError) return { ok: false, message: e.message };
    console.error("saveProductAction failed", e);
    return { ok: false, message: "Could not save the product. Please try again." };
  }
  updateTag("products"); // sitemap + product lookups refresh immediately
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath(`/products/${parsed.data.slug}`);
  if (!id) redirect(`/admin/products/${savedId}?created=1`);
  return { ok: true, message: "Product saved." };
}

export async function setProductActiveAction(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (!id) return;
  await setProductActive(id, fd.get("active") === "true", { id: admin.id, email: admin.email });
  updateTag("products");
  revalidatePath("/admin/products");
  revalidatePath("/shop");
}

export async function deleteProductAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (!id) return { ok: false, message: "Missing product." };
  try {
    await deleteProduct(id, { id: admin.id, email: admin.email });
  } catch (e) {
    if (e instanceof AdminError) return { ok: false, message: e.message };
    console.error("deleteProductAction failed", e);
    return { ok: false, message: "Could not delete the product." };
  }
  updateTag("products");
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  redirect("/admin/products?deleted=1");
}
