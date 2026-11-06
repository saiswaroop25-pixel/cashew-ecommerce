import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type Actor = { id: string; email: string };

/**
 * Appends to the audit log. A logging failure must never undo or block the change that was just
 * made, so errors are reported to the server log instead of thrown.
 */
export async function logAudit(
  actor: Actor,
  entry: { action: string; entity: string; entityId?: string; summary?: string; diff?: Prisma.InputJsonValue },
) {
  try {
    await prisma.auditLog.create({
      data: { actorId: actor.id, actorEmail: actor.email, ...entry },
    });
  } catch (e) {
    console.error("audit log write failed", entry.action, e);
  }
}
