// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

/** The real requireAdmin()/requireUser() logic, with Supabase and the database faked. */
const state = vi.hoisted(() => ({
  user: null as null | { id: string; email: string },
  profile: null as null | { id: string; email: string; role: "ADMIN" | "CUSTOMER" },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => (state.user ? { data: { user: { ...state.user, user_metadata: {} } }, error: null } : { data: { user: null }, error: new Error("no session") }) },
  }),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: {
      findUnique: async () => state.profile,
      upsert: async () => state.profile,
    },
  },
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => { throw new Error(`REDIRECT:${to}`); },
  notFound: () => { throw new Error("NOT_FOUND"); },
}));

// "react" cache() memoises per request; give each test a fresh module graph instead.
async function load() {
  vi.resetModules();
  return import("@/lib/auth/dal");
}

describe("requireAdmin", () => {
  beforeEach(() => {
    state.user = null;
    state.profile = null;
  });

  it("sends signed-out visitors to the login page", async () => {
    const { requireAdmin } = await load();
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/login");
  });

  it("shows a 404 (not a 'forbidden') to signed-in customers, so the admin area is not advertised", async () => {
    state.user = { id: "u1", email: "customer@example.test" };
    state.profile = { id: "u1", email: "customer@example.test", role: "CUSTOMER" };
    const { requireAdmin } = await load();
    await expect(requireAdmin()).rejects.toThrow("NOT_FOUND");
  });

  it("lets an admin through and returns their profile", async () => {
    state.user = { id: "a1", email: "admin@example.test" };
    state.profile = { id: "a1", email: "admin@example.test", role: "ADMIN" };
    const { requireAdmin } = await load();
    await expect(requireAdmin()).resolves.toMatchObject({ id: "a1", role: "ADMIN" });
  });

  it("an authenticated user without a profile row still gets a CUSTOMER profile, never admin", async () => {
    state.user = { id: "n1", email: "new@example.test" };
    state.profile = null; // findUnique -> null, upsert -> null in this fake => treated as signed out
    const { requireAdmin } = await load();
    await expect(requireAdmin()).rejects.toThrow(/REDIRECT|NOT_FOUND/);
  });
});
