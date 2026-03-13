import type { ChatInputCommandInteraction, Client } from "discord.js";
import { ChannelType } from "discord.js";
import { joinVc } from "../voice/joinVoice";

export async function handleJoin(interaction: ChatInputCommandInteraction, client: Client): Promise<void> {
  const channel = interaction.member && "voice" in interaction.member ? interaction.member.voice.channel : null;

  if (!channel || channel.type !== ChannelType.GuildVoice) {
    await interaction.editReply("先に自分が通常のVCへ入ってください。");
    return;
  }

  await joinVc(channel);
  await interaction.editReply(`VCへ接続しました: ${channel.name}`);
}