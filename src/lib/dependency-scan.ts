export type DependencyMatch = {
  packageName: string;
  version: string;
  severity: "critical" | "high" | "medium" | "low";
  vulnId: string;
  summary: string;
};

type PackageLockV2 = {
  packages?: Record<string, { version?: string }>;
  dependencies?: Record<string, { version?: string }>;
};

function extractNpmPackages(packageLockContent: string): { name: string; version: string }[] {
  const data = JSON.parse(packageLockContent) as PackageLockV2;
  const result: { name: string; version: string }[] = [];

  if (data.packages) {
    for (const [path, info] of Object.entries(data.packages)) {
      if (!path.startsWith("node_modules/") || !info.version) continue;
      const name = path.replace("node_modules/", "");
      result.push({ name, version: info.version });
    }
  } else if (data.dependencies) {
    for (const [name, info] of Object.entries(data.dependencies)) {
      if (info.version) result.push({ name, version: info.version });
    }
  }

  // remove duplicates keeping first occurrence
  const seen = new Set<string>();
  return result.filter((p) => {
    const key = `${p.name}@${p.version}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

type OsvVuln = {
  summary?: string;
  details?: string;
  severity?: { score?: string }[];
  database_specific?: { severity?: string };
};

function severityFromOsv(vuln: OsvVuln): DependencyMatch["severity"] {
  const severities = vuln.severity?.map((s) => s.score) ?? [];
  const cvss = severities.find((s) => typeof s === "string" && s.startsWith("CVSS"));
  const dbSeverity: string | undefined = vuln.database_specific?.severity;

  const raw = (dbSeverity ?? cvss ?? "").toUpperCase();
  if (raw.includes("CRITICAL")) return "critical";
  if (raw.includes("HIGH")) return "high";
  if (raw.includes("MODERATE") || raw.includes("MEDIUM")) return "medium";
  return "low";
}

const OSV_BATCH_ENDPOINT = "https://api.osv.dev/v1/querybatch";
const OSV_VULN_ENDPOINT = "https://api.osv.dev/v1/vulns";
const BATCH_SIZE = 100;

export async function scanNpmDependencies(packageLockContent: string): Promise<DependencyMatch[]> {
  const packages = extractNpmPackages(packageLockContent);
  if (packages.length === 0) return [];

  const findings: DependencyMatch[] = [];

  for (let i = 0; i < packages.length; i += BATCH_SIZE) {
    const batch = packages.slice(i, i + BATCH_SIZE);

    const queries = batch.map((p) => ({
      package: { name: p.name, ecosystem: "npm" },
      version: p.version,
    }));

    const res = await fetch(OSV_BATCH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queries }),
    });

    if (!res.ok) continue;
    const data = await res.json();
    const results: { vulns?: { id: string }[] }[] = data.results ?? [];

    for (let j = 0; j < results.length; j++) {
      const vulnRefs = results[j].vulns ?? [];
      if (vulnRefs.length === 0) continue;
      const pkg = batch[j];

      for (const ref of vulnRefs.slice(0, 3)) {
        const detailRes = await fetch(`${OSV_VULN_ENDPOINT}/${ref.id}`);
        if (!detailRes.ok) continue;
        const vuln = await detailRes.json();

        findings.push({
          packageName: pkg.name,
          version: pkg.version,
          severity: severityFromOsv(vuln),
          vulnId: ref.id,
          summary: vuln.summary ?? vuln.details?.slice(0, 200) ?? "Vulnerabilidade conhecida",
        });
      }
    }
  }

  return findings;
}
