import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

function parseEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {};
  const out: Record<string, string> = {};
  for (const rawLine of readFileSync(filePath, "utf-8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const idx = line.indexOf("=");
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    value = value.replace(/^['"]|['"]$/g, "");
    out[key] = value;
  }
  return out;
}

// 專案根目錄（widget/ 的上一層），與 backend/ 平行。
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

export function resolveApiKey(): string {
  const rootEnv = parseEnvFile(path.join(PROJECT_ROOT, ".env"));
  return (rootEnv.API_KEY ?? "").trim();
}

export const BACKEND_BASE_URL = "http://127.0.0.1:8000";
