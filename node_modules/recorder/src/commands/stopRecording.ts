import type { ChatInputCommandInteraction } from "discord.js";
import type { SessionManager } from "../voice/sessionManager";
import type { MixedRecorder } from "../voice/recorder";

export async function handleStopRecording(
  interaction: ChatInputCommandInteraction,
  sessionManager: SessionManager,
  recorder: MixedRecorder
): Promise<void> {
  const filePath = recorder.stop();
  const stopped = sessionManager.stopSession();

  await interaction.editReply(
    [
      `録音セッション停止: ${stopped.session.session_id}`,
      `sessionDir: ${stopped.sessionDir}`,
      `mixedFile: ${filePath ?? "(not created)"}`
    ].join("\n")
  );
}