"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function SettingsPage() {
  const [token, setToken] = useState("");
  const [hasToken, setHasToken] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setHasToken(Boolean(d.hasToken)));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ githubToken: token }),
    });
    setSaved(true);
    setHasToken(Boolean(token));
    setToken("");
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          ← voltar
        </Link>

        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Configurações</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Um token do GitHub é necessário para escanear repositórios privados e evitar limites de taxa
          baixos. Sem token, o app funciona só com repositórios públicos.
        </p>

        <form
          onSubmit={handleSave}
          className="mt-6 flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              GitHub Personal Access Token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={hasToken ? "•••••••••••••••• (já configurado)" : "ghp_..."}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
            <p className="text-xs text-zinc-500">
              Crie em{" "}
              <a
                href="https://github.com/settings/tokens?type=beta"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                github.com/settings/tokens
              </a>{" "}
              com escopo de leitura de repositórios (fine-grained: Contents: Read-only).
            </p>
          </div>

          <button
            type="submit"
            className="mt-1 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Salvar
          </button>

          {saved && <p className="text-sm text-green-600">Salvo.</p>}
        </form>
      </main>
    </div>
  );
}
