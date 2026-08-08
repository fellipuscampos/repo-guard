import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBlobContent, getOctokit, getRepoTree } from "@/lib/github";
import { scanContentForSecrets } from "@/lib/secret-scan";
import { scanNpmDependencies } from "@/lib/dependency-scan";

const MAX_FILES_TO_SCAN = 300;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { owner, repo, branch } = body as { owner?: string; repo?: string; branch?: string };

  if (!owner || !repo) {
    return NextResponse.json({ error: "owner e repo sao obrigatorios" }, { status: 400 });
  }

  const scan = await prisma.scan.create({
    data: { repoOwner: owner, repoName: repo, status: "running" },
  });

  try {
    let branchToUse = branch;
    if (!branchToUse) {
      const octokit = await getOctokit();
      const { data: repoInfo } = await octokit.repos.get({ owner, repo });
      branchToUse = repoInfo.default_branch;
    }

    const tree = await getRepoTree(owner, repo, branchToUse);
    const filesToScan = tree.slice(0, MAX_FILES_TO_SCAN);

    const findingsData: {
      scanId: string;
      type: string;
      severity: string;
      title: string;
      detail: string;
      filePath: string | null;
      line: number | null;
    }[] = [];

    for (const file of filesToScan) {
      const content = await getBlobContent(owner, repo, file.sha);
      if (!content) continue;

      const secretMatches = scanContentForSecrets(content);
      for (const m of secretMatches) {
        findingsData.push({
          scanId: scan.id,
          type: "secret",
          severity: m.severity,
          title: m.title,
          detail: m.snippet,
          filePath: file.path,
          line: m.line,
        });
      }

      if (file.path.endsWith("package-lock.json")) {
        try {
          const depFindings = await scanNpmDependencies(content);
          for (const d of depFindings) {
            findingsData.push({
              scanId: scan.id,
              type: "dependency",
              severity: d.severity,
              title: `${d.packageName}@${d.version} (${d.vulnId})`,
              detail: d.summary,
              filePath: file.path,
              line: null,
            });
          }
        } catch {
          // package-lock malformado ou API indisponivel, ignora essa parte do scan
        }
      }
    }

    if (findingsData.length > 0) {
      await prisma.finding.createMany({ data: findingsData });
    }

    const finished = await prisma.scan.update({
      where: { id: scan.id },
      data: { status: "completed", finishedAt: new Date() },
      include: { findings: true },
    });

    return NextResponse.json(finished);
  } catch (err) {
    await prisma.scan.update({
      where: { id: scan.id },
      data: { status: "failed", finishedAt: new Date() },
    });
    const message = err instanceof Error ? err.message : "erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const scans = await prisma.scan.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { _count: { select: { findings: true } } },
  });
  return NextResponse.json(scans);
}
