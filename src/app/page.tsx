import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ScanForm from "@/components/ScanForm";

export const dynamic = "force-dynamic";

const severityColor: Record<string, string> = {
  critical: "bg-red-600",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-zinc-400",
};

export default async function Home() {
  const scans = await prisma.scan.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { findings: { select: { severity: true } } },
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">repo-guard</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Escaneia repositórios do GitHub em busca de segredos expostos e dependências vulneráveis.
            </p>
          </div>
          <Link
            href="/settings"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Configurações
          </Link>
        </div>

        <ScanForm />

        <h2 className="mt-12 mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500">
          Histórico de scans
        </h2>

        {scans.length === 0 && (
          <p className="text-sm text-zinc-500">Nenhum scan ainda. Rode o primeiro acima.</p>
        )}

        <ul className="flex flex-col gap-2">
          {scans.map((scan) => {
            const counts = scan.findings.reduce<Record<string, number>>((acc, f) => {
              acc[f.severity] = (acc[f.severity] ?? 0) + 1;
              return acc;
            }, {});

            return (
              <li key={scan.id}>
                <Link
                  href={`/scans/${scan.id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                >
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {scan.repoOwner}/{scan.repoName}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(scan.createdAt).toLocaleString("pt-BR")} · {scan.status}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {Object.entries(counts).map(([sev, count]) => (
                      <span
                        key={sev}
                        className={`${severityColor[sev] ?? "bg-zinc-400"} rounded-full px-2 py-0.5 text-xs font-medium text-white`}
                      >
                        {count}
                      </span>
                    ))}
                    {scan.findings.length === 0 && scan.status === "completed" && (
                      <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs font-medium text-white">
                        limpo
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
