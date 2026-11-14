"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { completeDataRequest } from "@/services/data-requests";

export async function markDataRequestDone(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = z.string().min(1).max(40).safeParse(fd.get("id"));
  if (!id.success) return;
  await completeDataRequest(id.data);
  revalidatePath("/admin/data-requests");
}
