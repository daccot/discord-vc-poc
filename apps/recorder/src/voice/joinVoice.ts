import {
  AudioPlayerStatus,
  VoiceConnectionStatus,
  createAudioPlayer,
  entersState,
  joinVoiceChannel,
  type VoiceConnection,
} from "@discordjs/voice";
import type { VoiceBasedChannel } from "discord.js";

export interface VoiceJoinResult {
  connection: VoiceConnection;
}

export async function joinVc(channel: VoiceBasedChannel): Promise<VoiceJoinResult> {
  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator as any,
    selfDeaf: false,
    selfMute: true
  });

  console.log("[voice] join requested", {
    guildId: channel.guild.id,
    channelId: channel.id,
    channelName: channel.name
  });

  connection.on("stateChange", (oldState, newState) => {
    console.log(`[voice] state ${oldState.status} -> ${newState.status}`);
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
  } catch (err) {
    console.error("[voice] failed to reach Ready state within timeout");
    try {
      connection.destroy();
    } catch {
      // noop
    }
    throw new Error("VC接続がReadyになりませんでした。権限不足・VC種別・DAVE未対応の可能性があります。");
  }

  const player = createAudioPlayer();
  player.on(AudioPlayerStatus.Idle, () => {
    // noop
  });

  connection.subscribe(player);

  console.log("[voice] connection ready");
  return { connection };
}

export async function leaveVc(connection: VoiceConnection): Promise<void> {
  connection.destroy();
}