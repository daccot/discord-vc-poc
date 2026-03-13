import path from "node:path";
import dotenv from "dotenv";

const rootEnv = path.resolve(process.cwd(), "../../.env");
dotenv.config({ path: rootEnv });

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}