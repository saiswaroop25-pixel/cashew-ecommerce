import "@testing-library/jest-dom/vitest";
import { config } from "dotenv";

// Integration tests talk to the real (development) database using your .env.local.
config({ path: ".env.local" });
