import { describe, expect, it } from "vitest";
import { scanContentForSecrets } from "./secret-scan";

describe("scanContentForSecrets", () => {
  it("detects an AWS access key id", () => {
    const content = `const key = "AKIAJSUN4QWERTYUIOP1";`;
    const matches = scanContentForSecrets(content);
    expect(matches.some((m) => m.title === "AWS Access Key ID")).toBe(true);
  });

  it("detects a GitHub personal access token", () => {
    const content = `TOKEN=ghp_abcdefghijklmnopqrstuvwxyz0123456789`;
    const matches = scanContentForSecrets(content);
    expect(matches.some((m) => m.title === "GitHub Personal Access Token")).toBe(true);
  });

  it("detects a private key block", () => {
    const content = "-----BEGIN RSA PRIVATE KEY-----\nMIIBOgIBAAJBAK...\n-----END RSA PRIVATE KEY-----";
    const matches = scanContentForSecrets(content);
    expect(matches.some((m) => m.title === "Private Key Block")).toBe(true);
  });

  it("reports the correct line number", () => {
    const content = ["line one", "line two", 'const secret = "hardcoded_password_value123"'].join("\n");
    const matches = scanContentForSecrets(content);
    const hit = matches.find((m) => m.title.includes("password"));
    expect(hit?.line).toBe(3);
  });

  it("ignores lines that look like placeholders", () => {
    const content = `const key = "AKIAEXAMPLE00000000"; // example, not a real key`;
    const matches = scanContentForSecrets(content);
    expect(matches).toHaveLength(0);
  });

  it("redacts the secret value in the snippet", () => {
    const content = `TOKEN=ghp_abcdefghijklmnopqrstuvwxyz0123456789`;
    const matches = scanContentForSecrets(content);
    expect(matches[0].snippet).not.toContain("ghp_abcdefghijklmnopqrstuvwxyz0123456789");
    expect(matches[0].snippet).toContain("redacted");
  });

  it("returns no matches for clean content", () => {
    const content = `function add(a: number, b: number) {\n  return a + b;\n}`;
    expect(scanContentForSecrets(content)).toHaveLength(0);
  });
});
