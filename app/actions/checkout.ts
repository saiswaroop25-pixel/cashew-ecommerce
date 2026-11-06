"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/dal";
import { echoValues, fieldErrors, type FormState } from "@/lib/validators/auth";
import { checkoutSchema } from "@/lib/validators/checkout";
import { getCartView } from "@/services/cart";
import { CheckoutError, createPendingOrder } from "@/services/orders";

export async function placeOrder(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = echoValues(fd);
  const parsed = checkoutSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), values };

  // Guests may check out; signed-in users get the order attached to their account.
  const profile = await getProfile();
  const cart = await getCartView();

  let order;
  try {
    order = await createPendingOrder({ cart, input: parsed.data, profileId: profile?.id ?? null });
  } catch (e) {
    if (e instanceof CheckoutError) return { ok: false, message: e.message, values };
    console.error("placeOrder failed", e);
    return { ok: false, message: "We could not place your order. Please try again.", values };
  }

  revalidatePath("/", "layout");
  redirect(`/checkout/pay/${order.id}?t=${order.accessToken}`);
}
