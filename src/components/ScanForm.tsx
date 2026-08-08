"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ScanForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [branch, setBranch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parts = fullName.trim().split("/");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      setError('Use o formato "dono/repositorio", ex: octocat/Hello-World');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: parts[0], repo: parts[1], branch: branch || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Falha ao iniciar scan");
        setLoading(false);
        return;
      }

      router.push(`/scans/${data.id}`);
      router.refresh();
    } catch {
      setError("Erro de rede ao iniciar scan");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Repositório</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="dono/repositorio"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Branch (opcional)</label>
        <input
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          placeholder="main (padrão: branch principal)"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-1 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {loading ? "Escaneando..." : "Escanear repositório"}
      </button>
    </form>
  );
}
