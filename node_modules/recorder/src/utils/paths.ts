import fs from "node:fs";
import path from "node:path";

export const projectRoot = path.resolve(process.cwd(), "../../");
export const storageRoot = path.join(projectRoot, "storage", "sessions");

export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function dateFolder(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}