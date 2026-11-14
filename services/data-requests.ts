import "server-only";
import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { DataRequestKind } from "@/lib/validators/data-request";

const reference = (now: Date) => `DR-${now.getUTCFullYear()}-${String(randomInt(0, 1_000_000)).padStart(6, "0")}`;

export async function createDataRequest(input: { email: string; kind: DataRequestKind; details: string | null }, now = new Date()) {
  for (let i = 0; i < 5; i++) {
    try {
      return await prisma.dataRequest.create({ data: { ...input, reference: reference(now) } });
    } catch (e) {
      if (!(e instanceof Error) || !/Unique constraint/i.test(e.message)) throw e; // only retry a reference clash
    }
  }
  throw new Error("Could not allocate a data request reference");
}

export async function listDataRequests(status?: "OPEN" | "DONE") {
  return prisma.dataRequest.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  });
}

export async function completeDataRequest(id: string) {
  await prisma.dataRequest.updateMany({ where: { id, status: "OPEN" }, data: { status: "DONE", doneAt: new Date() } });
}
