import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";
import express from "express";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

const app = express();
const port = Number(process.env.APP_PORT || 3100);
const sessionsRoot = path.resolve(process.cwd(), "../../storage/sessions");

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/sessions", (_req, res) => {
  if (!fs.existsSync(sessionsRoot)) {
    res.json([]);
    return;
  }

  const days = fs.readdirSync(sessionsRoot, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  const sessions: Array<{ date: string; sessionId: string }> = [];

  for (const day of days) {
    const dayDir = path.join(sessionsRoot, day);
    for (const entry of fs.readdirSync(dayDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        sessions.push({ date: day, sessionId: entry.name });
      }
    }
  }

  res.json(sessions);
});

app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
});