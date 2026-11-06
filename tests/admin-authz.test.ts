// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Authorization coverage: EVERY exported admin server action must refuse a non-admin
 * before doing anything else. Actions are discovered by reflection, so a newly added action
 * is automatically covered (and fails here if it forgets the admin check).
 */

// The admin gate says "no" for everyone in this suite.
vi.mock("@/lib/auth/dal", () => ({
  requireAdmin: vi.fn(async () => {
    throw new Error("NOT_ADMIN");
  }),
  requireUser: vi.fn(),
  getProfile: vi.fn(),
  getSessionUser: vi.fn(),
}));
// Any database access before the gate would be a security bug: make it explode loudly.
vi.mock("@/lib/prisma", () => ({
  prisma: new Proxy({}, { get: () => { throw new Error("DB_TOUCHED_BEFORE_AUTH"); } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => { throw new Error("REDIRECT"); }),
  notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }),
}));

import * as enquiryActions from "@/app/actions/admin/enquiries";
import * as mediaActions from "@/app/actions/admin/media";
import * as orderActions from "@/app/actions/admin/orders";
import * as productActions from "@/app/actions/admin/products";
import { requireAdmin } from "@/lib/auth/dal";

const modules = { products: productActions, orders: orderActions, enquiries: enquiryActions, media: mediaActions };

function fakeForm() {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ id: "x", to: "PROCESSING", status: "NEW", quotationId: "q", name: "n" })) fd.set(k, v);
  return fd;
}

describe("admin server actions refuse non-admins", () => {
  beforeEach(() => {
    vi.mocked(requireAdmin).mockClear();
  });

  for (const [moduleName, mod] of Object.entries(modules)) {
    const actions = Object.entries(mod).filter(([, v]) => typeof v === "function");

    it(`${moduleName}: discovered at least one action`, () => {
      expect(actions.length).toBeGreaterThan(0);
    });

    for (const [name, action] of actions) {
      it(`${moduleName}.${name} rejects before touching data`, async () => {
        const fn = action as (...args: unknown[]) => Promise<unknown>;
        // (prev, formData) for form actions, (formData) for simple ones - pass both shapes safely
        await expect(fn.length >= 2 ? fn({ ok: false }, fakeForm()) : fn(fakeForm())).rejects.toThrow("NOT_ADMIN");
        expect(requireAdmin).toHaveBeenCalledTimes(1);
      });
    }
  }

  it("covers a sensible number of actions in total", () => {
    const total = Object.values(modules).flatMap((m) => Object.values(m).filter((v) => typeof v === "function")).length;
    expect(total).toBeGreaterThanOrEqual(22);
  });
});
