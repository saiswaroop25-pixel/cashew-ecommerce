import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * The "how we make it" steps shown as a picture flow on the home page.
 * Each step has a title, a short description and (optionally) one picture the admin uploaded.
 */
export type FlowStep = {
  id: string;
  step: number;
  title: string;
  summary: string;
  /** id of the picture row (admin uses it to remove the picture) */
  mediaId: string | null;
  imageUrl: string | null;
  imageAlt: string;
  /** true = stock/illustrative picture, not from the company's own facility */
  imageIsIllustrative: boolean;
  /** seeded placeholder wording, not yet written by the business */
  isDemo: boolean;
};

export async function getProcessFlow(): Promise<FlowStep[]> {
  const stages = await prisma.manufacturingStage.findMany({
    orderBy: { step: "asc" },
    include: { media: { where: { kind: "IMAGE" }, orderBy: { sortOrder: "asc" }, take: 1 } },
  });
  return stages.map((s) => {
    const image = s.media[0];
    return {
      id: s.id,
      step: s.step,
      title: s.title,
      summary: s.summary,
      mediaId: image?.id ?? null,
      imageUrl: image?.url ?? null,
      imageAlt: image?.caption || s.title,
      imageIsIllustrative: image?.isIllustrative ?? true,
      isDemo: s.isDemo,
    };
  });
}
