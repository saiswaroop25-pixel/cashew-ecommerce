"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser, requireUser } from "@/lib/auth/dal";
import { safeNext } from "@/lib/auth/safe-next";
import { prisma } from "@/lib/prisma";

const productId = z.string().min(1).max(40);

/**
 * Sets (not toggles) the saved state, so a double click or a stale page can't flip it the wrong way.
 * Signed-out visitors are sent to sign in and brought back to `returnTo`.
 */
export async function setWishlisted(id: string, saved: boolean, returnTo: string): Promise<{ ok: boolean }> {
  const parsed = productId.safeParse(id);
  if (!parsed.success) return { ok: false };
  if (!(await getSessionUser())) {
    redirect(`/login?next=${encodeURIComponent(safeNext(returnTo, "/shop"))}`);
  }
  const profile = await requireUser();

  const product = await prisma.product.findFirst({ where: { id: parsed.data, isActive: true }, select: { id: true } });
  if (!product) return { ok: false };

  const wishlist = await prisma.wishlist.upsert({
    where: { profileId: profile.id },
    update: {},
    create: { profileId: profile.id },
  });
  if (saved) {
    await prisma.wishlistItem.upsert({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId: product.id } },
      update: {},
      create: { wishlistId: wishlist.id, productId: product.id },
    });
  } else {
    await prisma.wishlistItem.deleteMany({ where: { wishlistId: wishlist.id, productId: product.id } });
  }
  revalidatePath("/account/wishlist");
  return { ok: true };
}
