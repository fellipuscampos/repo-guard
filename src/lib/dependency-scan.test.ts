import { afterEach, describe, expect, it, vi } from "vitest";
import { scanNpmDependencies } from "./dependency-scan";

const packageLockV2 = JSON.stringify({
  lockfileVersion: 2,
  packages: {
    "": { name: "demo" },
    "node_modules/lodash": { version: "4.17.11" },
    "node_modules/left-pad": { version: "1.3.0" },
  },
});

function mockFetchSequence(responses: unknown[]) {
  let call = 0;
  global.fetch = vi.fn(async () => {
    const body = responses[call];
    call += 1;
    return {
      ok: true,
      json: async () => body,
    } as Response;
  });
}

describe("scanNpmDependencies", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns no findings when no vulnerabilities are reported", async () => {
    mockFetchSequence([{ results: [{}, {}] }]);
    const findings = await scanNpmDependencies(packageLockV2);
    expect(findings).toHaveLength(0);
  });

  it("maps a batch result with a vuln id to a finding with severity", async () => {
    mockFetchSequence([
      { results: [{ vulns: [{ id: "GHSA-test-0001" }] }, {}] },
      {
        summary: "Prototype pollution in lodash",
        database_specific: { severity: "HIGH" },
      },
    ]);

    const findings = await scanNpmDependencies(packageLockV2);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      packageName: "lodash",
      version: "4.17.11",
      vulnId: "GHSA-test-0001",
      severity: "high",
      summary: "Prototype pollution in lodash",
    });
  });

  it("returns an empty list for a package-lock with no dependencies", async () => {
    const findings = await scanNpmDependencies(JSON.stringify({ packages: {} }));
    expect(findings).toHaveLength(0);
  });
});
