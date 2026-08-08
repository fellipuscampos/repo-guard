import { Octokit } from "@octokit/rest";
import { prisma } from "@/lib/prisma";

export async function getGithubToken(): Promise<string | undefined> {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  return settings?.githubToken ?? process.env.GITHUB_TOKEN ?? undefined;
}

export async function getOctokit() {
  const auth = await getGithubToken();
  return new Octokit(auth ? { auth } : {});
}

export type RepoSummary = {
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
};

export async function listRepos(): Promise<RepoSummary[]> {
  const octokit = await getOctokit();
  const token = await getGithubToken();

  if (!token) {
    return [];
  }

  const { data } = await octokit.repos.listForAuthenticatedUser({
    per_page: 50,
    sort: "updated",
  });

  return data.map((r) => ({
    owner: r.owner.login,
    name: r.name,
    fullName: r.full_name,
    private: r.private,
    defaultBranch: r.default_branch ?? "main",
  }));
}

export type RepoFile = {
  path: string;
  size: number;
  sha: string;
};

const TEXT_EXTENSIONS = [
  ".js", ".jsx", ".ts", ".tsx", ".py", ".rb", ".go", ".java", ".php",
  ".env", ".yml", ".yaml", ".json", ".txt", ".md", ".sh", ".cfg", ".ini",
  ".toml", ".properties", ".xml", ".conf",
];

const IGNORED_DIRS = ["node_modules/", "dist/", "build/", ".next/", "vendor/", ".git/"];

const MAX_FILE_SIZE = 200_000; // ~200kb

export async function getRepoTree(owner: string, repo: string, branch: string): Promise<RepoFile[]> {
  const octokit = await getOctokit();
  const { data } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: branch,
    recursive: "true",
  });

  return (data.tree ?? [])
    .filter((item) => item.type === "blob" && item.path && item.sha)
    .map((item) => ({ path: item.path!, size: item.size ?? 0, sha: item.sha! }))
    .filter((f) => !IGNORED_DIRS.some((dir) => f.path.startsWith(dir) || f.path.includes(`/${dir}`)))
    .filter((f) => f.size > 0 && f.size <= MAX_FILE_SIZE)
    .filter((f) => TEXT_EXTENSIONS.some((ext) => f.path.toLowerCase().endsWith(ext)));
}

export async function getBlobContent(owner: string, repo: string, sha: string): Promise<string | null> {
  const octokit = await getOctokit();
  try {
    const { data } = await octokit.git.getBlob({ owner, repo, file_sha: sha });
    if (data.encoding !== "base64") return null;
    return Buffer.from(data.content, "base64").toString("utf-8");
  } catch {
    return null;
  }
}

export async function getFileContent(owner: string, repo: string, path: string): Promise<string | null> {
  const octokit = await getOctokit();
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path });
    if (Array.isArray(data) || data.type !== "file" || !("content" in data)) return null;
    return Buffer.from(data.content, "base64").toString("utf-8");
  } catch {
    return null;
  }
}
