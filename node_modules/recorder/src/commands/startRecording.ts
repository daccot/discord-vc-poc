import type { ChatInputCommandInteraction } from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";
import type { SessionManager } from "../voice/sessionManager";
import type { MixedRecorder } from "../voice/recorder";

export async function handleStartRecording(
  interaction: ChatInputCommandInteraction,
  sessionManager: SessionManager,
  recorder: MixedRecorder
): Promise<void> {
  const guildId = interaction.guildId;
  const memberVoiceChannel =
    interaction.member && "voice" in interaction.member
      ? interaction.member.voice.channel
      : null;

  if (!guildId || !memberVoiceChannel) {
    await interaction.editReply("先にVCへ入り、サーバー内で実行してください。");
    return;
  }

  const connection = getVoiceConnection(guildId);
  if (!connection) {
    await interaction.editReply("先に /join でVCへ接続してください。");
    return;
  }

  const started = sessionManager.startSession(guildId, memberVoiceChannel.id);
  const filePath = recorder.start(connection);

  await interaction.editReply(
    [
      `録音セッション開始: ${started.session.session_id}`,
      `sessionDir: ${started.sessionDir}`,
      `mixedFile: ${filePath}`
    ].join("\n")
  );
}