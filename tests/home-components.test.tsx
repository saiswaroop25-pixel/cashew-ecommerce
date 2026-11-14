import { cleanup, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
const site = vi.hoisted(() => ({ value: {} as Record<string, string> }));
vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));
vi.mock("@/services/site", () => ({ getSite: async () => site.value }));

import { BannerStrip } from "@/components/home/banner-strip";
import { ProcessFlow } from "@/components/home/process-flow";
import { Footer } from "@/components/layout/footer";
import type { FlowStep } from "@/services/manufacturing";

afterEach(cleanup);

describe("BannerStrip", () => {
  it("renders nothing when there are no banners", () => {
    const { container } = render(<BannerStrip banners={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
  it("uses a normal link for in-site pages and a safe new-tab link for external ones", () => {
    render(
      <BannerStrip
        banners={[
          { id: "1", title: "Festive offer", subtitle: "10% off", imageUrl: null, linkUrl: "/shop", linkLabel: "Shop now" },
          { id: "2", title: "Press", subtitle: null, imageUrl: "https://x.test/p.jpg", linkUrl: "https://example.com/news", linkLabel: "Read" },
          { id: "3", title: "No link", subtitle: null, imageUrl: null, linkUrl: null, linkLabel: null },
        ]}
      />,
    );
    const shop = screen.getByRole("link", { name: "Shop now" });
    expect(shop).toHaveAttribute("href", "/shop");
    expect(shop).not.toHaveAttribute("target");
    const ext = screen.getByRole("link", { name: "Read" });
    expect(ext).toHaveAttribute("target", "_blank");
    expect(ext).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText("No link")).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(2); // no button where there is no link
  });
});

const steps = (n: number): FlowStep[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `s${i + 1}`,
    step: i + 1,
    title: `Step ${i + 1}`,
    summary: `Does thing ${i + 1}.`,
    mediaId: i === 0 ? "m1" : null,
    imageUrl: i === 0 ? "https://x.test/1.jpg" : null,
    imageAlt: `Picture ${i + 1}`,
    imageIsIllustrative: i === 0,
    isDemo: false,
  }));

describe("ProcessFlow", () => {
  it("shows every step in order, with arrows BETWEEN steps only", () => {
    const { container } = render(<ProcessFlow steps={steps(4)} />);
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Step 1", "Step 2", "Step 3", "Step 4"]);
    expect(container.querySelectorAll("ol > li > span[aria-hidden]")).toHaveLength(3);
  });
  it("shows the picture (with an Illustrative label when flagged) or a numbered tile when there is none", () => {
    render(<ProcessFlow steps={steps(3)} />);
    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).getByAltText("Picture 1")).toBeInTheDocument();
    expect(within(items[0]).getByText("Illustrative")).toBeInTheDocument();
    expect(within(items[1]).queryByRole("img")).not.toBeInTheDocument();
    expect(within(items[1]).getByText("02")).toBeInTheDocument(); // plain numbered tile, no "image missing" box
  });
  it("renders nothing without steps, and has labelled scroll buttons", () => {
    const { container, rerender } = render(<ProcessFlow steps={[]} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<ProcessFlow steps={steps(2)} />);
    expect(screen.getByRole("button", { name: "Previous steps" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next steps" })).toBeInTheDocument();
  });
});

describe("Footer", () => {
  const base = { name: "Acme Cashews", tagline: "", about: "", email: "", phone: "", whatsapp: "", address: "", instagramUrl: "", facebookUrl: "", youtubeUrl: "" };
  const html = async () => renderToStaticMarkup(await Footer());

  it("shows the saved details and links them correctly", async () => {
    site.value = {
      ...base,
      tagline: "Fresh daily",
      about: "Family run.",
      email: "hi@acme.test",
      phone: "+919876543210",
      whatsapp: "919876543210",
      address: "1 Road\nMangaluru",
      instagramUrl: "https://instagram.com/acme",
      youtubeUrl: "https://youtube.com/@acme",
    };
    const out = await html();
    expect(out).toContain("Acme Cashews");
    expect(out).toContain("Fresh daily");
    expect(out).toContain('href="mailto:hi@acme.test"');
    expect(out).toContain('href="tel:+919876543210"');
    expect(out).toContain("https://wa.me/919876543210");
    expect(out).toContain("Instagram");
    expect(out).toContain("YouTube");
    expect(out).not.toContain("Facebook"); // empty links are not shown
    expect(out).toMatch(/instagram\.com\/acme"[^>]*rel="noopener noreferrer"/);
  });
  it("hides anything not filled in instead of showing 'not configured', and offers the enquiry form", async () => {
    site.value = { ...base };
    const out = await html();
    expect(out).not.toMatch(/not configured|mailto:|tel:|wa\.me/);
    expect(out).toContain("Send us an enquiry");
  });
  it("escapes the business name and text (no markup injection from the admin form)", async () => {
    site.value = { ...base, name: "<img src=x onerror=alert(1)>", about: "<script>alert(1)</script>" };
    const out = await html();
    expect(out).not.toContain("<script>alert(1)</script>");
    expect(out).not.toContain("<img src=x onerror");
    expect(out).toContain("&lt;script&gt;");
  });
});
