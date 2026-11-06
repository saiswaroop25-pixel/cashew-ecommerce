import "server-only";
import { prisma } from "@/lib/prisma";

export type ProcessMedia = {
  id: string;
  kind: "IMAGE" | "VIDEO" | "MODEL_3D";
  url: string;
  posterUrl: string | null;
  captionsUrl: string | null;
  caption: string | null;
  /** true = stock/illustrative; false = the company's own footage */
  isIllustrative: boolean;
};

export type ProcessStage = {
  id: string;
  step: number;
  title: string;
  summary: string;
  qualityNote: string;
  /** second in the main video where this stage begins */
  startSecond: number | null;
  /** seeded placeholder text, not yet written by the business */
  isDemo: boolean;
  media: ProcessMedia[];
};

export type ProcessData = {
  stages: ProcessStage[];
  /** the main process video (media with no stage), if one has been added */
  mainVideo: ProcessMedia | null;
};

const mediaSelect = {
  id: true,
  kind: true,
  url: true,
  posterUrl: true,
  captionsUrl: true,
  caption: true,
  isIllustrative: true,
} as const;

export async function getProcessData(): Promise<ProcessData> {
  const [stages, mainVideo] = await Promise.all([
    prisma.manufacturingStage.findMany({
      orderBy: { step: "asc" },
      include: { media: { orderBy: { sortOrder: "asc" }, select: mediaSelect } },
    }),
    prisma.manufacturingMedia.findFirst({
      where: { stageId: null, kind: "VIDEO" },
      orderBy: { sortOrder: "asc" },
      select: mediaSelect,
    }),
  ]);
  return {
    mainVideo,
    stages: stages.map((s) => ({
      id: s.id,
      step: s.step,
      title: s.title,
      summary: s.summary,
      qualityNote: s.qualityNote,
      startSecond: s.startSecond,
      isDemo: s.isDemo,
      media: s.media,
    })),
  };
}
