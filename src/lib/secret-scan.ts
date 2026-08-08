export type SecretMatch = {
  title: string;
  severity: "critical" | "high" | "medium";
  line: number;
  snippet: string;
};

type Pattern = {
  title: string;
  severity: SecretMatch["severity"];
  regex: RegExp;
};

// Padrões de exemplo cobrindo os provedores mais comuns.
// Não é exaustivo (esse é o trabalho de ferramentas como gitleaks/trufflehog),
// mas cobre os casos mais frequentes de segredo commitado por engano.
const PATTERNS: Pattern[] = [
  { title: "AWS Access Key ID", severity: "critical", regex: /AKIA[0-9A-Z]{16}/g },
  { title: "AWS Secret Access Key", severity: "critical", regex: /aws(.{0,20})?['"][0-9a-zA-Z/+]{40}['"]/gi },
  { title: "GitHub Personal Access Token", severity: "critical", regex: /gh[pousr]_[A-Za-z0-9]{36,}/g },
  { title: "GitHub OAuth Token", severity: "critical", regex: /gho_[A-Za-z0-9]{36,}/g },
  { title: "Slack Token", severity: "high", regex: /xox[baprs]-[A-Za-z0-9-]{10,}/g },
  { title: "Stripe API Key", severity: "critical", regex: /sk_(live|test)_[0-9a-zA-Z]{16,}/g },
  { title: "Google API Key", severity: "high", regex: /AIza[0-9A-Za-z\-_]{35}/g },
  { title: "Private Key Block", severity: "critical", regex: /-----BEGIN (RSA|EC|OPENSSH|PGP|DSA)? ?PRIVATE KEY-----/g },
  { title: "Generic Bearer Token", severity: "medium", regex: /bearer\s+[A-Za-z0-9\-._~+/]{20,}=*/gi },
  {
    title: "Hardcoded password/secret assignment",
    severity: "medium",
    regex: /(password|passwd|secret|api[_-]?key)\s*[:=]\s*['"][^'"\s]{8,}['"]/gi,
  },
  { title: "JWT Token", severity: "medium", regex: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
];

const ALLOWLIST_HINTS = [
  "example", "sample", "test-key", "your_", "changeme", "xxxxxxxx", "placeholder",
];

export function scanContentForSecrets(content: string): SecretMatch[] {
  const matches: SecretMatch[] = [];
  const lines = content.split("\n");

  lines.forEach((lineText, idx) => {
    const lower = lineText.toLowerCase();
    if (ALLOWLIST_HINTS.some((hint) => lower.includes(hint))) return;

    for (const pattern of PATTERNS) {
      pattern.regex.lastIndex = 0;
      const match = pattern.regex.exec(lineText);
      if (match) {
        matches.push({
          title: pattern.title,
          severity: pattern.severity,
          line: idx + 1,
          snippet: redact(lineText.trim()),
        });
      }
    }
  });

  return matches;
}

function redact(line: string): string {
  if (line.length <= 60) return maskMiddle(line);
  return maskMiddle(line.slice(0, 60)) + "...";
}

function maskMiddle(s: string): string {
  return s.replace(/[A-Za-z0-9/+_-]{8,}/g, (token) => {
    if (token.length <= 8) return token;
    return token.slice(0, 4) + "…redacted…" + token.slice(-4);
  });
}
