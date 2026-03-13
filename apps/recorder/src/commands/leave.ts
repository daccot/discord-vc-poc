import type { ChatInputCommandInteraction } from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";

export async function handleLeave(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.editReply("guildId が取得できません。");
    return;
  }

  const connection = getVoiceConnection(guildId);
  if (!connection) {
    await interaction.editReply("現在VC接続はありません。");
    return;
  }

  connection.destroy();
  await interaction.editReply("VCから切断しました。");
}