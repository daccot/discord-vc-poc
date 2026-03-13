import fs from "node:fs";
import path from "node:path";
import prism from "prism-media";
import { EndBehaviorType, type VoiceConnection } from "@discordjs/voice";
import type { SessionManager } from "./sessionManager";

type ActiveSubscription = {
  opusStream: NodeJS.ReadableStream;
  decoder: prism.opus.Decoder;
};

type UserTrackInfo = {
  userId: string;
  wavPath: string;
  writeStream: fs.WriteStream;
  pcmBytesWritten: number;
  active: boolean;
  subscription?: ActiveSubscription;
};

export class MixedRecorder {
  private mixedFilePath: string | null = null;
  private mixedWriteStream: fs.WriteStream | null = null;
  private isRecording = false;
  private connection: VoiceConnection | null = null;
  private userTracks = new Map<string, UserTrackInfo>();
  private speakingHandlerBound: ((userId: string) => void) | null = null;

  constructor(private readonly sessionManager: SessionManager) {}

  public start(connection: VoiceConnection): string {
    const sessionDir = this.sessionManager.getCurrentSessionDir();
    if (!sessionDir) {
      throw new Error("No current session dir.");
    }

    this.connection = connection;

    // mixed.wav はまだ placeholder のまま
    this.mixedFilePath = path.join(sessionDir, "raw", "mixed.wav");
    this.mixedWriteStream = fs.createWriteStream(this.mixedFilePath, { flags: "w" });
    this.writeWaveHeaderPlaceholder(this.mixedWriteStream);

    this.isRecording = true;

    const receiver = connection.receiver;

    this.speakingHandlerBound = (userId: string) => {
      if (!this.isRecording) return;

      let track = this.userTracks.get(userId);
      if (!track) {
        const wavPath = path.join(sessionDir, "raw", `debug-user-${userId}.wav`);
        const writeStream = fs.createWriteStream(wavPath, { flags: "w" });

        this.writeWaveHeaderPlaceholder(writeStream);

        track = {
          userId,
          wavPath,
          writeStream,
          pcmBytesWritten: 0,
          active: false,
        };

        this.userTracks.set(userId, track);
      }

      if (track.active) {
        return;
      }

      console.log(`[MixedRecorder] subscribing + decoding for user=${userId} -> ${track.wavPath}`);

      const opusStream = receiver.subscribe(userId, {
        end: {
          behavior: EndBehaviorType.AfterSilence,
          duration: 3000,
        },
      });

      const decoder = new prism.opus.Decoder({
        frameSize: 960,
        channels: 1,
        rate: 48000,
      });

      track.active = true;
      track.subscription = { opusStream, decoder };

      opusStream.pipe(decoder);

      decoder.on("data", (chunk: Buffer) => {
        track!.writeStream.write(chunk);
        track!.pcmBytesWritten += chunk.length;
      });

      const cleanup = () => {
        this.cleanupUserSubscription(userId);
      };

      opusStream.on("end", cleanup);
      opusStream.on("close", cleanup);
      opusStream.on("error", (err) => {
        console.error(`[MixedRecorder] opus stream error for user=${userId}`, err);
        cleanup();
      });

      decoder.on("end", cleanup);
      decoder.on("close", cleanup);
      decoder.on("error", (err) => {
        console.error(`[MixedRecorder] decoder error for user=${userId}`, err);
        cleanup();
      });
    };

    receiver.speaking.on("start", this.speakingHandlerBound);

    console.log(`[MixedRecorder] started receiver decode recording -> ${this.mixedFilePath}`);
    return this.mixedFilePath;
  }

  public stop(): string | null {
    if (!this.isRecording) {
      return null;
    }

    this.isRecording = false;

    if (this.connection && this.speakingHandlerBound) {
      this.connection.receiver.speaking.off("start", this.speakingHandlerBound);
    }

    for (const userId of [...this.userTracks.keys()]) {
      this.cleanupUserSubscription(userId);
    }

    for (const [, track] of this.userTracks) {
      try {
        track.writeStream.end();
      } catch {
        // noop
      }
      this.finalizeWaveHeader(track.wavPath, track.pcmBytesWritten);
      console.log(`[MixedRecorder] finalized user wav -> ${track.wavPath} (${track.pcmBytesWritten} bytes PCM)`);
    }

    this.userTracks.clear();

    if (this.mixedWriteStream && this.mixedFilePath) {
      this.finalizeWaveHeader(this.mixedFilePath, 0);
      this.mixedWriteStream.end();
    }

    const result = this.mixedFilePath;

    this.connection = null;
    this.speakingHandlerBound = null;
    this.mixedWriteStream = null;
    this.mixedFilePath = null;

    console.log(`[MixedRecorder] stopped receiver decode recording -> ${result}`);
    return result;
  }

  private cleanupUserSubscription(userId: string): void {
    const track = this.userTracks.get(userId);
    if (!track || !track.active) return;

    track.active = false;

    try {
      track.subscription?.opusStream.unpipe(track.subscription.decoder);
    } catch {
      // noop
    }

    try {
      track.subscription?.decoder.removeAllListeners();
      track.subscription?.opusStream.removeAllListeners();
    } catch {
      // noop
    }

    track.subscription = undefined;

    console.log(`[MixedRecorder] stream ended for user=${userId}`);
  }

  private writeWaveHeaderPlaceholder(stream: fs.WriteStream): void {
    const header = Buffer.alloc(44);
    header.write("RIFF", 0);
    header.writeUInt32LE(36, 4);
    header.write("WAVE", 8);
    header.write("fmt ", 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);      // PCM
    header.writeUInt16LE(1, 22);      // mono
    header.writeUInt32LE(48000, 24);  // sample rate
    header.writeUInt32LE(48000 * 2, 28); // byte rate
    header.writeUInt16LE(2, 32);      // block align
    header.writeUInt16LE(16, 34);     // bits per sample
    header.write("data", 36);
    header.writeUInt32LE(0, 40);
    stream.write(header);
  }

  private finalizeWaveHeader(filePath: string, pcmBytesWritten: number): void {
    const fd = fs.openSync(filePath, "r+");
    try {
      const riffSize = 36 + pcmBytesWritten;

      const riffBuf = Buffer.alloc(4);
      riffBuf.writeUInt32LE(riffSize, 0);
      fs.writeSync(fd, riffBuf, 0, 4, 4);

      const dataBuf = Buffer.alloc(4);
      dataBuf.writeUInt32LE(pcmBytesWritten, 0);
      fs.writeSync(fd, dataBuf, 0, 4, 40);
    } finally {
      fs.closeSync(fd);
    }
  }
}