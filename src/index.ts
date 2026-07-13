import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  Interaction,
  userMention,
  Guild,
  TextChannel,
  ChannelType,
  SendableChannels,
  AnyThreadChannel,
  ChatInputCommandInteraction,
  CacheType,
} from "discord.js";
import { Counting } from "./actions/counting.js";
import { setQuest } from "./db/prisma.js";
import { Lottery } from "./actions/lottery.js";
import { Leveling } from "./actions/leveling.js";
import { configDotenv } from "dotenv";
import { Flame } from "./actions/flame.js";
import { GlobalFonts } from "@napi-rs/canvas";
import { Twitch } from "./actions/twitch.js";
import { StreamerBot } from "./actions/streamerbot.js";
import { Logger } from "./actions/logger.js";
import { help_embeds } from "./utils/constants.js";
import { commands_details, commands } from "./utils/commands.js";
import { Flag } from "./actions/flag.js";
import { Welcome } from "./actions/welcome.js";
import {
  messageAttatchments,
  rewardBoosters,
  updateNumOfMembers,
} from "./utils/helpers.js";
import { Socials } from "./actions/socials.js";

GlobalFonts.registerFromPath("./assets/fonts/Inter.ttf", "Inter");

configDotenv();

const TOKEN = process.env.TOKEN!;
const CLIENT_ID = process.env.CLIENT_ID!;
const TEST_GUILD_ID = "1455614953548681301"; // Test server
const RANNI_GUILD_ID = "1236751656331509967"; // Ranni server

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

const guilds = [TEST_GUILD_ID, RANNI_GUILD_ID];

const rest = new REST({ version: "10" }).setToken(TOKEN);

const isGuildValid = (guild: Guild) => {
  return guilds.includes(guild.id);
};

(async () => {
  try {
    console.log("Registering slash command...");

    for (const guild of guilds)
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guild), {
        body: commands,
      });

    console.log("Slash command registered.");
  } catch (error) {
    console.error(error);
  }
})();

export const ranni_guild: { id: string } & Partial<{
  emojis: { gem: { message: string; embed: string } };
  channels: {
    num_of_members: TextChannel;
    welcome: TextChannel;
    music: TextChannel;
    twitch: SendableChannels;
    clips: SendableChannels;
    yt: SendableChannels;
    tiktok: SendableChannels;
  };
  members: Guild["members"];
  activities: {
    counting: Counting;
    lottery: Lottery;
  };
}> = {
  id: RANNI_GUILD_ID,
};

client.once("clientReady", async () => {
  if (process.env.IS_PRODUCTION === "true") new Logger();

  const guild = await client.guilds.fetch(RANNI_GUILD_ID);

  if (!guild) return;

  await guild.channels.fetch();
  await guild.members.fetch();

  ranni_guild.emojis = {
    gem: { message: "💎", embed: "💎" },
  };

  {
    const gem_emoji = guild.emojis?.cache?.get("1464281133813596254");

    if (gem_emoji && gem_emoji.available)
      ranni_guild.emojis.gem = {
        message: `:${gem_emoji.name}:`,
        embed: `<:${gem_emoji.name}:${gem_emoji.id}>`,
      };
  }

  ranni_guild.channels = {
    num_of_members: guild.channels.cache.get(
      "1311508100733472778",
    ) as TextChannel,
    welcome: guild.channels.cache.get("1387493763332571288") as TextChannel,
    music: guild.channels.cache.get("1446229960741228647") as TextChannel,
    twitch: guild.channels.cache.get("1311121693133246535") as SendableChannels,
    clips: guild.channels.cache.get("1387333680141439046") as SendableChannels,
    yt: guild.channels.cache.get("1471080811393716408") as SendableChannels,
    tiktok: guild.channels.cache.get("1310742192469573712") as SendableChannels,
  };

  ranni_guild.members = guild.members;

  rewardBoosters();

  new Twitch();
  new Welcome();

  ranni_guild.activities = {
    counting: new Counting(),
    lottery: new Lottery(),
  };

  console.log("All set!");
});

client.on("guildCreate", async (guild) => {
  if (isGuildValid(guild)) return;

  await guild.leave();
});

client.on("guildMemberAdd", async (member) => {
  await updateNumOfMembers(member.guild.id, 1);
});

client.on("guildMemberRemove", async (member) => {
  await updateNumOfMembers(member.guild.id, -1);
});

