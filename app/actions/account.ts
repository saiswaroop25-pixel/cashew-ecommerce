"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { addressSchema, echoValues, fieldErrors, profileSchema, type FormState } from "@/lib/validators/auth";

const MAX_ADDRESSES = 10;

export async function updateProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const profile = await requireUser(); // identity comes from the session, never from form data
  const values = echoValues(fd);
  const parsed = profileSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), values };

  await prisma.profile.update({
    where: { id: profile.id },
    data: { fullName: parsed.data.fullName, phone: parsed.data.phone },
  });
  revalidatePath("/account");
  return { ok: true, message: "Profile saved.", values };
}

export async function saveAddress(_prev: FormState, fd: FormData): Promise<FormState> {
  const profile = await requireUser();
  const values = echoValues(fd);
  const parsed = addressSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), values };

  const id = String(fd.get("id") ?? "");
  const { isDefault, ...data } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const count = await tx.address.count({ where: { profileId: profile.id } });
      let addressId = id;
      if (id) {
        // Ownership enforced in the WHERE clause: other users' ids simply match nothing.
        const res = await tx.address.updateMany({ where: { id, profileId: profile.id }, data });
        if (res.count === 0) throw new Error("not-found");
      } else {
        if (count >= MAX_ADDRESSES) throw new Error("limit");
        // First address is automatically the default.
        const created = await tx.address.create({
          data: { ...data, profileId: profile.id, isDefault: count === 0 },
        });
        addressId = created.id;
      }
      if (isDefault) {
        await tx.address.updateMany({ where: { profileId: profile.id }, data: { isDefault: false } });
        await tx.address.update({ where: { id: addressId }, data: { isDefault: true } });
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "limit") return { ok: false, values, message: `You can save up to ${MAX_ADDRESSES} addresses.` };
    if (msg === "not-found") return { ok: false, values, message: "That address no longer exists." };
    console.error("saveAddress failed", e);
    return { ok: false, values, message: "Could not save the address. Please try again." };
  }
  revalidatePath("/account/addresses");
  // Clear the form after adding a new one; keep values when editing.
  return { ok: true, message: "Address saved.", values: id ? values : undefined };
}

export async function deleteAddress(fd: FormData): Promise<void> {
  const profile = await requireUser();
  const id = String(fd.get("id") ?? "");
  const removed = await prisma.address.findFirst({ where: { id, profileId: profile.id } });
  if (!removed) return;
  await prisma.address.delete({ where: { id } });
  // Keep exactly one default if any addresses remain.
  if (removed.isDefault) {
    const next = await prisma.address.findFirst({ where: { profileId: profile.id }, orderBy: { createdAt: "asc" } });
    if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  revalidatePath("/account/addresses");
}

export async function setDefaultAddress(fd: FormData): Promise<void> {
  const profile = await requireUser();
  const id = String(fd.get("id") ?? "");
  await prisma.$transaction(async (tx) => {
    const owned = await tx.address.findFirst({ where: { id, profileId: profile.id } });
    if (!owned) return;
    await tx.address.updateMany({ where: { profileId: profile.id }, data: { isDefault: false } });
    await tx.address.update({ where: { id }, data: { isDefault: true } });
  });
  revalidatePath("/account/addresses");
}
