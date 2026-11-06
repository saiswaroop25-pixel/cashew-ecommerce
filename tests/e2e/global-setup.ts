/** Remembers when the run started, so cleanup only touches rows the tests created. */
export default function globalSetup() {
  process.env.E2E_STARTED_AT = new Date().toISOString();
}