client.on("interactionCreate", async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    await commands_details[
      interaction.commandName as keyof typeof commands_details
    ].onTrigger(interaction);
  } catch (e: any) {
    let data: any;

    try {
      data = JSON.parse(e.message);
    } catch {
      console.log(e);
      data =
        "Something went wrong please notify stupid <@609097048662343700> for his poor coding skills";
    }

    if (interaction.replied) await interaction.editReply(data);
    else await interaction.reply(data);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  switch (interaction.channelId) {
    case "1476252282134986814": {
      await Flame.handleOpenModal(interaction);

      break;
    }

    default: {
      if (interaction.customId.startsWith("help-embed")) {
        await interaction.deferUpdate();

        await interaction.message.edit({
          embeds: [
            help_embeds.at(parseInt(interaction.customId.split("-").at(-1)!))!,
          ],
        });
      } else if (interaction.customId.startsWith("net-worth")) {
        await interaction.deferUpdate();

        const id = interaction.customId.split("-").at(-1)!;

        if (!ranni_guild.members) return;

        await interaction.message.edit(
          await commands_details["net-worth"].getMessage(
            ranni_guild.members.cache.get(id)?.user ??
              (await ranni_guild.members.fetch(id)).user,
          ),
        );
      }
    }
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isModalSubmit()) return;

  switch (interaction.customId) {
    case "flames": {
      Flame.handleFlameSubmit(interaction);
      break;
    }

    default: {
      if (interaction.customId.startsWith("flag"))
        Flag.handleFlagSubmit(interaction);

      break;
    }
  }
});

client.on("messageCreate", async (message) => {
  try {
    const { has_link, has_video, has_img } = messageAttatchments(message);

    const count = (str: string, char: string) => str.split(char).length - 1;

    switch (message.channelId) {
      case Lottery.ANNOUNCEMENTS_CHANNEL_ID:
        // await lottery.handleMessage(message);

        break;

      case Counting.COUNTING_CHANNEL_ID:
        await ranni_guild.activities?.counting.handleMessage(message);

        break;

      case Leveling.CHANNEL_ID:
        if (message.author.id != Leveling.BOT_ID) return;

        await Leveling.handleMessage(message);

        break;

      // quote
      case "1387347858835116042":
        const num_of_single_quotes = count(message.content, "'");
        const num_of_double_quotes = count(message.content, '"');

        if (
          !(
            (num_of_single_quotes > 0 && num_of_single_quotes % 2 == 0) ||
            (num_of_double_quotes > 0 && num_of_double_quotes % 2 == 0)
          )
        )
          break;

        await setQuest(message.author.id, { quote: 1 });

        break;

      // highlight
      case "1311104580628647939":
        if (!has_video && !has_link) break;

        await setQuest(message.author.id, { highlight: 1 });

        break;

      // cringe name
      case "1388117861658267718":
        if (!has_img) return;

        await setQuest(message.author.id, { cringe_name: 1 });

        break;

      // song
      case "1446229960741228647":
        if (!has_link) break;

        await setQuest(message.author.id, { song: 1 });

        break;

      // meme
      case "1310737786843824278":
        if (!has_img && !has_video && !has_link) break;

        await setQuest(message.author.id, { meme: 1 });

        break;

      default:
        Socials.handleUpload(message);

        break;
    }
  } catch (e: any) {
    await message.reply(JSON.parse(e.message));
  }
});

client.on("messageCreate", async (message) => {
  if (!(message.content == "!flame" || message.content == "!flaming")) return;

  if (!message.reference) return;

  const replied_to = message.channel.messages.cache.get(
    message.reference.messageId ?? "",
  );

  if (!replied_to) return;

  const attatchments = Array.from(replied_to.attachments.values());

  await Flame.sendFlameRequest(
    userMention(replied_to.author.id),
    attatchments.length ? attatchments : replied_to.content,
  );
});

client.on("messageDelete", async (message) => {
  switch (message.channelId) {
    case Counting.COUNTING_CHANNEL_ID:
      await ranni_guild.activities?.counting.onMessageDelete(message);

      break;
  }
});

client.on("guildMemberAdd", async (member) => {
  await Welcome.handleNewMember(member);
});

const handleQuestInThread = async (thread: AnyThreadChannel) => {
  switch (thread.parent?.id) {
    case "1310978386688086117":
      await setQuest(thread.ownerId, {
        pet: 1,
      });

      break;

    // food
    case "1393169480984825896":
      await setQuest(thread.ownerId, {
        meal: 1,
      });

      break;

    // art
    case "1310740233117106306":
      await setQuest(thread.ownerId, {
        art: 1,
      });

      break;
  }
};

client.on("threadCreate", async (thread) => {
  if (thread.parent?.type !== ChannelType.GuildForum) return;

  try {
    const starter_msg = await thread.fetchStarterMessage();

    if (!starter_msg) return;

    const { has_img, has_video } = messageAttatchments(starter_msg);

    if (!has_img && !has_video) return;

    await handleQuestInThread(thread);
  } catch (error) {
    console.log(
      `Failed to fetch starter message on thread ${thread.name}:`,
      error,
    );
  }

  await handleQuestInThread(thread);
});

client.on("messageCreate", async (message) => {
  if (!message.channel.isThread()) return;

  if (message.author.id !== message.channel.ownerId) return;

  const { has_video, has_img } = messageAttatchments(message);

  if (!has_video && !has_img) return;

  await handleQuestInThread(message.channel);
});

client.login(TOKEN);

if (process.env.IS_PRODUCTION) new StreamerBot();
