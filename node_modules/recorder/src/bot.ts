import "dotenv/config";
import * as Discord from "discord.js";

import { requireEnv } from "./utils/env";
import { SessionManager } from "./voice/sessionManager";
import { MixedRecorder } from "./voice/recorder";
import { handleJoin } from "./commands/join";
import { handleLeave } from "./commands/leave";
import { handleStartRecording } from "./commands/startRecording";
import { handleStopRecording } from "./commands/stopRecording";

const token = requireEnv("DISCORD_TOKEN");
const clientId = requireEnv("DISCORD_CLIENT_ID");
const guildId = process.env.DEFAULT_GUILD_ID;

console.log("[debug] discord.js top-level keys sample =", Object.keys(Discord).slice(0, 30));
console.log("[debug] discord.js version =", (Discord as any).version);
console.log("[debug] discord.js GatewayIntentBits =", (Discord as any).GatewayIntentBits);

const Client = (Discord as any).Client;
const GatewayIntentBits = (Discord as any).GatewayIntentBits;
const REST = (Discord as any).REST;
const Routes = (Discord as any).Routes;
const SlashCommandBuilder = (Discord as any).SlashCommandBuilder;
const MessageFlags = (Discord as any).MessageFlags;

if (!GatewayIntentBits) {
  throw new Error("discord.js から GatewayIntentBits を取得できません。export 解決が壊れています。");
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const sessionManager = new SessionManager();
const recorder = new MixedRecorder(sessionManager);

async function registerCommands(): Promise<void> {
  const commands = [
    new SlashCommandBuilder().setName("join").setDescription("Join your current voice channel"),
    new SlashCommandBuilder().setName("leave").setDescription("Leave current voice channel"),
    new SlashCommandBuilder().setName("start_recording").setDescription("Start mixed recording session"),
    new SlashCommandBuilder().setName("stop_recording").setDescription("Stop mixed recording session"),
  ].map((c: any) => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(token);

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log("[bot] guild slash commands registered");
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log("[bot] global slash commands registered");
  }
}

client.once("clientReady", async () => {
  console.log(`[bot] logged in as ${client.user?.tag}`);
  await registerCommands();
});

client.on("voiceStateUpdate", (_: any, newState: any) => {
  if (!sessionManager.getCurrentSession()) return;

  const member = newState.member;
  if (!member) return;

  if (newState.channelId) {
    sessionManager.addOrUpdateParticipant(member.id, member.displayName);
  } else {
    sessionManager.markParticipantLeft(member.id);
  }
});

client.on("interactionCreate", async (interaction: any) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    switch (interaction.commandName) {
      case "join":
        await handleJoin(interaction, client);
        break;
      case "leave":
        await handleLeave(interaction);
        break;
      case "start_recording":
        await handleStartRecording(interaction, sessionManager, recorder);
        break;
      case "stop_recording":
        await handleStopRecording(interaction, sessionManager, recorder);
        break;
      default:
        await interaction.editReply("Unknown command");
        break;
    }
  } catch (error) {
    console.error("[bot] interaction error:", error);

    const message = `Error: ${(error as Error).message}`;

    if (interaction.deferred || interaction.replied) {
      try {
        await interaction.editReply(message);
      } catch (e) {
        console.error("[bot] editReply failed:", e);
      }
    }
  }
});

client.login(token).catch((err: any) => {
  console.error("[bot] login failed:", err);
  process.exit(1);
});