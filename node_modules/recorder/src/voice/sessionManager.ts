import fs from "node:fs";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import { ensureDir, storageRoot, dateFolder } from "../utils/paths";

export type SessionStatus = "idle" | "recording" | "stopped";

export interface SessionMeta {
  session_id: string;
  guild_id: string;
  channel_id: string;
  started_at: string;
  ended_at: string | null;
  status: SessionStatus;
  mode: "mixed";
}

export interface ParticipantMeta {
  user_id: string;
  display_name: string;
  joined_at: string;
  left_at: string | null;
}

export class SessionManager {
  private currentSession: SessionMeta | null = null;
  private currentSessionDir: string | null = null;
  private participants: ParticipantMeta[] = [];

  public startSession(guildId: string, channelId: string): { session: SessionMeta; sessionDir: string } {
    if (this.currentSession?.status === "recording") {
      throw new Error("Session is already recording.");
    }

    const now = new Date();
    const sessionId = `sess_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}_${uuidv4().slice(0, 8)}`;
    const sessionDir = path.join(storageRoot, dateFolder(now), sessionId);
    ensureDir(path.join(sessionDir, "raw"));
    ensureDir(path.join(sessionDir, "meta"));

    const session: SessionMeta = {
      session_id: sessionId,
      guild_id: guildId,
      channel_id: channelId,
      started_at: now.toISOString(),
      ended_at: null,
      status: "recording",
      mode: "mixed"
    };

    this.currentSession = session;
    this.currentSessionDir = sessionDir;
    this.participants = [];

    this.writeJson(path.join(sessionDir, "meta", "session.json"), session);
    this.writeJson(path.join(sessionDir, "meta", "participants.json"), this.participants);

    return { session, sessionDir };
  }

  public stopSession(): { session: SessionMeta; sessionDir: string } {
    if (!this.currentSession || !this.currentSessionDir) {
      throw new Error("No active session.");
    }

    this.currentSession.ended_at = new Date().toISOString();
    this.currentSession.status = "stopped";

    this.writeJson(path.join(this.currentSessionDir, "meta", "session.json"), this.currentSession);
    this.writeJson(path.join(this.currentSessionDir, "meta", "participants.json"), this.participants);

    const result = {
      session: this.currentSession,
      sessionDir: this.currentSessionDir
    };

    this.currentSession = null;
    this.currentSessionDir = null;
    this.participants = [];

    return result;
  }

  public addOrUpdateParticipant(userId: string, displayName: string): void {
    if (!this.currentSessionDir) return;

    const existing = this.participants.find(p => p.user_id === userId && p.left_at === null);
    if (existing) {
      existing.display_name = displayName;
    } else {
      this.participants.push({
        user_id: userId,
        display_name: displayName,
        joined_at: new Date().toISOString(),
        left_at: null
      });
    }

    this.writeJson(path.join(this.currentSessionDir, "meta", "participants.json"), this.participants);
  }

  public markParticipantLeft(userId: string): void {
    if (!this.currentSessionDir) return;

    const existing = this.participants.find(p => p.user_id === userId && p.left_at === null);
    if (existing) {
      existing.left_at = new Date().toISOString();
      this.writeJson(path.join(this.currentSessionDir, "meta", "participants.json"), this.participants);
    }
  }

  public getCurrentSession(): SessionMeta | null {
    return this.currentSession;
  }

  public getCurrentSessionDir(): string | null {
    return this.currentSessionDir;
  }

  private writeJson(filePath: string, value: unknown): void {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), { encoding: "utf8" });
  }
}