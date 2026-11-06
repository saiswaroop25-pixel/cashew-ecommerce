import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The real action talks to the database; the form only needs *a* function here.
vi.mock("@/app/actions/admin/products", () => ({ saveProductAction: vi.fn(async () => ({ ok: true })) }));

import { EMPTY_PRODUCT, ProductForm, type ProductDefaults } from "@/components/admin/product-form";

const options = { categories: [{ id: "c1", name: "Whole Cashews" }] };
afterEach(cleanup);

const submittedVariants = (container: HTMLElement) =>
  JSON.parse((container.querySelector('input[name="variants"]') as HTMLInputElement).value) as Record<string, unknown>[];

describe("ProductForm pack-size editor", () => {
  it("submits a JSON list of pack sizes with only the fields the server expects (no UI-only data)", () => {
    const existing: ProductDefaults = {
      ...EMPTY_PRODUCT,
      id: "p1",
      name: "Raw W240",
      variants: [{ id: "v1", label: "250 g", weightGrams: "250", price: "299.5", compareAt: "", sku: "SKU-1", quantity: "10", lowStockThreshold: "3", isActive: true, reserved: 4 }],
    };
    const { container } = render(<ProductForm defaults={existing} options={options} />);
    const [row] = submittedVariants(container);
    expect(row).toEqual({ id: "v1", label: "250 g", weightGrams: "250", price: "299.5", compareAt: "", sku: "SKU-1", quantity: "10", lowStockThreshold: "3", isActive: true });
    expect(row).not.toHaveProperty("reserved");
    expect((container.querySelector('input[name="id"]') as HTMLInputElement).value).toBe("p1");
  });

  it("shows how many units are held by unpaid orders", () => {
    const withReserved: ProductDefaults = { ...EMPTY_PRODUCT, id: "p1", variants: [{ ...EMPTY_PRODUCT.variants[0], id: "v1", reserved: 4 }] };
    render(<ProductForm defaults={withReserved} options={options} />);
    expect(screen.getByText("4 held by unpaid orders")).toBeInTheDocument();
  });

  it("adds and removes pack sizes; the last remaining pack cannot be removed", () => {
    const { container } = render(<ProductForm defaults={EMPTY_PRODUCT} options={options} />);
    expect(submittedVariants(container)).toHaveLength(1);
    expect(screen.queryByLabelText("Remove pack 1")).not.toBeInTheDocument(); // only one pack: no remove button

    fireEvent.click(screen.getByRole("button", { name: /add a pack size/i }));
    fireEvent.click(screen.getByRole("button", { name: /add a pack size/i }));
    expect(submittedVariants(container)).toHaveLength(3);

    fireEvent.click(screen.getByLabelText("Remove pack 2"));
    expect(submittedVariants(container)).toHaveLength(2);
  });

  it("edits flow into the submitted JSON", () => {
    const { container } = render(<ProductForm defaults={EMPTY_PRODUCT} options={options} />);
    fireEvent.change(container.querySelector('input[name="v0-price"]') as HTMLInputElement, { target: { value: "499" } });
    fireEvent.change(container.querySelector('input[name="v0-sku"]') as HTMLInputElement, { target: { value: "NEW-250" } });
    fireEvent.change(container.querySelector('input[name="v0-qty"]') as HTMLInputElement, { target: { value: "40" } });
    expect(submittedVariants(container)[0]).toMatchObject({ price: "499", sku: "NEW-250", quantity: "40" });
  });

  it("a new product starts blank and says so; an edit says 'Save changes'", () => {
    const { rerender } = render(<ProductForm defaults={EMPTY_PRODUCT} options={options} />);
    expect(screen.getByRole("button", { name: "Create product" })).toBeInTheDocument();
    rerender(<ProductForm defaults={{ ...EMPTY_PRODUCT, id: "p1" }} options={options} />);
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });

  it("every category from the database is offered, and there is no nutrition field any more", () => {
    render(<ProductForm defaults={EMPTY_PRODUCT} options={options} />);
    expect(screen.getByRole("option", { name: "Whole Cashews" })).toBeInTheDocument();
    expect(screen.queryByText(/nutrition/i)).not.toBeInTheDocument();
  });
});
