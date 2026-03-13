import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

console.log("[worker] scaffold only");
console.log("[worker] STEP3時点では transcribe 未実装");
console.log("[worker] 今後ここへ OpenAI transcription 処理を追加");

const sessionsRoot = path.resolve(process.cwd(), "../../storage/sessions");
if (fs.existsSync(sessionsRoot)) {
  console.log(`[worker] sessions root: ${sessionsRoot}`);
}