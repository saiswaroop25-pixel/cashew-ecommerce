import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// next/image validates remote hosts against next.config at runtime; a plain <img> is enough for behaviour tests.
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

import { ProductGallery } from "@/components/shop/product-gallery";

afterEach(cleanup);
const photos = [
  { url: "https://x.test/a.jpg", alt: "Front of the pack" },
  { url: "https://x.test/b.jpg", alt: "Kernels in a bowl" },
  { url: "https://x.test/c.jpg", alt: "Close-up" },
];

describe("ProductGallery", () => {
  it("shows a placeholder when a product has no photos", () => {
    render(<ProductGallery photos={[]} productName="Test" />);
    expect(screen.getByText("Image coming soon")).toBeInTheDocument();
  });

  it("shows the first photo and one thumbnail per photo (none for a single photo)", () => {
    const { rerender } = render(<ProductGallery photos={photos} productName="Test" />);
    expect(screen.getAllByAltText("Front of the pack").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /Show photo/ })).toHaveLength(3);
    rerender(<ProductGallery photos={[photos[0]]} productName="Test" />);
    expect(screen.queryAllByRole("button", { name: /Show photo/ })).toHaveLength(0);
  });

  it("clicking a thumbnail changes the main photo and marks it current", () => {
    render(<ProductGallery photos={photos} productName="Test" />);
    fireEvent.click(screen.getByRole("button", { name: "Show photo 2 of 3" }));
    expect(screen.getByRole("button", { name: "Show photo 2 of 3" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Show photo 1 of 3" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("button", { name: "Zoom photo: Kernels in a bowl" })).toBeInTheDocument();
  });

  it("clicking the main photo opens the zoom dialog, and next/previous wrap around", () => {
    const show = vi.fn();
    HTMLDialogElement.prototype.showModal = show;
    render(<ProductGallery photos={photos} productName="Test" />);
    fireEvent.click(screen.getByRole("button", { name: /Zoom photo/ }));
    expect(show).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Previous photo", hidden: true })); // from #1 wraps to #3
    expect(screen.getByRole("button", { name: "Zoom photo: Close-up" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next photo", hidden: true })); // from #3 wraps to #1
    expect(screen.getByRole("button", { name: "Zoom photo: Front of the pack" })).toBeInTheDocument();
  });
});
