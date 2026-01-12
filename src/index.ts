import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  Interaction,
  userMention,
  Guild,
} from "discord.js";
import { Counting } from "./actions/counting.js";
import { Duel } from "./actions/duel.js";
import { getTop5Richest, getUserCoins } from "./db/prisma.js";
import { Gamble } from "./actions/gamble.js";
import { Lottery } from "./actions/lottery.js";
import { CustomEmbed } from "./utils/embed.js";
import { Leveling } from "./actions/leveling.js";
import { configDotenv } from "dotenv";

configDotenv();

const TOKEN = process.env.TOKEN!;
const CLIENT_ID = process.env.CLIENT_ID!;
const TEST_GUILD_ID = "1455614953548681301"; // Test server
const RANNI_GUILD_ID = "1236751656331509967"; // Ranni server

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const commands = [
  new SlashCommandBuilder()
    .setName("kraa")
    .setDescription("Replies with help for dummies"),

  new SlashCommandBuilder()
    .setName("counting-details")
    .setDescription("Replies with the current count and the highest record"),

  new SlashCommandBuilder()
    .setName("net-worth")
    .setDescription(
      "Get someone's net worth (if not mentioned, it's your net worth)"
    )
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("mention the person u wanna check")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("duel")
    .setDescription("Invite someone to a rock paper scissors, with a bet.")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("mention the person u wanna SMASH")
        .setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName("bet")
        .setDescription("min 1 coin")
        .setRequired(true)
        .setMinValue(1)
    ),

  new SlashCommandBuilder()
    .setName("gamble")
    .setDescription("We love gambling dont we")
    .addNumberOption((option) =>
      option
        .setName("bet")
        .setDescription("min 1 coin")
        .setRequired(true)
        .setMinValue(1)
    ),

  new SlashCommandBuilder()
    .setName("superiors")
    .setDescription("Top 5 richest users on the server"),

  new SlashCommandBuilder()
    .setName("trap")
    .setDescription("Trap the previous number"),

  new SlashCommandBuilder()
    .setName("lottery")
    .setDescription("Join the current lottery")
    .addNumberOption((option) =>
      option
        .setName("answer")
        .setDescription("Your answer to the question")
        .setRequired(true)
    ),
].map((cmd) => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

const isGuildValid = (guild: Guild) => {
  return [TEST_GUILD_ID, RANNI_GUILD_ID].includes(guild.id);
};

(async () => {
  try {
    console.log("Registering slash command...");
    await rest.put(Routes.applicationCommands(CLIENT_ID), {
      body: commands,
    });
    console.log("Slash command registered.");
  } catch (error) {
    console.error(error);
  }
})();

client.once("clientReady", async () => {
  new Counting();
  new Lottery();
  new Leveling();

  console.log("All set!");
});

client.on("guildCreate", async (guild) => {
  if (isGuildValid(guild)) return;

  await guild.leave();
});

client.on("interactionCreate", async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  switch (interaction.commandName) {
    case "kraa":
      await interaction.reply({
        embeds: [
          new CustomEmbed()
            .setColor(0x05b2f7)
            .setTitle("Free Commands 😁")
            .setDescription(
              "Commands that dont need any money (cuz im generous 😇)"
            )
            .setFields([
              {
                name: "/kraa",
                value: "I mean u get the exact same message as rn 🫠",
              },
              {
                name: "/counting-details",
                value:
                  "Sending the current count, the current event (counting events are listed in the Actions). If you are unsure what number should you count next, use this command 🙂",
              },
              // {
              //   name: "/wall-of-shame",
              //   value:
              //     "anything bad u dummies do goes here, including:\n- all the people that destroyed counting sequence ❌\n- number of times goober smashed his head against the toilet 🚽",
              // },
              {
                name: "/net-worth",
                value: "Check how fat ur wallet is 💰",
              },
            ]),
          new CustomEmbed()
            .setColor(0xf1c232)
            .setTitle("Paid Commands 💸")
            .setDescription(
              "Commands that do cost money (ill send u my paypal 😊)"
            )
            .setFields([
              {
                name: "/duel",
                value:
                  "Invite someone to a rock paper scissors. Add a bet so things get a lil spicy 🌶️\n- user - mention the person u wanna SMASH 💥 (costs min 1 coin)",
              },
              {
                name: "/gamble",
                value: `Cmon do i really have to explain myself? Its gambling cmon go do it 🕹️ (costs min 1 coin)`,
              },
              {
                name: "/lottery",
                value: `Join the lottery during every stream and win some ez money 🎱 (costs ${Lottery.COST} coins)`,
              },
              {
                name: "/trap",
                value:
                  "Trap the number in the counting section, with a chance to win some coins 🪤 (costs 10% of the last counted money)",
              },
            ]),

          new CustomEmbed()
            .setColor(0x6c1af0)
            .setTitle("Actions 🛝")
            .setDescription("Kravan actions besides the commands (tecnologia)")
            .setFields([
              {
                name: "Counting 🔢",
                value:
                  "- Whenever u count, u get a coin 🪙\n - If a number is trapped, you can count the next number just normally, or count the trapped number again. If you win, you get 20% of the number to ur pocket. If not, the person who trapped gets 20% and you get public humiliation 😔",
              },
              {
                name: "Reverse 🔙",
                value:
                  "You must count in reverse order (pretty straight forward u a dummy if u did not understand)\n\u200b",
                inline: true,
              },
              {
                name: "7 Boom 💥",
                value:
                  "If the number you want to count has 7 in it or is a multiplier of 7, you MUST write 'boom' and not the actual number\n\u200b",
                inline: true,
              },
              {
                name: "Leveling 🔼",
                value:
                  "Whenever you go up a level, you get 10% of the new level straight to ur pocket 💵",
              },
            ]),

          new CustomEmbed()
            .setColor(0xffffff)
            .setTitle("Creators 🃏")
            .setDescription("(aka created the bot furcefully by ranni)")
            .setFields([
              {
                name: "Coder 💻",
                value: `${userMention(
                  "609097048662343700"
                )} (yes guys no AI was used pls appreciate me 🥹🙏)`,
              },
              {
                name: "Masterminds 🧠",
                value: `${userMention("1260205513795174434")} ${userMention(
                  "609097048662343700"
                )} ${userMention("133282052350017536")}`,
              },
              {
                name: "Contributers ⛏️",
                value: `${userMention("1260205513795174434")} ${userMention(
                  "133282052350017536"
                )} ${userMention("617091659758436516")} ${userMention(
                  "756137226202513449"
                )} (basically gambled too much)`,
              },
            ]),
        ],
      });

      break;

    case "net-worth":
      const user =
        interaction.options.getUser("target", false) ?? interaction.user;

      interaction.reply({
        embeds: [
          new CustomEmbed()
            .setTitle("NET WORTH 💰")
            .setFields([
              {
                name: user.displayName,
                value: `🪙 ${await getUserCoins(user.id)} coins`,
              },
            ])
            .setDescription("Elon Musk dis u?")
            .setColor(0xfc9630)
            .setThumbnail(user.avatarURL()),
        ],
      });

      break;

    case "duel":
      new Duel(interaction);

      break;

    case "gamble":
      new Gamble(interaction);

      break;

    case "superiors":
      await interaction.reply({
        embeds: [
          new CustomEmbed()
            .setTitle("WOW 🤩🤑")
            .setDescription("Give sum for the rest of us mfs")
            .setColor(0x35de35)
            .setImage(
              "https://content.imageresizer.com/images/memes/huell-money-meme-65w66.jpg"
            )
            .setFields(
              (
                await getTop5Richest()
              ).map((user, idx) => ({
                name: `🪙 ${user.coins} coins`,
                value: `-${
                  idx == 0 ? " 🥇" : idx == 1 ? " 🥈" : idx == 2 ? " 🥉" : ""
                } ${userMention(user.id)}`,
                inline: true,
              }))
            )
            .setThumbnail(
              "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExeHNjcTY5c3J1cnVlZ3pxamZ0ZHZvdGFqZ2x4N3N6aHIwdnZrZXpqaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/MFsqcBSoOKPbjtmvWz/giphy.gif"
            ),
        ],
      });

      break;
  }
});

client.login(TOKEN);
