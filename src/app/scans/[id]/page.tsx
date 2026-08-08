import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const severityColor: Record<string, string> = {
  critical: "border-red-600 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  high: "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  medium: "border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  low: "border-zinc-400 bg-zinc-50 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
};

const severityOrder = ["critical", "high", "medium", "low"];

export default async function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scan = await prisma.scan.findUnique({
    where: { id },
    include: { findings: true },
  });

  if (!scan) notFound();

  const sorted = [...scan.findings].sort(
    (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
  );

  const secrets = sorted.filter((f) => f.type === "secret");
  const deps = sorted.filter((f) => f.type === "dependency");

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          ← voltar
        </Link>

        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {scan.repoOwner}/{scan.repoName}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {new Date(scan.createdAt).toLocaleString("pt-BR")} · status: {scan.status}
        </p>

        {scan.status === "completed" && scan.findings.length === 0 && (
          <p className="mt-8 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
            Nenhum segredo exposto ou dependência vulnerável encontrada.
          </p>
        )}

        {secrets.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
              Segredos expostos ({secrets.length})
            </h2>
            <ul className="flex flex-col gap-2">
              {secrets.map((f) => (
                <li key={f.id} className={`rounded-lg border px-4 py-3 ${severityColor[f.severity]}`}>
                  <p className="text-sm font-medium">{f.title}</p>
                  <p className="mt-1 font-mono text-xs opacity-80">{f.detail}</p>
                  <p className="mt-1 text-xs opacity-60">
                    {f.filePath}
                    {f.line ? `:${f.line}` : ""} · severidade: {f.severity}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {deps.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
              Dependências vulneráveis ({deps.length})
            </h2>
            <ul className="flex flex-col gap-2">
              {deps.map((f) => (
                <li key={f.id} className={`rounded-lg border px-4 py-3 ${severityColor[f.severity]}`}>
                  <p className="text-sm font-medium">{f.title}</p>
                  <p className="mt-1 text-xs opacity-80">{f.detail}</p>
                  <p className="mt-1 text-xs opacity-60">
                    {f.filePath} · severidade: {f.severity}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
