import { describe, expect, it } from "vitest";
import { parseCatalogQuery } from "@/lib/validators/catalog";

describe("parseCatalogQuery", () => {
  it("applies defaults for an empty query", () => {
    const q = parseCatalogQuery({});
    expect(q.sort).toBe("popular");
    expect(q.page).toBe(1);
    expect(q.grade).toBeUndefined();
  });

  it("accepts valid filters", () => {
    const q = parseCatalogQuery({ grade: "W240", minPrice: "100", maxPrice: "900", sort: "price-asc", page: "2" });
    expect(q).toMatchObject({ grade: "W240", minPrice: 100, maxPrice: 900, sort: "price-asc", page: 2 });
  });

  it("drops invalid values instead of throwing", () => {
    const q = parseCatalogQuery({ grade: "HACK", minPrice: "-5", sort: "nope", page: "abc" });
    expect(q.grade).toBeUndefined();
    expect(q.minPrice).toBeUndefined();
    expect(q.sort).toBe("popular");
    expect(q.page).toBe(1);
  });

  it("takes the first value of repeated params and treats empty as unset", () => {
    const q = parseCatalogQuery({ q: ["raw", "x"], form: "" });
    expect(q.q).toBe("raw");
    expect(q.form).toBeUndefined();
  });
});
